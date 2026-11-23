package com.csstudy.backend.service;

import com.csstudy.backend.repository.MailFailureRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

// 메일 발송 실패가 최근 24시간 동안 기준 건수 이상 쌓이면 Mattermost로 알린다(관리자 메일 탭을 열지 않아도 알 수 있게).
// 같은 알림은 6시간에 한 번만(Redis를 켜면 재시작해도 유지). 받는 주소는 알림에 넣지 않고, 원인 문구 속 메일 주소도 가린다
@Slf4j
@Component
public class MailFailureAlerts {

    static final Duration WINDOW = Duration.ofHours(24);
    static final Duration COOLDOWN = Duration.ofHours(6);
    private static final String KEY = "alert:mail-failures";

    private final MailFailureRepository failures;
    private final MattermostService mattermost;
    private final StringRedisTemplate redis;
    private final String prefix;
    private final int threshold;
    private final boolean enabled;
    private volatile Instant lastAlertAt;

    public MailFailureAlerts(MailFailureRepository failures, MattermostService mattermost,
                             ObjectProvider<StringRedisTemplate> redis,
                             @Value("${app.redis.enabled:false}") boolean redisEnabled,
                             @Value("${app.redis.key-prefix:local:}") String prefix,
                             @Value("${app.alert.mail-failure-threshold:5}") int threshold,
                             @Value("${app.alert.enabled:true}") boolean enabled) {
        this.failures = failures;
        this.mattermost = mattermost;
        this.redis = redisEnabled ? redis.getIfAvailable() : null;
        this.prefix = prefix;
        this.threshold = Math.max(1, threshold);
        this.enabled = enabled;
    }

    @Scheduled(fixedDelayString = "${app.alert.mail-failure-check-ms:600000}", initialDelay = 120000)
    public void scheduled() {
        check();
    }

    /** 기준을 넘었으면 알림을 보내고 true를 돌려준다. */
    public boolean check() {
        if (!enabled || !mattermost.enabled()) return false;
        Instant since = Instant.now().minus(WINDOW);
        long count = failures.countByAtAfter(since);
        if (count < threshold || !claim()) return false;

        String kinds = failures.countByKindSince(since).stream()
                .map(row -> row[0] + " " + row[1] + "건").collect(Collectors.joining(" · "));
        List<Object[]> reasons = failures.topReasonsSince(since, PageRequest.of(0, 3));
        StringBuilder text = new StringBuilder("#### ✉️ 메일 발송 실패: 최근 24시간 ").append(count).append("건 (알림 기준 ").append(threshold).append("건)\n")
                .append("종류별: ").append(kinds.isEmpty() ? "-" : kinds).append("\n\n주요 원인\n");
        for (Object[] row : reasons) text.append("- ").append(mask((String) row[0])).append(" (").append(row[1]).append("건)\n");
        text.append("\n실패한 학습 메일은 같은 날 10시에 한 번 더 보냅니다. 받는 주소와 자세한 기록은 [관리자 페이지 → 메일](")
                .append(mattermost.baseUrl()).append("/admin)에서 확인하세요.");
        boolean sent = mattermost.postNotice(text.toString());
        if (!sent) release();
        return sent;
    }

    // 원인 문구에 섞인 메일 주소를 가린다(SMTP 오류 문구에 받는 주소가 들어가는 경우가 있다)
    static String mask(String reason) {
        return reason == null ? "" : reason.replaceAll("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", "[메일 주소]");
    }

    private boolean claim() {
        if (redis != null) {
            try {
                return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(prefix + KEY, "1", COOLDOWN));
            } catch (RuntimeException e) {
                log.warn("Redis 쿨다운 확인 실패, 메모리로 대신합니다");
            }
        }
        Instant now = Instant.now();
        if (lastAlertAt != null && lastAlertAt.isAfter(now.minus(COOLDOWN))) return false;
        lastAlertAt = now;
        return true;
    }

    private void release() {
        lastAlertAt = null;
        if (redis != null) {
            try { redis.delete(prefix + KEY); } catch (RuntimeException ignored) { /* 다음 확인 때 다시 시도한다 */ }
        }
    }
}
