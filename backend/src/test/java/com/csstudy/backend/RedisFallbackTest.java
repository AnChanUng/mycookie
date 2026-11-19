package com.csstudy.backend;

import com.csstudy.backend.security.RedisTrafficGuard;
import com.csstudy.backend.service.RedisPresenceService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

// Redis가 꺼져 있어도 서비스가 멈추지 않고 메모리 값으로 대신하는지 본다(Docker 필요 없음)
class RedisFallbackTest {

    private final LettuceConnectionFactory factory = new LettuceConnectionFactory(
            new RedisStandaloneConfiguration("127.0.0.1", 1),   // 아무도 듣지 않는 포트
            LettuceClientConfiguration.builder().commandTimeout(Duration.ofMillis(300)).build());

    @AfterEach
    void close() { factory.destroy(); }

    @Test
    void fallsBackToMemoryWhenRedisIsDown() {
        factory.afterPropertiesSet();
        factory.start();
        var redis = new StringRedisTemplate(factory);

        var presence = new RedisPresenceService(redis, "down:");
        presence.beat("v1");
        presence.beat("v2");
        assertThat(presence.count()).isEqualTo(2);
        assertThat(presence.joinChat("v1", "쿠키")).isNotNull();

        var traffic = new RedisTrafficGuard(redis, "down:");
        for (int i = 0; i < 15; i++) assertThat(traffic.check("9.9.9.9", "POST", "/api/v1/code/java").allowed()).isTrue();
        assertThat(traffic.check("9.9.9.9", "POST", "/api/v1/code/java").allowed()).isFalse();   // 장애 중에도 막는다
    }
}
