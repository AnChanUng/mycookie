package com.csstudy.backend;

import com.csstudy.backend.entity.Feedback;
import com.csstudy.backend.repository.FeedbackRepository;
import com.csstudy.backend.service.GitHubIssueClient;
import com.csstudy.backend.service.MattermostService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.kafka.KafkaContainer;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 실제 Kafka를 띄워 제보 → 이벤트 → 소비자(GitHub 이슈, Mattermost 알림) 흐름을 확인한다(Docker가 없으면 건너뛴다)
@SpringBootTest(properties = {"app.kafka.enabled=true", "app.kafka.topic-prefix=test"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Testcontainers(disabledWithoutDocker = true)
class KafkaFeedbackFlowTest {

    @Container
    static final KafkaContainer KAFKA = new KafkaContainer("apache/kafka:3.9.1");

    @DynamicPropertySource
    static void kafka(DynamicPropertyRegistry registry) {
        registry.add("spring.kafka.bootstrap-servers", KAFKA::getBootstrapServers);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FeedbackRepository feedbacks;
    @MockitoBean GitHubIssueClient github;
    @MockitoBean MattermostService mattermost;

    @Test
    void feedbackIsQueuedThenConsumerCreatesIssueAndNotifiesOnce() throws Exception {
        when(github.enabled()).thenReturn(true);
        when(mattermost.enabled()).thenReturn(true);
        when(github.create(anyString(), anyString(), anyList())).thenReturn(new GitHubIssueClient.Issue(7, "https://github.com/x/y/issues/7"));
        // 첫 알림은 실패시켜 Kafka가 다시 시도하게 한다. 이슈는 한 번만 만들어져야 한다
        when(mattermost.postNotice(anyString())).thenThrow(new IllegalStateException("mattermost down")).thenReturn(true);

        mvc.perform(post("/api/v1/feedback").contentType(MediaType.APPLICATION_JSON).header("User-Agent", "JUnit")
                        .content(json.writeValueAsString(Map.of("kind", "bug", "title", "채점 오류 @channel",
                                "content", "정답이 이상해요", "visitorId", "kafka-1", "path", "/exam"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.queued").value(true));

        verify(mattermost, timeout(60_000).times(2)).postNotice(argThat(text -> text.contains("새 버그 제보")
                && text.contains("issues/7") && !text.contains("@channel")));
        verify(github, times(1)).create(startsWith("[버그] "), anyString(), anyList());

        Feedback saved = feedbacks.findAll().stream().filter(f -> "kafka-1".equals(f.getVisitorId())).findFirst().orElseThrow();
        assertThat(saved.getIssueNumber()).isEqualTo(7);
        assertThat(saved.getNotifiedAt()).isNotNull();
    }
}
