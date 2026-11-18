package com.csstudy.backend;

import com.csstudy.backend.repository.SecurityEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"app.admin-key=security-test-key-with-32-characters", "app.security.rate-limit-enabled=true", "app.security.min-admin-key-length=32",
        "spring.datasource.url=jdbc:h2:mem:security_tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;INIT=CREATE DOMAIN IF NOT EXISTS BLOB AS BYTEA"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class SecurityProtectionTest {
    @Autowired MockMvc mvc;
    @Autowired SecurityEventRepository events;

    @Test void mutationAndMaintenanceEndpointsRequireAdminWhileStudyStillWorks() throws Exception {
        for (String path:new String[]{"/api/v1/questions","/api/v1/categories","/api/v1/sync","/api/v1/slack/test-daily"}) {
            mvc.perform(post(path).header("User-Agent","browser")).andExpect(status().isUnauthorized());
        }
        mvc.perform(put("/api/v1/questions/1")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/questions/1")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/categories;matrix=1").contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/categories")).andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options","nosniff"))
                .andExpect(header().string("Cache-Control","no-store"));
        mvc.perform(get("/api/v1/admin/security")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/security").header("X-Admin-Key","security-test-key-with-32-characters")).andExpect(status().isOk());
    }
    @Test void excessiveAuthRequestsReturn429EvenWhenVisitorAndForwardedHeadersChange() throws Exception {
        for(int i=0;i<60;i++) mvc.perform(post("/api/v1/auth/login")
                .with(req->{req.setRemoteAddr("192.0.2.10");return req;})
                .header("X-Visitor-Id","rotating-"+i).header("X-Forwarded-For","198.51.100."+i)
                .contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/login").with(req->{req.setRemoteAddr("192.0.2.10");return req;})
                .header("Origin","https://mycookie.dev").contentType("application/json").content("{}"))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"))
                .andExpect(header().string("Access-Control-Allow-Origin","https://mycookie.dev"));
        assertTrue(events.findAll().stream().anyMatch(e->e.getIp().equals("192.0.2.10") && e.getReason().equals("RATE_AUTH")));
    }
    @Test void crawlerAndProbeRecordsExcludeQueryAndAuthorization() throws Exception {
        mvc.perform(get("/api/v1/categories?secret=do-not-log").with(req->{req.setRemoteAddr("192.0.2.20");return req;})
                .header("User-Agent","python-requests/2.32").header("Authorization","Bearer do-not-log"))
                .andExpect(status().isOk());
        var event=events.findAll().stream().filter(e->e.getIp().equals("192.0.2.20")).findFirst().orElseThrow();
        assertEquals("DECLARED_AUTOMATION",event.getReason());
        assertEquals("/api/v1/categories",event.getPath());
        mvc.perform(get("/.env")).andExpect(status().isForbidden());
        mvc.perform(options("/api/v1/categories").header("Origin","https://mycookie.dev")
                .header("Access-Control-Request-Method","GET"))
                .andExpect(status().isOk());
    }
}
