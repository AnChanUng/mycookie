package com.csstudy.backend.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 같은 IP가 짧은 시간에 민감 경로 탐색(PROBE)이나 관리자 접근 거부(ADMIN_DENIED)를 여러 번 내면 그 IP를 잠시 막는다.
//   {prefix}ban:strike:{ip}  기준 시간(기본 10분) 동안 센 위반 수(첫 위반부터 TTL)
//   {prefix}ban:{ip}         차단 표시(기본 1시간 TTL). 시간이 지나면 저절로 풀린다
// 세기와 차단 걸기는 Lua 한 번으로 묶는다. REDIS_ENABLED=false거나 Redis에 닿지 않으면 이 백엔드의 메모리로 대신한다.
// 사내망 · 루프백 주소(프록시, 헬스체크)는 막으면 모두가 막히므로 세지 않는다
@Slf4j
@Component
public class IpBanList {

    private static final DefaultRedisScript<List> STRIKE = new DefaultRedisScript<>("""
            local count = redis.call('INCR', KEYS[1])
            if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
            local banned = 0
            if count >= tonumber(ARGV[2]) then
              if redis.call('SET', KEYS[2], '1', 'NX', 'PX', ARGV[3]) then banned = 1 end
            end
            return {count, banned}
            """, List.class);

    public record Strike(int count, boolean newlyBanned) {}

    private final StringRedisTemplate redis;
    private final String prefix;
    private final boolean enabled;
    private final int threshold;
    private final Duration window;
    private final Duration banFor;
    private final Clock clock;
    private final LinkedHashMap<String, long[]> strikes = new LinkedHashMap<>(128, .75f, true);   // ip -> {시작, 건수}
    private final LinkedHashMap<String, Long> bans = new LinkedHashMap<>(128, .75f, true);       // ip -> 풀리는 시각
    private long lastWarn;

    @Autowired
    public IpBanList(ObjectProvider<StringRedisTemplate> redis,
                     @Value("${app.redis.enabled:false}") boolean redisEnabled,
                     @Value("${app.redis.key-prefix:local:}") String prefix,
                     @Value("${app.security.ban.enabled:true}") boolean enabled,
                     @Value("${app.security.ban.threshold:10}") int threshold,
                     @Value("${app.security.ban.window-minutes:10}") int windowMinutes,
                     @Value("${app.security.ban.minutes:60}") int banMinutes) {
        this(redisEnabled ? redis.getIfAvailable() : null, prefix, enabled, threshold,
                Duration.ofMinutes(Math.max(1, windowMinutes)), Duration.ofMinutes(Math.max(1, banMinutes)), Clock.systemUTC());
    }

    IpBanList(StringRedisTemplate redis, String prefix, boolean enabled, int threshold, Duration window, Duration banFor, Clock clock) {
        this.redis = redis;
        this.prefix = prefix + "ban:";
        this.enabled = enabled;
        this.threshold = Math.max(1, threshold);
        this.window = window;
        this.banFor = banFor;
        this.clock = clock;
    }

    public boolean counts(String reason) {
        return "PROBE".equals(reason) || "ADMIN_DENIED".equals(reason);
    }

    public Duration banDuration() { return banFor; }

    public boolean isBanned(String ip) {
        if (!enabled || exempt(ip)) return false;
        if (redis != null) {
            try {
                if (Boolean.TRUE.equals(redis.hasKey(prefix + ip))) return true;
            } catch (RuntimeException e) {
                warn(e);
            }
        }
        return memoryBanned(ip);
    }

    // 위반 한 번을 센다. 이번 위반으로 차단이 새로 걸렸으면 newlyBanned=true
    public Strike strike(String ip) {
        if (!enabled || exempt(ip)) return new Strike(0, false);
        if (redis != null) {
            try {
                List<?> result = redis.execute(STRIKE, List.of(prefix + "strike:" + ip, prefix + ip),
                        Long.toString(window.toMillis()), Integer.toString(threshold), Long.toString(banFor.toMillis()));
                return new Strike((int) Math.min(((Number) result.get(0)).longValue(), 1_000_000),
                        ((Number) result.get(1)).longValue() == 1);
            } catch (RuntimeException e) {
                warn(e);
            }
        }
        return memoryStrike(ip);
    }

    private synchronized boolean memoryBanned(String ip) {
        Long until = bans.get(ip);
        if (until == null) return false;
        if (clock.millis() < until) return true;
        bans.remove(ip);
        return false;
    }

    private synchronized Strike memoryStrike(String ip) {
        long now = clock.millis();
        long[] entry = strikes.get(ip);
        if (entry == null || now - entry[0] >= window.toMillis()) { entry = new long[]{now, 0}; strikes.put(ip, entry); }
        entry[1] = Math.min(entry[1] + 1, 1_000_000);
        trim(strikes);
        boolean newly = false;
        if (entry[1] >= threshold && !memoryBanned(ip)) {
            bans.put(ip, now + banFor.toMillis());
            trim(bans);
            newly = true;
        }
        return new Strike((int) entry[1], newly);
    }

    private static void trim(Map<String, ?> map) {
        var it = map.keySet().iterator();
        while (map.size() > 20_000 && it.hasNext()) { it.next(); it.remove(); }
    }

    private void warn(RuntimeException e) {
        long now = clock.millis();
        if (now - lastWarn > 60_000) {
            lastWarn = now;
            log.warn("Redis에 닿지 않아 메모리 차단 목록으로 대신합니다: {}", e.getMessage());
        }
    }

    // 프록시 · 헬스체크 · 사내망 주소는 막지 않는다(TRUST_FORWARDED_FOR 설정이 어긋나면 모든 요청이 이 주소로 보인다)
    static boolean exempt(String ip) {
        if (ip == null || ip.isBlank()) return true;
        if (!ip.matches("[0-9a-fA-F:.]{2,45}")) return false;
        try {
            InetAddress address = InetAddress.getByName(ip);
            return address.isLoopbackAddress() || address.isSiteLocalAddress() || address.isLinkLocalAddress() || address.isAnyLocalAddress();
        } catch (Exception e) {
            return false;
        }
    }
}
