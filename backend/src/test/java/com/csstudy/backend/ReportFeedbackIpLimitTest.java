package com.csstudy.backend;

import com.csstudy.backend.service.GitHubIssueClient;
import com.csstudy.backend.service.MattermostService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 문제 제보 · 건의는 방문자 ID를 바꿔 가며 보내도 같은 곳(IP)에서는 하루 한도를 넘지 못한다.
// 한도를 낮춰(제보 3 · 건의 2) 확인하고, X-Forwarded-For 앞쪽을 지어내도 프록시가 붙인 주소로 센다
@SpringBootTest(properties = {"app.security.trust-forwarded-for=true",
        "app.security.reports-per-ip-per-day=3", "app.security.feedback-per-ip-per-day=2"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReportFeedbackIpLimitTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean GitHubIssueClient github;
    @MockitoBean MattermostService mattermost;

    private ResultActions report(String visitor, String questionId, String forwardedFor) throws Exception {
        return mvc.perform(post("/api/v1/reports").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", forwardedFor)
                .content(json.writeValueAsString(Map.of("visitorId", visitor, "path", "/exam/ip-limit",
                        "questionId", questionId, "kind", "typo"))));
    }

    private ResultActions feedback(String visitor, String forwardedFor) throws Exception {
        return mvc.perform(post("/api/v1/feedback").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", forwardedFor)
                .content(json.writeValueAsString(Map.of("kind", "bug", "title", "제목 " + visitor, "content", "내용",
                        "visitorId", visitor))));
    }

    @Test
    void rotatingVisitorIdsDoesNotBypassTheReportLimitPerNetwork() throws Exception {
        for (int i = 1; i <= 3; i++) {
            report("report-v" + i, "q" + i, "198.51.100." + i + ", 10.30.0.1").andExpect(status().isOk());
        }
        report("report-v4", "q4", "198.51.100.4, 10.30.0.1")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("REPORT_DAILY_LIMIT"));
        // 다른 곳에서는 그대로 보낼 수 있다
        report("report-v5", "q5", "10.30.0.2").andExpect(status().isOk());
    }

    @Test
    void rotatingVisitorIdsDoesNotBypassTheFeedbackLimitPerNetwork() throws Exception {
        feedback("feedback-v1", "10.40.0.1").andExpect(status().isOk());
        feedback("feedback-v2", "203.0.113.9, 10.40.0.1").andExpect(status().isOk());
        feedback("feedback-v3", "203.0.113.10, 10.40.0.1")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("FEEDBACK_DAILY_LIMIT"));
        feedback("feedback-v4", "10.40.0.2").andExpect(status().isOk());
    }
}
