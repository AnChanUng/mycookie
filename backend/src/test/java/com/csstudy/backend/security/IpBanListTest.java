package com.csstudy.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

// Redis 없이(REDIS_ENABLED=false) 메모리로 차단이 걸리고 풀리는지 본다
class IpBanListTest {
    private final TrafficGuardTest.MutableClock clock = new TrafficGuardTest.MutableClock();
    private final IpBanList bans = new IpBanList(null, "t:", true, 3, Duration.ofMinutes(10), Duration.ofMinutes(60), clock);

    @Test void bansAfterThresholdAndLiftsAfterBanTime() {
        assertFalse(bans.strike("203.0.113.7").newlyBanned());
        assertFalse(bans.strike("203.0.113.7").newlyBanned());
        assertFalse(bans.isBanned("203.0.113.7"));
        var third = bans.strike("203.0.113.7");
        assertTrue(third.newlyBanned());
        assertEquals(3, third.count());
        assertFalse(bans.strike("203.0.113.7").newlyBanned());   // 이미 막힌 IP는 다시 "새 차단"이 아니다
        assertTrue(bans.isBanned("203.0.113.7"));
        assertFalse(bans.isBanned("203.0.113.8"));
        clock.instant = clock.instant.plus(Duration.ofMinutes(61));
        assertFalse(bans.isBanned("203.0.113.7"));
    }

    @Test void strikesOutsideWindowDoNotAddUp() {
        bans.strike("198.51.100.1");
        bans.strike("198.51.100.1");
        clock.instant = clock.instant.plus(Duration.ofMinutes(11));
        assertFalse(bans.strike("198.51.100.1").newlyBanned());
        assertFalse(bans.isBanned("198.51.100.1"));
    }

    @Test void localAndPrivateAddressesAreNeverBanned() {
        for (String ip : new String[]{"127.0.0.1", "10.0.0.5", "172.18.0.3", "192.168.0.10", "::1"}) {
            for (int i = 0; i < 5; i++) bans.strike(ip);
            assertFalse(bans.isBanned(ip), ip);
        }
    }

    @Test void disabledListNeverBans() {
        var off = new IpBanList(null, "t:", false, 1, Duration.ofMinutes(10), Duration.ofMinutes(60), clock);
        off.strike("203.0.113.9");
        assertFalse(off.isBanned("203.0.113.9"));
    }

    @Test void redisDownFallsBackToMemory() {
        var factory = new LettuceConnectionFactory(new RedisStandaloneConfiguration("127.0.0.1", 1),   // 아무도 듣지 않는 포트
                LettuceClientConfiguration.builder().commandTimeout(Duration.ofMillis(300)).build());
        factory.afterPropertiesSet();
        factory.start();
        try {
            var down = new IpBanList(new StringRedisTemplate(factory), "down:", true, 2, Duration.ofMinutes(10), Duration.ofMinutes(60), clock);
            assertFalse(down.strike("203.0.113.20").newlyBanned());
            assertTrue(down.strike("203.0.113.20").newlyBanned());
            assertTrue(down.isBanned("203.0.113.20"));   // 장애 중에도 막는다
            clock.instant = clock.instant.plus(Duration.ofMinutes(61));
            assertFalse(down.isBanned("203.0.113.20"));
        } finally {
            factory.destroy();
        }
    }
}
