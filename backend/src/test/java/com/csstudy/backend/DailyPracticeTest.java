package com.csstudy.backend;

import com.csstudy.backend.service.NewsletterDailySets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 학습 메일의 "오늘 주제 5문제 더 풀기" 연습 문제: 30세트마다 5문제, 공개 API, 정답이 길이로 짐작되지 않게 출제했는지 검사
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DailyPracticeTest {

    @Autowired MockMvc mvc;
    @Autowired NewsletterDailySets sets;

    @Test
    void everyDailySetHasFiveWellFormedPracticeQuestions() {
        int[] positions = new int[4];
        int longest = 0, shortest = 0, total = 0;
        Set<String> prompts = new HashSet<>();
        for (int day = 1; day <= 30; day++) {
            NewsletterDailySets.DailySet set = sets.find(day).orElseThrow(() -> new AssertionError("세트 없음"));
            List<NewsletterDailySets.Question> practice = set.practice();
            assertThat(practice).as("%d번 세트 연습 문제", day).hasSize(5);
            for (NewsletterDailySets.Question q : practice) {
                total++;
                assertThat(q.options()).hasSize(4).doesNotHaveDuplicates();
                assertThat(q.explanation()).isNotEmpty();
                assertThat(prompts.add(q.prompt())).as("같은 질문이 두 번 나옴: %s", q.prompt()).isTrue();
                // 메일의 문제와 같은 질문을 연습 문제에서 또 묻지 않는다
                assertThat(q.prompt()).isNotEqualTo(set.question().prompt());
                positions[q.answer()]++;
                int max = q.options().stream().mapToInt(String::length).max().orElseThrow();
                int min = q.options().stream().mapToInt(String::length).min().orElseThrow();
                int answerLength = q.options().get(q.answer()).length();
                if (answerLength == max) longest++;
                if (answerLength == min) shortest++;
            }
        }
        assertThat(total).isEqualTo(150);
        // 정답 위치는 고르게, 정답이 가장 길거나 가장 짧은 보기인 문제는 소수만
        for (int count : positions) assertThat(count).isBetween(30, 45);
        assertThat(longest).as("정답이 가장 긴 보기").isLessThanOrEqualTo(30);
        assertThat(shortest).as("정답이 가장 짧은 보기").isLessThanOrEqualTo(60);
    }

    @Test
    void practiceIsPublicAndUnknownDaysAreNotFound() throws Exception {
        mvc.perform(get("/api/v1/daily/1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.day").value(1))
                .andExpect(jsonPath("$.theme").isNotEmpty())
                .andExpect(jsonPath("$.practice.length()").value(5))
                .andExpect(jsonPath("$.practice[0].options.length()").value(4))
                .andExpect(jsonPath("$.practice[0].answer").isNumber())
                .andExpect(jsonPath("$.blog.url").isNotEmpty());
        mvc.perform(get("/api/v1/daily/999")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/daily/0")).andExpect(status().isNotFound());
    }
}
