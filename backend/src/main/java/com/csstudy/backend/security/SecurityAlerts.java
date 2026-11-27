package com.csstudy.backend.security;

import com.csstudy.backend.service.MattermostService;
import com.csstudy.backend.service.alert.LogMasking;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.*;

// 자동 차단이 새로 걸리거나 로그인 · 가입 과다 요청, 질문 대량 조회가 한 IP에서 몰리면 기존 Mattermost 긴급 알림 경로로 요약을 보낸다.
// IP는 앞 두 칸만 남기고 가린다. 같은 IP · 사유는 기본 1시간에 한 번만(Redis를 켜면 재시작해도 유지, 꺼져 있으면 메모리).
// 웹훅 호출이 요청을 붙잡지 않게 작은 대기열 하나로 따로 보낸다(넘치면 버린다)
@Slf4j
@Component
public class SecurityAlerts {

    static final Map<String, String> LABELS = Map.of(
            "BANNED", "자동 임시 차단",
            "PROBE", "민감 경로 탐색",
            "ADMIN_DENIED", "관리자 접근 거부",
            "RATE_AUTH", "로그인·가입 과다 요청",
            "RATE_CONTENT", "질문 대량 조회");

    private final MattermostService mattermost;
    private final StringRedisTemplate redis;
    private final String prefix;
    private final boolean enabled;
    private final Duration cooldown;
    private final Executor executor;
    private final Clock clock;
    private final ConcurrentHashMap<String, Long> localCooldown = new ConcurrentHashMap<>();

    @Autowired
    public SecurityAlerts(MattermostService mattermost, ObjectProvider<StringRedisTemplate> redis,
                          @Value("${app.redis.enabled:false}") boolean redisEnabled,
                          @Value("${app.redis.key-prefix:local:}") String prefix,
                          @Value("${app.alert.enabled:true}") boolean enabled,
                          @Value("${app.security.alert-cooldown-minutes:60}") int cooldownMinutes) {
        this(mattermost, redisEnabled ? redis.getIfAvailable() : null, prefix, enabled,
                Duration.ofMinutes(Math.max(1, cooldownMinutes)),
                new ThreadPoolExecutor(1, 1, 0, TimeUnit.MILLISECONDS, new ArrayBlockingQueue<>(50), r -> {
                    Thread t = new Thread(r, "security-alerts");
                    t.setDaemon(true);
                    return t;
                }, new ThreadPoolExecutor.DiscardPolicy()), Clock.systemUTC());
    }

    SecurityAlerts(MattermostService mattermost, StringRedisTemplate redis, String prefix, boolean enabled,
                   Duration cooldown, Executor executor, Clock clock) {
        this.mattermost = mattermost;
        this.redis = redis;
        this.prefix = prefix + "alert:security:";
        this.enabled = enabled;
        this.cooldown = cooldown;
        this.executor = executor;
        this.clock = clock;
    }

    @PreDestroy
    void close() {
        if (executor instanceof ExecutorService service) service.shutdownNow();
    }

    public boolean watches(String reason) {
        return "RATE_AUTH".equals(reason) || "RATE_CONTENT".equals(reason);
    }

    public void banned(String ip, String trigger, int count, String path, Duration banFor) {
        send("BANNED", ip, "#### :no_entry: [보안] 자동 임시 차단: `" + maskIp(ip) + "`\n"
                + "- 사유: " + label(trigger) + " " + count + "회 → " + banFor.toMinutes() + "분 동안 모든 API 403\n"
                + "- 마지막 경로: `" + cleanPath(path) + "`\n");
    }

    public void burst(String reason, String ip, int count, String path) {
        send(reason, ip, "#### :warning: [보안] " + label(reason) + ": `" + maskIp(ip) + "`\n"
                + "- 1분간 요청 " + count + "건, 한도를 넘어 429로 막는 중\n"
                + "- 경로: `" + cleanPath(path) + "`\n");
    }

    private void send(String reason, String ip, String body) {
        if (!enabled || !mattermost.enabled()) return;
        String key = reason + ":" + ip;
        if (!claim(key)) return;
        String text = body + "\n자세한 기록은 [관리자 페이지 → 보안 · 크롤링](" + mattermost.baseUrl() + "/admin)에서 확인하세요."
                + "\n_같은 IP · 사유는 " + cooldown.toMinutes() + "분 동안 다시 알리지 않아요._";
        try {
            executor.execute(() -> {
                boolean sent = false;
                try { sent = mattermost.postNotice(text); }
                catch (RuntimeException e) { log.warn("보안 알림을 보내지 못했습니다({})", e.getClass().getSimpleName()); }
                if (!sent) release(key);
            });
        } catch (RejectedExecutionException e) {
            release(key);
        }
    }

    static String label(String reason) {
        return LABELS.getOrDefault(reason, reason);
    }

    // 203.0.113.7 → 203.0.*.*, 2001:db8:1::5 → 2001:db8:…
    static String maskIp(String ip) {
        if (ip == null || ip.isBlank()) return "?";
        if (ip.contains(":")) {
            String[] parts = ip.split(":", -1);
            return (parts.length >= 2 ? parts[0] + ":" + parts[1] : parts[0]) + ":…";
        }
        String[] octets = ip.split("\\.");
        return octets.length == 4 ? octets[0] + "." + octets[1] + ".*.*" : "?";
    }

    private static String cleanPath(String path) {
        String masked = LogMasking.mask(path == null ? "" : path).replaceAll("[\\p{Cntrl}`]", " ");
        return masked.length() > 120 ? masked.substring(0, 120) + "…" : masked;
    }

    private boolean claim(String key) {
        if (redis != null) {
            try {
                return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(prefix + key, "1", cooldown));
            } catch (RuntimeException e) {
                log.warn("Redis 쿨다운 확인 실패, 메모리로 대신합니다");
            }
        }
        long now = clock.millis();
        Long until = localCooldown.get(key);
        if (until != null && now < until) return false;
        if (localCooldown.size() > 20_000) localCooldown.entrySet().removeIf(e -> e.getValue() <= now);
        localCooldown.put(key, now + cooldown.toMillis());
        return true;
    }

    private void release(String key) {
        localCooldown.remove(key);
        if (redis != null) {
            try { redis.delete(prefix + key); } catch (RuntimeException ignored) { /* 쿨다운이 지나면 다시 알린다 */ }
        }
    }
}
