package com.csstudy.backend;

import com.csstudy.backend.controller.LoungeController;
import com.csstudy.backend.entity.LoungeMessage;
import com.csstudy.backend.repository.LoungeMessageRepository;
import com.csstudy.backend.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.mock.web.MockHttpServletRequest;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LoungeRealtimeTest {
    @Test
    void keepsHistoryAcrossDaysButStartsAtTheHistoryStartDate() {
        var repo = mock(LoungeMessageRepository.class);
        var stream = mock(LoungeStreamService.class);
        var controller = new LoungeController(repo, mock(VisitorProfileService.class),
                mock(PresenceService.class), mock(AdminAuth.class), stream, mock(AuthService.class), mock(com.csstudy.backend.service.ChatReactionService.class), new com.csstudy.backend.security.ClientAddress(false));
        // 기록 시작일(2026-11-22 0시, 한국 시간) 이후 글은 날이 바뀌어도 계속 보이고, 그 이전 글은 목록에 올리지 않는다
        Instant start = LocalDate.of(2026, 11, 22).atStartOfDay(ZoneId.of("Asia/Seoul")).toInstant();
        var beforeStart = message(1L, start.minusMillis(1), "before");
        var firstDay = message(2L, start, "first day");
        var laterDay = message(3L, start.plusSeconds(3 * 86400L), "later day");
        when(repo.findByOrderByIdDesc(any(Pageable.class))).thenReturn(List.of(laterDay, firstDay, beforeStart));
        var rows = (List<?>)controller.messages(null).get("messages");
        assertEquals(2, rows.size());
        assertEquals("first day", ((Map<?,?>)rows.get(0)).get("text"));
        assertEquals("later day", ((Map<?,?>)rows.get(1)).get("text"));
        // Admin still sees every row, and nothing is ever deleted from the database.
        assertEquals(3, controller.adminList("admin").size());
        verify(repo, never()).deleteByCreatedAtBefore(any());
        verify(repo, never()).deleteById(any());
    }

    @Test
    void retryAfterLostResponseReturnsExistingRowWithoutSavingTwice() {
        var repo = mock(LoungeMessageRepository.class);
        var profiles = mock(VisitorProfileService.class);
        var stream = mock(LoungeStreamService.class);
        var controller = new LoungeController(repo, profiles, mock(PresenceService.class), mock(AdminAuth.class), stream, mock(AuthService.class), mock(com.csstudy.backend.service.ChatReactionService.class), new com.csstudy.backend.security.ClientAddress(false));
        var saved = message(9L, Instant.now(), "hello");
        saved.setClientId("request-1");
        when(repo.findByVisitorIdAndClientId("visitor-1", "request-1")).thenReturn(Optional.of(saved));
        var response = controller.send(Map.of("visitorId", "visitor-1", "nickname", "name", "text", "hello", "clientId", "request-1"), new MockHttpServletRequest());
        assertEquals(200, response.getStatusCode().value());
        assertEquals(9L, ((Map<?,?>)response.getBody()).get("id"));
        verify(repo, never()).save(any());
        verifyNoInteractions(profiles, stream);
    }

    private LoungeMessage message(Long id, Instant at, String text) {
        return LoungeMessage.builder().id(id).visitorId("visitor-1").nickname("name").text(text).createdAt(at).build();
    }
}
