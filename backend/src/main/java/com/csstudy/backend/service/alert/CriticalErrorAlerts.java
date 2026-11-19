package com.csstudy.backend.service.alert;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import ch.qos.logback.core.AppenderBase;
import com.csstudy.backend.service.MattermostService;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

// 고위험 오류만 Mattermost로 알린다(Gemini 요약 + 원본 증거).
//   - 치명 오류: 메모리 부족, DB 연결 실패처럼 서비스 전체가 멈출 수 있는 오류는 한 번만 나도 알린다
//   - 오류 급증: 최근 5분 동안 ERROR 로그가 기준(기본 10건) 이상이면 알린다
// 같은 문제는 30분 동안 다시 알리지 않는다(Redis를 켜면 재시작해도 유지). 웹훅이 없는 환경(스테이징, 로컬)은 아무것도 보내지 않는다.
// 서버가 통째로 죽은 경우는 백엔드가 스스로 알릴 수 없으므로 홈서버의 healthcheck.sh가 맡는다
@Slf4j
@Component
public class CriticalErrorAlerts {

    static final Set<String> FATAL = Set.of(
            "OutOfMemoryError", "StackOverflowError",
            "CannotGetJdbcConnectionException", "CannotCreateTransactionException",
            "DataAccessResourceFailureException", "JDBCConnectionException", "SQLTransientConnectionException");
    static final Duration WINDOW = Duration.ofMinutes(5);
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss").withZone(KST);
    private static final String OWN_PACKAGE = CriticalErrorAlerts.class.getPackageName();

    record Event(Instant at, String fingerprint, String exception, String message, String frame, boolean fatal) {}

    private final MattermostService mattermost;
    private final GeminiSummarizer gemini;
    private final StringRedisTemplate redis;
    private final boolean enabled;
    private final int threshold;
    private final Duration cooldown;
    private final String prefix;
    private final String grafanaUrl;
    private final Deque<Event> events = new ArrayDeque<>();
    private final Map<String, Instant> localCooldown = new ConcurrentHashMap<>();
    private Clock clock = Clock.systemUTC();
    private AppenderBase<ILoggingEvent> appender;

    public CriticalErrorAlerts(MattermostService mattermost, GeminiSummarizer gemini,
                               ObjectProvider<StringRedisTemplate> redis,
                               @Value("${app.redis.enabled:false}") boolean redisEnabled,
                               @Value("${app.redis.key-prefix:local:}") String prefix,
                               @Value("${app.alert.enabled:true}") boolean enabled,
                               @Value("${app.alert.error-threshold:10}") int threshold,
                               @Value("${app.alert.cooldown-minutes:30}") int cooldownMinutes,
                               @Value("${app.alert.grafana-url:}") String grafanaUrl) {
        this.mattermost = mattermost;
        this.gemini = gemini;
        this.redis = redisEnabled ? redis.getIfAvailable() : null;
        this.prefix = prefix + "alert:";
        this.enabled = enabled;
        this.threshold = Math.max(1, threshold);
        this.cooldown = Duration.ofMinutes(Math.max(1, cooldownMinutes));
        this.grafanaUrl = grafanaUrl == null ? "" : grafanaUrl.trim().replaceAll("/+$", "");
    }

    void useClock(Clock clock) { this.clock = clock; }

    // 모든 로거의 ERROR를 받아 둔다(알림 코드 자신의 로그는 빼서 알림이 알림을 부르지 않게 한다)
    @PostConstruct
    void attach() {
        if (!enabled || !(LoggerFactory.getILoggerFactory() instanceof LoggerContext context)) return;
        appender = new AppenderBase<>() {
            @Override
            protected void append(ILoggingEvent e) {
                if (e.getLevel().isGreaterOrEqual(Level.ERROR) && !e.getLoggerName().startsWith(OWN_PACKAGE)) record(e);
            }
        };
        appender.setContext(context);
        appender.setName("critical-error-alerts");
        appender.start();
        context.getLogger(Logger.ROOT_LOGGER_NAME).addAppender(appender);
    }

    @PreDestroy
    void detach() {
        if (appender != null && LoggerFactory.getILoggerFactory() instanceof LoggerContext context) {
            context.getLogger(Logger.ROOT_LOGGER_NAME).detachAppender(appender);
            appender.stop();
        }
    }

    void record(ILoggingEvent e) {
        // 원인 사슬의 맨 끝(근본 원인)을 이름으로 쓰고, 위치는 우리 코드가 보이는 맨 위 예외에서 찾는다
        IThrowableProxy top = e.getThrowableProxy(), root = top;
        boolean fatal = false;
        for (IThrowableProxy t = top; t != null; t = t.getCause()) {
            if (FATAL.contains(simpleName(t.getClassName()))) fatal = true;
            root = t;
        }
        String exception = root == null ? "ERROR 로그" : simpleName(root.getClassName());
        String frame = top == null ? e.getLoggerName() : appFrame(top);
        record(new Event(Instant.ofEpochMilli(e.getTimeStamp()), exception + "@" + frame, exception,
                root != null && root.getMessage() != null ? root.getMessage() : e.getFormattedMessage(), frame, fatal));
    }

    synchronized void record(Event event) {
        events.addLast(event);
        while (events.size() > 1000) events.removeFirst();
    }

    @Scheduled(fixedDelayString = "${app.alert.check-ms:60000}", initialDelay = 60000)
    public void check() {
        if (!enabled || !mattermost.enabled()) return;
        Instant now = clock.instant();
        List<Event> window;
        synchronized (this) {
            while (!events.isEmpty() && events.peekFirst().at().isBefore(now.minus(WINDOW.multipliedBy(2)))) events.removeFirst();
            window = events.stream().filter(e -> !e.at().isBefore(now.minus(WINDOW))).toList();
        }
        if (window.isEmpty()) return;

        Map<String, List<Event>> groups = window.stream().collect(Collectors.groupingBy(Event::fingerprint, LinkedHashMap::new, Collectors.toList()));
        String title = null, key = null;
        for (var entry : groups.entrySet()) {
            if (entry.getValue().stream().anyMatch(Event::fatal) && claim("fatal:" + entry.getKey())) {
                key = "fatal:" + entry.getKey();
                title = "치명 오류: " + entry.getValue().get(0).exception();
                break;
            }
        }
        if (title == null && window.size() >= threshold && claim("spike")) {
            key = "spike";
            title = "서버 오류 급증: 5분간 ERROR " + window.size() + "건";
        }
        if (title == null) return;

        String evidence = evidence(window, groups);
        String message = "#### :rotating_light: [긴급] " + title + "\n"
                + gemini.summarize(evidence).map(s -> "**🤖 Gemini 요약** (AI 추측이 섞일 수 있어요)\n" + s + "\n\n").orElse("")
                + "**📎 원본 증거**\n" + evidence
                + logsLink()
                + "\n\n_같은 문제는 " + cooldown.toMinutes() + "분 동안 다시 알리지 않아요._";
        try {
            mattermost.postNotice(message);
        } catch (Exception e) {
            release(key);   // 다음 확인 때 다시 보낸다
            log.warn("긴급 오류 알림을 보내지 못했습니다({})", e.getClass().getSimpleName());
        }
    }

    // Grafana가 있으면 최근 30분 운영 ERROR 로그로 바로 가는 링크(팀원은 Tailscale로 연다)
    private String logsLink() {
        if (grafanaUrl.isEmpty()) return "";
        return "\n\n[📊 Grafana에서 최근 30분 운영 ERROR 로그 보기](" + grafanaUrl
                + "/d/mycookie-logs?var-environment=prod&var-service=backend&var-level=ERROR&from=now-30m&to=now)";
    }

    // 많이 난 순서로 3개까지. 메시지는 개인정보를 가리고 200자로 자른다
    private String evidence(List<Event> window, Map<String, List<Event>> groups) {
        var lines = new StringBuilder("최근 5분 ERROR ").append(window.size()).append("건\n");
        groups.values().stream().sorted(Comparator.comparingInt((List<Event> g) -> -g.size())).limit(3).forEach(g -> {
            Event first = g.get(0), last = g.get(g.size() - 1);
            String msg = LogMasking.mask(first.message()).replace('\n', ' ');
            lines.append("- `").append(first.exception()).append("` × ").append(g.size())
                    .append(" (처음 ").append(TIME.format(first.at())).append(", 마지막 ").append(TIME.format(last.at())).append(")")
                    .append(" 위치 `").append(LogMasking.mask(first.frame())).append("`\n")
                    .append("  메시지: ").append(msg.length() > 200 ? msg.substring(0, 200) + "…" : msg).append('\n');
        });
        return lines.toString().trim();
    }

    // 이 문제를 지금 알려도 되는지(쿨다운 안이면 false). Redis가 있으면 여러 대, 재시작 사이에도 공유한다
    private boolean claim(String key) {
        if (redis != null) {
            try {
                return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(prefix + key, "1", cooldown));
            } catch (RuntimeException e) {
                log.warn("Redis 쿨다운 확인 실패, 메모리로 대신합니다");
            }
        }
        Instant now = clock.instant();
        Instant until = localCooldown.get(key);
        if (until != null && now.isBefore(until)) return false;
        localCooldown.put(key, now.plus(cooldown));
        return true;
    }

    private void release(String key) {
        localCooldown.remove(key);
        if (redis != null) {
            try { redis.delete(prefix + key); } catch (RuntimeException ignored) { /* 쿨다운이 남아도 알림은 30분 뒤 다시 간다 */ }
        }
    }

    private static String simpleName(String className) {
        return className.substring(className.lastIndexOf('.') + 1);
    }

    // 스택에서 우리 코드(com.csstudy)의 첫 줄. 없으면 맨 윗줄
    private static String appFrame(IThrowableProxy t) {
        StackTraceElementProxy[] frames = t.getStackTraceElementProxyArray();
        if (frames == null || frames.length == 0) return simpleName(t.getClassName());
        for (StackTraceElementProxy f : frames) {
            StackTraceElement s = f.getStackTraceElement();
            if (s.getClassName().startsWith("com.csstudy")) return simpleName(s.getClassName()) + "." + s.getMethodName() + ":" + s.getLineNumber();
        }
        StackTraceElement s = frames[0].getStackTraceElement();
        return simpleName(s.getClassName()) + "." + s.getMethodName();
    }
}
