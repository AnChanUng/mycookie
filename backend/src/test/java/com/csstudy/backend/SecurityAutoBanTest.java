package com.csstudy.backend;

import com.csstudy.backend.repository.SecurityEventRepository;
import com.csstudy.backend.service.MattermostService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// 민감 경로 탐색 · 관리자 접근 거부를 반복한 IP만 모든 API에서 막히고, 차단 알림이 Mattermost로 간다(Redis 꺼짐 → 메모리)
@SpringBootTest(properties = {"app.admin-key=security-test-key-with-32-characters", "app.security.rate-limit-enabled=true",
        "app.security.ban.threshold=3", "app.redis.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:security_ban_tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;INIT=CREATE DOMAIN IF NOT EXISTS BLOB AS BYTEA"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class SecurityAutoBanTest {
    @Autowired MockMvc mvc;
    @Autowired SecurityEventRepository events;
    @MockitoBean MattermostService mattermost;

    @BeforeEach void setUp() {
        when(mattermost.enabled()).thenReturn(true);
        when(mattermost.postNotice(anyString())).thenReturn(true);
        when(mattermost.baseUrl()).thenReturn("https://mycookie.dev");
    }

    private static RequestPostProcessor from(String ip) { return req -> { req.setRemoteAddr(ip); return req; }; }

    @Test void repeatedProbesBanOnlyThatIpAndAlert() throws Exception {
        mvc.perform(get("/.env").with(from("203.0.113.50"))).andExpect(status().isForbidden());
        mvc.perform(get("/.git/config").with(from("203.0.113.50"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/categories").with(from("203.0.113.50"))).andExpect(status().isOk());
        mvc.perform(get("/wp-login.php").with(from("203.0.113.50"))).andExpect(status().isForbidden());

        mvc.perform(get("/api/v1/categories").with(from("203.0.113.50")))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("IP_TEMPORARILY_BLOCKED"));
        mvc.perform(get("/api/v1/categories").with(from("203.0.113.51"))).andExpect(status().isOk());
        assertTrue(events.findAll().stream().anyMatch(e -> e.getIp().equals("203.0.113.50") && e.getReason().equals("BANNED")));
        verify(mattermost, timeout(3000).times(1)).postNotice(argThat(text -> text.contains("203.0.*.*") && !text.contains("203.0.113.50")));
    }

    @Test void wrongAdminKeysBanButDeclaredBotsDoNot() throws Exception {
        for (int i = 0; i < 3; i++) mvc.perform(get("/api/v1/admin/security").with(from("198.51.100.60")).header("X-Admin-Key", "wrong-" + i))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/categories").with(from("198.51.100.60"))).andExpect(status().isForbidden());

        for (int i = 0; i < 10; i++) mvc.perform(get("/api/v1/categories").with(from("198.51.100.61")).header("User-Agent", "Googlebot/2.1"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/categories").with(from("198.51.100.61"))).andExpect(status().isOk());
    }
}
