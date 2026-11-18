package com.csstudy.backend;

import com.csstudy.backend.entity.NewsletterSubscriber;
import com.csstudy.backend.repository.NewsletterSubscriberRepository;
import com.csstudy.backend.service.MailService;
import com.csstudy.backend.service.NewsletterLetter;
import com.csstudy.backend.service.NewsletterService;
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

import java.time.LocalDate;
import java.util.Arrays;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NewsletterTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired NewsletterLetter letters;
    @Autowired NewsletterService newsletter;
    @Autowired NewsletterSubscriberRepository subscribers;
    @MockitoBean MailService mail;

    @BeforeEach
    void mailServerReady() {
        when(mail.configured()).thenReturn(true);
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mvc.perform(post("/api/v1/newsletter/" + path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private String confirmToken(String email) {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).send(eq(email), contains("구독을 확인"), body.capture());
        Matcher m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(body.getValue());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    private void subscribed(String email) throws Exception {
        postJson("subscribe", Map.of("email", email)).andExpect(status().isOk());
        postJson("confirm", Map.of("token", confirmToken(email))).andExpect(status().isOk());
    }

    @Test
    void everyLetterIsAtLeastFiftyLinesWithAStudyButton() {
        assertThat(letters.size()).isGreaterThanOrEqualTo(50);
        for (int i = 0; i < letters.size(); i++) {
            NewsletterLetter.Letter letter = letters.build(i, "https://mycookie.dev", "https://mycookie.dev/newsletter/unsubscribe?key=k");
            long lines = Arrays.stream(letter.text().split("\n")).filter(l -> !l.isBlank()).count();
            assertThat(lines).as("letter %d (%s)", i, letter.subject()).isGreaterThanOrEqualTo(50);
            assertThat(letter.text()).contains("문제 풀러 가기: https://mycookie.dev/web-essentials#web-").contains("수신 거부");
            assertThat(letter.html()).contains("문제 풀러 가기").contains("href=\"https://mycookie.dev/web-essentials#web-")
                    .doesNotContain("**").doesNotContain("<script");
        }
    }

    @Test
    void confirmingSendsTheFirstLetterRightAway() throws Exception {
        subscribed("reader@example.com");
        verify(mail).send(eq("reader@example.com"), startsWith("[나의쿠키]"), contains("문제 풀러 가기"), contains("<a href"), contains("/newsletter/unsubscribe?key="));
        NewsletterSubscriber s = subscribers.findAll().stream().filter(x -> x.getEmail().equals("reader@example.com")).findFirst().orElseThrow();
        assertThat(s.getStatus()).isEqualTo(NewsletterSubscriber.Status.ACTIVE);
        assertThat(s.getNextIndex()).isEqualTo(1);
        // 확인 링크는 한 번만
        postJson("confirm", Map.of("token", "nope")).andExpect(status().isBadRequest());
    }

    @Test
    void notConfirmedOrUnsubscribedAddressesGetNoLetters() throws Exception {
        postJson("subscribe", Map.of("email", "pending@example.com")).andExpect(status().isOk());
        subscribed("leaving@example.com");
        String key = subscribers.findAll().stream().filter(x -> x.getEmail().equals("leaving@example.com")).findFirst().orElseThrow().getUnsubscribeKey();
        postJson("unsubscribe", Map.of("key", key)).andExpect(status().isOk());
        postJson("unsubscribe", Map.of("key", "wrong")).andExpect(status().isBadRequest());
        postJson("subscribe", Map.of("email", "bad")).andExpect(status().isBadRequest());

        clearInvocations(mail);
        newsletter.sendDue(LocalDate.now().plusDays(30));
        verify(mail, never()).send(eq("pending@example.com"), anyString(), anyString(), anyString(), anyString());
        verify(mail, never()).send(eq("leaving@example.com"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void dailySendGoesOncePerDayToEachActiveSubscriber() throws Exception {
        subscribed("daily@example.com");
        LocalDate day = LocalDate.now().plusDays(60);
        clearInvocations(mail);
        newsletter.sendDue(day);
        newsletter.sendDue(day);
        verify(mail, times(1)).send(eq("daily@example.com"), anyString(), anyString(), anyString(), anyString());
        newsletter.sendDue(day.plusDays(1));
        verify(mail, times(2)).send(eq("daily@example.com"), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void subscribingIsClosedWithoutAMailServer() throws Exception {
        when(mail.configured()).thenReturn(false);
        postJson("subscribe", Map.of("email", "early@example.com")).andExpect(status().isServiceUnavailable());
    }
}
