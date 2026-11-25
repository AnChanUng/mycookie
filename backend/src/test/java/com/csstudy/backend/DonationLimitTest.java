package com.csstudy.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.nio.charset.StandardCharsets;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 누구나 부르는 자료 기부 업로드. 방문자 ID를 바꿔 가며 보내도 같은 곳(IP)에서는 하루 한도를 넘지 못하고,
// 올린 사람이 적은 메모가 담긴 장부는 관리자만 본다
@SpringBootTest(properties = {"app.admin-key=test-admin-key-0123456789abcdef0123", "app.security.trust-forwarded-for=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DonationLimitTest {

    private static final String KEY = "test-admin-key-0123456789abcdef0123";

    @Autowired MockMvc mvc;

    private ResultActions donate(String visitor, String ip) throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", "hello".getBytes(StandardCharsets.UTF_8));
        return mvc.perform(multipart("/api/v1/donations").file(file)
                .param("label", "기출 정리")
                .header("X-Visitor-Id", visitor)
                .header("X-Forwarded-For", ip));
    }

    @Test
    void rotatingVisitorIdsDoesNotBypassTheDailyLimitPerNetwork() throws Exception {
        for (int i = 0; i < 10; i++) donate("donor-" + i, "10.20.0.1").andExpect(status().isOk());
        donate("donor-new", "10.20.0.1")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("DONATION_DAILY_LIMIT"));
        // 다른 곳에서는 그대로 올릴 수 있다
        donate("donor-other", "10.20.0.2").andExpect(status().isOk());
    }

    @Test
    void ledgerIsAdminOnly() throws Exception {
        mvc.perform(get("/api/v1/donations")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/donations").header("X-Admin-Key", KEY)).andExpect(status().isOk());
    }
}
