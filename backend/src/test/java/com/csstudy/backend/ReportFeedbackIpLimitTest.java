package com.csstudy.backend;

import com.csstudy.backend.controller.FeedbackController;
import com.csstudy.backend.controller.ReportController;
import com.csstudy.backend.entity.Feedback;
import com.csstudy.backend.exception.CookieExceptionHandler;
import com.csstudy.backend.repository.FeedbackRepository;
import com.csstudy.backend.repository.QuestionReportRepository;
import com.csstudy.backend.security.ClientAddress;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.FeedbackEvents;
import com.csstudy.backend.service.FeedbackProcessor;
import com.csstudy.backend.service.SlackService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 문제 제보 · 건의는 방문자 ID를 바꿔 가며 보내도 같은 곳(IP)에서는 하루 한도를 넘지 못한다.
// 한도를 낮춰(제보 3 · 건의 2) 확인하고, X-Forwarded-For 앞쪽을 지어내도 프록시가 붙인 주소로 센다.
// 스프링 컨텍스트를 새로 띄우지 않도록(CI 테스트 메모리) 컨트롤러만 MockMvc로 세운다
class ReportFeedbackIpLimitTest {

    private final ObjectMapper json = new ObjectMapper();
    private final ClientAddress addresses = new ClientAddress(true);

    private MockMvc reportMvc() {
        QuestionReportRepository reports = mock(QuestionReportRepository.class);
        when(reports.save(any())).thenAnswer(i -> i.getArgument(0));
        ReportController controller = new ReportController(reports, mock(SlackService.class), mock(AdminAuth.class), addresses);
        ReflectionTestUtils.setField(controller, "perIpPerDay", 3);
        ReflectionTestUtils.invokeMethod(controller, "initLimit");
        return MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new CookieExceptionHandler()).build();
    }

    private MockMvc feedbackMvc() {
        FeedbackRepository feedbacks = mock(FeedbackRepository.class);
        when(feedbacks.save(any())).thenAnswer(i -> {
            Feedback f = i.getArgument(0);
            ReflectionTestUtils.setField(f, "id", 1L);
            return f;
        });
        FeedbackEvents events = mock(FeedbackEvents.class);
        when(events.publish(anyLong())).thenReturn(true);
        AuthService auth = mock(AuthService.class);
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        FeedbackController controller = new FeedbackController(feedbacks, events, mock(FeedbackProcessor.class), auth, addresses);
        ReflectionTestUtils.setField(controller, "perIpPerDay", 2);
        ReflectionTestUtils.invokeMethod(controller, "initLimit");
        return MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new CookieExceptionHandler()).build();
    }

    private ResultActions report(MockMvc mvc, String visitor, String questionId, String forwardedFor) throws Exception {
        return mvc.perform(post("/api/v1/reports").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", forwardedFor)
                .content(json.writeValueAsString(Map.of("visitorId", visitor, "path", "/exam/ip-limit",
                        "questionId", questionId, "kind", "typo"))));
    }

    private ResultActions feedback(MockMvc mvc, String visitor, String forwardedFor) throws Exception {
        return mvc.perform(post("/api/v1/feedback").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", forwardedFor)
                .content(json.writeValueAsString(Map.of("kind", "bug", "title", "제목 " + visitor, "content", "내용",
                        "visitorId", visitor))));
    }

    @Test
    void rotatingVisitorIdsDoesNotBypassTheReportLimitPerNetwork() throws Exception {
        MockMvc mvc = reportMvc();
        for (int i = 1; i <= 3; i++) {
            report(mvc, "report-v" + i, "q" + i, "198.51.100." + i + ", 10.30.0.1").andExpect(status().isOk());
        }
        report(mvc, "report-v4", "q4", "198.51.100.4, 10.30.0.1")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("REPORT_DAILY_LIMIT"));
        // 다른 곳에서는 그대로 보낼 수 있다
        report(mvc, "report-v5", "q5", "10.30.0.2").andExpect(status().isOk());
    }

    @Test
    void rotatingVisitorIdsDoesNotBypassTheFeedbackLimitPerNetwork() throws Exception {
        MockMvc mvc = feedbackMvc();
        feedback(mvc, "feedback-v1", "10.40.0.1").andExpect(status().isOk());
        feedback(mvc, "feedback-v2", "203.0.113.9, 10.40.0.1").andExpect(status().isOk());
        feedback(mvc, "feedback-v3", "203.0.113.10, 10.40.0.1")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("FEEDBACK_DAILY_LIMIT"));
        feedback(mvc, "feedback-v4", "10.40.0.2").andExpect(status().isOk());
    }
}
