package com.csstudy.backend;

import com.csstudy.backend.entity.Feedback;
import com.csstudy.backend.repository.FeedbackRepository;
import com.csstudy.backend.service.GitHubIssueClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedbackTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FeedbackRepository feedbacks;
    @MockitoBean GitHubIssueClient github;

    @BeforeEach
    void setUp() {
        feedbacks.deleteAll();
        reset(github);
    }

    private ResultActions send(Map<String, String> body) throws Exception {
        return mvc.perform(post("/api/v1/feedback").contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", "JUnit").content(json.writeValueAsString(body)));
    }

    @SuppressWarnings("unchecked")
    @Test
    void bugBecomesLabeledIssueWithoutLiveMentions() throws Exception {
        when(github.enabled()).thenReturn(true);
        when(github.create(anyString(), anyString(), anyList())).thenReturn(new GitHubIssueClient.Issue(42, "https://github.com/x/y/issues/42"));

        send(Map.of("kind", "bug", "title", "채점이\n이상해요 @someone", "content", "#1 문제 정답이 @admin 틀림",
                "visitorId", "v-1", "path", "/exam/kdb"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.issue").value(42));

        ArgumentCaptor<String> title = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<List<String>> labels = ArgumentCaptor.forClass(List.class);
        verify(github).create(title.capture(), body.capture(), labels.capture());
        assertThat(title.getValue()).startsWith("[버그] 채점이 이상해요").doesNotContain("\n").doesNotContain("@someone");
        assertThat(labels.getValue()).containsExactly("버그");
        assertThat(body.getValue()).contains("/exam/kdb").doesNotContain("@admin").doesNotContain("#1 ").doesNotContain("v-1");

        Feedback saved = feedbacks.findAll().get(0);
        assertThat(saved.getIssueNumber()).isEqualTo(42);
        assertThat(saved.getTitle()).isEqualTo("채점이 이상해요 @someone");
    }

    @Test
    void featureRequestIsKeptEvenWhenGitHubIsOffOrFails() throws Exception {
        when(github.enabled()).thenReturn(false);
        send(Map.of("kind", "feature", "title", "다크 모드", "content", "있으면 좋겠어요", "visitorId", "v-2"))
                .andExpect(status().isOk());
        verify(github, never()).create(anyString(), anyString(), anyList());

        when(github.enabled()).thenReturn(true);
        when(github.create(anyString(), anyString(), anyList())).thenThrow(new IllegalStateException("down"));
        send(Map.of("kind", "feature", "title", "타이머", "content", "시험 타이머", "visitorId", "v-2"))
                .andExpect(status().isOk());
        verify(github).create(startsWith("[기능개발] "), anyString(), eq(List.of("기능개발")));
        assertThat(feedbacks.count()).isEqualTo(2);
    }

    @Test
    void rejectsBadInputAndLimitsPerVisitor() throws Exception {
        send(Map.of("kind", "spam", "title", "a", "content", "b", "visitorId", "v-3")).andExpect(status().isBadRequest());
        send(Map.of("kind", "bug", "title", " ", "content", "b", "visitorId", "v-3")).andExpect(status().isBadRequest());
        for (int i = 0; i < 5; i++) {
            send(Map.of("kind", "bug", "title", "t" + i, "content", "c", "visitorId", "v-3")).andExpect(status().isOk());
        }
        send(Map.of("kind", "bug", "title", "t6", "content", "c", "visitorId", "v-3")).andExpect(status().isTooManyRequests());
        send(Map.of("kind", "bug", "title", "t6", "content", "c", "visitorId", "v-4")).andExpect(status().isOk());
    }
}
