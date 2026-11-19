package com.csstudy.backend.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.List;
import java.util.Locale;

// IP별 요청 제한을 Redis에 센다(REDIS_ENABLED=true). 백엔드를 다시 띄워도 세던 값이 남고,
// 여러 대로 늘려도 한 IP를 합쳐서 센다.
//   {prefix}rate:{ip}:{분}  HASH  total(전체), auth, code, content, chat, general(묶음별)
// 1분 단위로 칸을 나누고, 칸은 2분 뒤 저절로 지워진다. 세기와 만료 지정은 Lua 한 번으로 묶어 원자적으로 처리한다.
// Redis에 닿지 않으면 이 백엔드의 메모리 계수기(TrafficGuard)로 대신 막는다(모두 열어 주지 않는다)
@Slf4j
@Primary
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisTrafficGuard extends TrafficGuard {

    private static final DefaultRedisScript<List> COUNT = new DefaultRedisScript<>("""
            local total = redis.call('HINCRBY', KEYS[1], 'total', 1)
            local group = redis.call('HINCRBY', KEYS[1], ARGV[1], 1)
            if total == 1 then redis.call('PEXPIRE', KEYS[1], 120000) end
            return {total, group}
            """, List.class);

    private final StringRedisTemplate redis;
    private final Clock clock;
    private final String prefix;
    private long lastWarn;

    // 생성자가 둘이라 스프링이 쓸 것을 지정한다(없으면 백엔드가 켜지지 않는다)
    @Autowired
    public RedisTrafficGuard(StringRedisTemplate redis, @Value("${app.redis.key-prefix:local:}") String prefix) {
        this(redis, prefix, Clock.systemUTC());
    }

    RedisTrafficGuard(StringRedisTemplate redis, String prefix, Clock clock) {
        super(clock);
        this.redis = redis;
        this.prefix = prefix;
        this.clock = clock;
    }

    @Override
    public Decision check(String ip, String method, String path) {
        long now = clock.millis();
        long minute = now / 60_000;
        String group = group(method, path);
        try {
            List<?> counts = redis.execute(COUNT, List.of(prefix + "rate:" + ip + ":" + minute), group);
            long total = ((Number) counts.get(0)).longValue(), count = ((Number) counts.get(1)).longValue();
            int retry = (int) Math.max(1, ((minute + 1) * 60_000 - now + 999) / 1000);
            return new Decision(total <= TOTAL_LIMIT && count <= limit(group), (int) Math.min(total, 1_000_000), retry,
                    "RATE_" + group.toUpperCase(Locale.ROOT));
        } catch (RuntimeException e) {
            if (now - lastWarn > 60_000) {
                lastWarn = now;
                log.warn("Redis에 닿지 않아 메모리 요청 제한으로 대신합니다: {}", e.getMessage());
            }
            return super.check(ip, method, path);
        }
    }
}
