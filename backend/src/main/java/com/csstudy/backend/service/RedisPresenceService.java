package com.csstudy.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// 지금 공부 중인 사람 수와 채팅 참여자를 Redis에 둔다(REDIS_ENABLED=true).
// 백엔드를 다시 띄워도 숫자가 0으로 돌아가지 않고, 백엔드를 여러 대로 늘려도 같은 값을 본다.
//   {prefix}presence      ZSET  방문자 ID → 마지막 신호 시각(ms)
//   {prefix}chat:members  HASH  방문자 ID → "채팅ID|닉네임|시각(ms)"
// Redis에 닿지 않으면 이 백엔드의 메모리 값(PresenceService)으로 대신 답한다
@Slf4j
@Primary
@Component
@ConditionalOnProperty(name = "app.redis.enabled", havingValue = "true")
public class RedisPresenceService extends PresenceService {

    private static final long PRESENCE_MS = 150_000, CHAT_MS = 90_000;
    private static final int MAX = 5000;

    private final StringRedisTemplate redis;
    private final Clock clock;
    private final String presenceKey, chatKey;

    // 생성자가 둘이라 스프링이 쓸 것을 지정한다(없으면 백엔드가 켜지지 않는다)
    @Autowired
    public RedisPresenceService(StringRedisTemplate redis, @Value("${app.redis.key-prefix:local:}") String prefix) {
        this(redis, prefix, Clock.systemUTC());
    }

    RedisPresenceService(StringRedisTemplate redis, String prefix, Clock clock) {
        this.redis = redis;
        this.clock = clock;
        this.presenceKey = prefix + "presence";
        this.chatKey = prefix + "chat:members";
    }

    @Override
    public void beat(String visitorId) {
        if (visitorId == null) return;
        try {
            var zset = redis.opsForZSet();
            if (count() < MAX || zset.score(presenceKey, visitorId) != null) {
                zset.add(presenceKey, visitorId, clock.millis());
                redis.expire(presenceKey, java.time.Duration.ofMillis(PRESENCE_MS * 2));
            }
        } catch (RuntimeException e) {
            fallback("beat", e);
            super.beat(visitorId);
        }
    }

    @Override
    public int count() {
        try {
            var zset = redis.opsForZSet();
            zset.removeRangeByScore(presenceKey, Double.NEGATIVE_INFINITY, clock.millis() - PRESENCE_MS);
            Long size = zset.zCard(presenceKey);
            return size == null ? 0 : size.intValue();
        } catch (RuntimeException e) {
            fallback("count", e);
            return super.count();
        }
    }

    @Override
    public String joinChat(String visitorId, String nickname) {
        try {
            var hash = redis.<String, String>opsForHash();
            pruneChat();
            String previous = hash.get(chatKey, visitorId);
            if (previous == null && size(hash.size(chatKey)) >= MAX) return null;
            String id = previous == null ? UUID.randomUUID().toString() : previous.split("\\|", 2)[0];
            hash.put(chatKey, visitorId, id + "|" + nickname.replace("|", " ") + "|" + clock.millis());
            beat(visitorId);
            return id;
        } catch (RuntimeException e) {
            fallback("joinChat", e);
            return super.joinChat(visitorId, nickname);
        }
    }

    @Override
    public void leaveChat(String visitorId) {
        if (visitorId == null) return;
        try {
            redis.opsForHash().delete(chatKey, visitorId);
        } catch (RuntimeException e) {
            fallback("leaveChat", e);
            super.leaveChat(visitorId);
        }
    }

    @Override
    public List<Map<String, String>> chatMembers() {
        try {
            return pruneChat().stream()
                    .sorted(Comparator.comparing(Member::id))
                    .map(m -> Map.of("id", m.id(), "nickname", m.nickname()))
                    .toList();
        } catch (RuntimeException e) {
            fallback("chatMembers", e);
            return super.chatMembers();
        }
    }

    private record Member(String visitorId, String id, String nickname, long at) {}

    // 90초 넘게 신호가 없는 참여자를 지우고 남은 사람을 돌려준다
    private List<Member> pruneChat() {
        var hash = redis.<String, String>opsForHash();
        long cutoff = clock.millis() - CHAT_MS;
        var members = new java.util.ArrayList<Member>();
        var stale = new java.util.ArrayList<Object>();
        hash.entries(chatKey).forEach((visitor, value) -> {
            String[] p = value.split("\\|", 3);
            long at = p.length == 3 ? parse(p[2]) : 0;
            if (at < cutoff) stale.add(visitor);
            else members.add(new Member(visitor, p[0], p[1], at));
        });
        if (!stale.isEmpty()) hash.delete(chatKey, stale.toArray());
        return members;
    }

    private static long parse(String s) {
        try { return Long.parseLong(s); } catch (NumberFormatException e) { return 0; }
    }

    private static long size(Long n) { return n == null ? 0 : n; }

    private long lastWarn;

    private void fallback(String op, RuntimeException e) {
        long now = clock.millis();
        if (now - lastWarn > 60_000) {   // 장애 중 로그가 쏟아지지 않게 1분에 한 번만 남긴다
            lastWarn = now;
            log.warn("Redis에 닿지 않아 메모리 값으로 대신합니다({}): {}", op, e.getMessage());
        }
    }
}
