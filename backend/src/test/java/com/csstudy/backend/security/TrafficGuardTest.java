package com.csstudy.backend.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class TrafficGuardTest {
    @Test void forwardedHeadersRequireExplicitProxyTrustAndUseAppendedHop() {
        var request=new MockHttpServletRequest();request.setRemoteAddr("192.0.2.1");
        request.addHeader("X-Forwarded-For","203.0.113.7, 198.51.100.2");
        assertEquals("192.0.2.1",new ClientAddress(false).resolve(request));
        assertEquals("198.51.100.2",new ClientAddress(true).resolve(request));
    }
    @Test void newMinuteAndDifferentClientsHaveIndependentBudgets() {
        var clock=new MutableClock();var guard=new TrafficGuard(clock);
        for(int i=0;i<180;i++) assertTrue(guard.check("one","GET","/api/v1/questions/1").allowed());
        assertFalse(guard.check("one","GET","/api/v1/questions/2").allowed());
        assertTrue(guard.check("two","GET","/api/v1/questions/1").allowed());
        clock.instant=clock.instant.plusSeconds(60);
        assertTrue(guard.check("one","GET","/api/v1/questions/1").allowed());
    }
    @Test void absentAdminConfigurationNeverOpensAdministratorAccess() {
        var exception=assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> new com.csstudy.backend.service.AdminAuth(null, null).require("any-key"));
        assertEquals(503,exception.getStatusCode().value());
        var configured=new com.csstudy.backend.service.AdminAuth(null, null);
        org.springframework.test.util.ReflectionTestUtils.setField(configured,"adminKey","short-key");
        var weak=assertThrows(org.springframework.web.server.ResponseStatusException.class,()->configured.require("short-key"));
        assertEquals(503,weak.getStatusCode().value());
    }
    static class MutableClock extends Clock {
        Instant instant=Instant.parse("2026-10-17T00:00:00Z");
        public Instant instant(){return instant;}
        public ZoneId getZone(){return ZoneOffset.UTC;}
        public Clock withZone(ZoneId zone){return this;}
    }
}
