package com.csstudy.backend;

import com.csstudy.backend.security.RedisTrafficGuard;
import com.csstudy.backend.security.TrafficGuard;
import com.csstudy.backend.service.PresenceService;
import com.csstudy.backend.service.RedisPresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

// 실제 Redis를 띄워 접속자 수, 채팅 참여자, 요청 제한이 Redis에 쌓이는지 확인한다(Docker가 없으면 건너뛴다).
// 스프링 전체를 띄워 Redis를 켰을 때 빈이 제대로 바뀌는지(백엔드가 켜지는지)도 함께 본다
@SpringBootTest(properties = {"app.redis.enabled=true", "app.redis.key-prefix=test:", "app.security.rate-limit-enabled=true"})
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class RedisStateTest {

    @Container
    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:7.4-alpine").withExposedPorts(6379);

    @DynamicPropertySource
    static void redis(DynamicPropertyRegistry registry) {
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }

    @Autowired PresenceService presence;
    @Autowired TrafficGuard traffic;
    @Autowired StringRedisTemplate redis;

    @BeforeEach
    void clean() {
        var keys = redis.keys("test:*");
        if (keys != null && !keys.isEmpty()) redis.delete(keys);
    }

    @Test
    void redisBeansReplaceMemoryOnes() {
        assertThat(presence).isInstanceOf(RedisPresenceService.class);
        assertThat(traffic).isInstanceOf(RedisTrafficGuard.class);
    }

    @Test
    void presenceAndChatLiveInRedis() {
        presence.beat("v1");
        presence.beat("v2");
        presence.beat("v1");
        assertThat(presence.count()).isEqualTo(2);
        assertThat(redis.opsForZSet().zCard("test:presence")).isEqualTo(2);

        String id = presence.joinChat("v1", "쿠키");
        assertThat(presence.joinChat("v1", "쿠키2")).isEqualTo(id);   // 다시 들어와도 같은 채팅 ID
        assertThat(presence.chatMembers()).containsExactly(java.util.Map.of("id", id, "nickname", "쿠키2"));
        presence.leaveChat("v1");
        assertThat(presence.chatMembers()).isEmpty();
    }

    @Test
    void rateLimitIsCountedInRedis() {
        for (int i = 0; i < 15; i++) assertThat(traffic.check("1.2.3.4", "POST", "/api/v1/code/java").allowed()).isTrue();
        var blocked = traffic.check("1.2.3.4", "POST", "/api/v1/code/java");
        assertThat(blocked.allowed()).isFalse();
        assertThat(blocked.reason()).isEqualTo("RATE_CODE");
        assertThat(blocked.retrySeconds()).isBetween(1, 60);
        assertThat(traffic.check("5.6.7.8", "POST", "/api/v1/code/java").allowed()).isTrue();   // 다른 IP는 따로 센다
        assertThat(redis.keys("test:rate:1.2.3.4:*")).hasSize(1);
    }
}
