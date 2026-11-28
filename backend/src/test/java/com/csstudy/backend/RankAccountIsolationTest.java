package com.csstudy.backend;

import com.csstudy.backend.controller.RankController;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.VisitorSolved;
import com.csstudy.backend.repository.VisitorSolvedRepository;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.MembershipService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Map;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RankAccountIsolationTest {
    @Mock AuthService authService;
    @Mock MembershipService membershipService;
    @Mock VisitorSolvedRepository solvedRepository;
    @Mock HttpServletRequest request;
    @InjectMocks RankController controller;

    @Test void anotherAccountCannotTakeOverDeviceCount() {
        User next = new User();
        next.setId(2L);
        var original = VisitorSolved.builder().visitorId("shared-device").userId(1L).count(295).build();
        when(authService.currentUser(request)).thenReturn(Optional.of(next));
        when(solvedRepository.findByVisitorId("shared-device")).thenReturn(Optional.of(original));
        assertEquals(403, controller.report(Map.of("visitorId", "shared-device", "count", 1), request).getStatusCode().value());
        assertEquals(1L, original.getUserId());
        assertEquals(295, original.getCount());
        verify(solvedRepository, never()).saveAndFlush(any());
    }

    @Test void loggedOutRequestCannotChangeAccountCount() {
        var original = VisitorSolved.builder().visitorId("shared-device").userId(1L).count(295).build();
        when(authService.currentUser(request)).thenReturn(Optional.empty());
        when(solvedRepository.findByVisitorId("shared-device")).thenReturn(Optional.of(original));
        assertEquals(403, controller.report(Map.of("visitorId", "shared-device", "count", 0), request).getStatusCode().value());
        assertEquals(295, original.getCount());
        verify(solvedRepository, never()).saveAndFlush(any());
    }
}
