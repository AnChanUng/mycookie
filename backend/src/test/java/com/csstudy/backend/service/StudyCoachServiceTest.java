package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.http.MediaType;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
import static org.junit.jupiter.api.Assertions.*;

class StudyCoachServiceTest {
    final ObjectMapper json = new ObjectMapper();
    final StudyCoachService.Goal goal = new StudyCoachService.Goal("backend", 7, 60);
    @Test void acceptsOnlyCompleteKnownSubjects() throws Exception {
        var p = StudyCoachService.validatedPlan(json.readTree("{\"subjects\":[\"db\",\"net\",\"os\",\"pl\",\"ds\"],\"summary\":\"기본 개념을 복습하세요.\"}"), goal);
        assertEquals(5, p.subjects().size());
        for (String ids : new String[]{"[\"db\",\"fake\"]", "[\"db\",\"db\"]", "[]", "[\"db\"]"})
            assertThrows(IllegalArgumentException.class, () -> StudyCoachService.validatedPlan(json.readTree("{\"subjects\":" + ids + ",\"summary\":\"복습\"}"), goal));
        assertThrows(IllegalArgumentException.class, () -> StudyCoachService.validatedPlan(json.readTree("{}"), goal));
    }
    @Test void rejectsInvalidInputsBeforeProviderCall() {
        for (var bad : new StudyCoachService.Goal[]{new StudyCoachService.Goal("free text", 7, 60), new StudyCoachService.Goal("backend", -1, 60), new StudyCoachService.Goal("backend", 7, 0), new StudyCoachService.Goal("backend", 731, 60), new StudyCoachService.Goal(null, 1, 60)})
            assertThrows(ResponseStatusException.class, () -> StudyCoachService.validate(bad));
    }
    @Test void missingKeyIsExplicitNotFakeAiSuccess() {
        var service = new StudyCoachService(json, "", "test-model");
        var error = assertThrows(ResponseStatusException.class, () -> service.plan(1, goal));
        assertEquals(503, error.getStatusCode().value());
    }
    @Test void providerRoundTripAndQuota() throws Exception {
        var service = new StudyCoachService(json, "test-key", "test-model");
        var server = MockRestServiceServer.createServer((RestTemplate) ReflectionTestUtils.getField(service, "http"));
        String text = "{\"subjects\":[\"db\",\"net\",\"os\",\"pl\",\"ds\"],\"summary\":\"기초를 복습하세요.\"}";
        String response = json.writeValueAsString(java.util.Map.of("candidates", java.util.List.of(java.util.Map.of("finishReason", "STOP", "content", java.util.Map.of("parts", java.util.List.of(java.util.Map.of("text", text)))))));
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/test-model:generateContent"))
            .andExpect(header("x-goog-api-key", "test-key"))
            .andExpect(jsonPath("$.contents[0].parts[0].text").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("999999"))))
            .andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        assertEquals(5, service.plan(999999, goal).subjects().size());
        assertEquals(429, assertThrows(ResponseStatusException.class, () -> service.plan(999999, goal)).getStatusCode().value());
        server.verify();
    }
}
