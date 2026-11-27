package com.csstudy.backend.security;

import com.csstudy.backend.service.MattermostService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

// 알림은 IP를 가리고, 같은 IP · 사유는 쿨다운 동안 한 번만 보낸다(Redis 꺼짐 → 메모리 쿨다운)
class SecurityAlertsTest {
    private final MattermostService mattermost = mock(MattermostService.class);
    private final TrafficGuardTest.MutableClock clock = new TrafficGuardTest.MutableClock();
    private final SecurityAlerts alerts = new SecurityAlerts(mattermost, null, "t:", true, Duration.ofMinutes(60), Runnable::run, clock);

    @BeforeEach void setUp() {
        when(mattermost.enabled()).thenReturn(true);
        when(mattermost.postNotice(anyString())).thenReturn(true);
        when(mattermost.baseUrl()).thenReturn("https://mycookie.dev");
    }

    @Test void banAlertMasksIpAndIsSentOncePerCooldown() {
        alerts.banned("203.0.113.7", "PROBE", 10, "/.env", Duration.ofMinutes(60));
        alerts.banned("203.0.113.7", "PROBE", 11, "/.git/config", Duration.ofMinutes(60));
        var text = ArgumentCaptor.forClass(String.class);
        verify(mattermost, times(1)).postNotice(text.capture());
        assertTrue(text.getValue().contains("203.0.*.*"));
        assertFalse(text.getValue().contains("203.0.113.7"));
        assertTrue(text.getValue().contains("민감 경로 탐색 10회"));
        assertTrue(text.getValue().contains("/.env"));

        alerts.burst("RATE_AUTH", "203.0.113.7", 61, "/api/v1/auth/login");   // 사유가 다르면 따로 알린다
        verify(mattermost, times(2)).postNotice(anyString());
        clock.instant = clock.instant.plus(Duration.ofMinutes(61));
        alerts.banned("203.0.113.7", "PROBE", 10, "/.env", Duration.ofMinutes(60));
        verify(mattermost, times(3)).postNotice(anyString());
    }

    @Test void failedSendIsRetriedNextTime() {
        when(mattermost.postNotice(anyString())).thenReturn(false, true);
        alerts.burst("RATE_CONTENT", "198.51.100.4", 181, "/api/v1/questions/1");
        alerts.burst("RATE_CONTENT", "198.51.100.4", 182, "/api/v1/questions/2");
        verify(mattermost, times(2)).postNotice(anyString());
    }

    @Test void nothingIsSentWithoutWebhook() {
        when(mattermost.enabled()).thenReturn(false);
        alerts.burst("RATE_AUTH", "198.51.100.4", 61, "/api/v1/auth/login");
        verify(mattermost, never()).postNotice(anyString());
    }

    @Test void masksIpv4AndIpv6() {
        assertEquals("203.0.*.*", SecurityAlerts.maskIp("203.0.113.7"));
        assertEquals("2001:db8:…", SecurityAlerts.maskIp("2001:db8:0:0:0:0:0:5"));
    }
}
