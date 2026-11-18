package com.csstudy.backend;

import com.csstudy.backend.entity.Question;
import com.csstudy.backend.repository.QuestionRepository;
import com.csstudy.backend.repository.ScheduledPostRepository;
import com.csstudy.backend.service.MattermostService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
class MattermostDailyTest {

    @Autowired QuestionRepository questions;
    @Autowired ScheduledPostRepository posts;

    @Test
    void postsOncePerDayAndRetriesAfterFailure() {
        if (questions.count() == 0) {
            questions.save(Question.builder().title("프로세스와 스레드의 차이").content("c").answer("a")
                    .difficulty(com.csstudy.backend.entity.Difficulty.BASIC).build());
        }
        RestTemplate http = mock(RestTemplate.class);
        MattermostService off = new MattermostService(questions, posts, http, " ", "https://mycookie.dev");
        assertThat(off.postDaily(LocalDate.of(2026, 1, 5))).isFalse();
        verifyNoInteractions(http);

        MattermostService mm = new MattermostService(questions, posts, http, "https://mm.example/hooks/x", "https://mycookie.dev/");
        LocalDate day = LocalDate.of(2026, 1, 6);
        when(http.postForEntity(anyString(), any(), eq(String.class))).thenThrow(new RestClientException("down"));
        assertThat(mm.postDaily(day)).isFalse();

        reset(http);
        assertThat(mm.postDaily(day)).isTrue();
        assertThat(mm.postDaily(day)).isFalse();
        var body = org.mockito.ArgumentCaptor.forClass(HttpEntity.class);
        verify(http, times(1)).postForEntity(eq("https://mm.example/hooks/x"), body.capture(), eq(String.class));
        String text = (String) ((Map<?, ?>) body.getValue().getBody()).get("text");
        assertThat(text).contains("오늘의 CS 면접 질문").contains("https://mycookie.dev/question/").doesNotContain("mycookie.dev//");
    }
}
