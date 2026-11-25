package com.csstudy.backend;

import com.csstudy.backend.service.LoungeStreamService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

// 라운지 실시간 연결: 상한을 넘으면 예외 없이 "가득 참"으로 알리고, 연결 수를 정확히 센다
class LoungeStreamServiceTest {

    @Test
    void overTheLimitReturnsNullInsteadOfThrowing() {
        var service = new LoungeStreamService(new ObjectMapper(), 2, 1);
        Map<String, Object> snapshot = Map.of("messages", List.of(), "epoch", 1L);
        assertNotNull(service.subscribe(snapshot));
        assertNotNull(service.subscribe(snapshot));
        assertNull(service.subscribe(snapshot));   // 예전에는 ResponseStatusException(503) → ERROR 로그
        assertEquals(2, service.connected());
        assertNotNull(service.full());
        service.close();
    }

    @Test
    void publishingToManyClientsDoesNotThrow() {
        var service = new LoungeStreamService(new ObjectMapper(), 100, 2);
        for (int i = 0; i < 50; i++) service.subscribe(Map.of("messages", List.of(), "epoch", 1L));
        for (int i = 0; i < 20; i++) service.publishMessage(Map.of("id", i, "text", "t" + i), 1L);
        service.publishPresence(3, List.of());
        assertEquals(50, service.connected());
        service.close();
    }
}
