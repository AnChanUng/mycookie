package com.csstudy.backend;

import com.csstudy.backend.entity.NewsletterSubscriber;
import com.csstudy.backend.repository.NewsletterSubscriberRepository;
import com.csstudy.backend.service.MailService;
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

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 구독자 정원(구독 중 + 확인 대기)을 넘으면 새 신청을 받지 않는다
@SpringBootTest(properties = "app.newsletter.max-subscribers=3")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NewsletterCapTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired NewsletterSubscriberRepository subscribers;
    @MockitoBean MailService mail;

    @BeforeEach
    void clean() {
        subscribers.deleteAll();
        when(mail.configured()).thenReturn(true);
        clearInvocations(mail);
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mvc.perform(post("/api/v1/newsletter/" + path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    private String tokenFor(String email) {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).send(eq(email), contains("구독을 확인"), body.capture());
        Matcher m = Pattern.compile("token=([A-Za-z0-9_-]+)").matcher(body.getValue());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    @Test
    void newSignupsAreRefusedOnceSeatsAreTaken() throws Exception {
        for (String e : new String[]{"a@example.com", "b@example.com"}) {
            postJson("subscribe", Map.of("email", e)).andExpect(status().isOk());
            postJson("confirm", Map.of("token", tokenFor(e))).andExpect(status().isOk());
        }
        // 세 번째 자리는 확인 대기도 자리를 차지한다
        postJson("subscribe", Map.of("email", "c@example.com")).andExpect(status().isOk());
        postJson("subscribe", Map.of("email", "d@example.com")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NEWSLETTER_FULL"));
        assertThat(subscribers.findAll()).noneMatch(x -> x.getEmail().equals("d@example.com"));

        // 이미 구독 중인 사람의 재신청은 오류 없이 넘어가고, 자리를 잡은 신청은 다시 보낼 수 있다
        postJson("subscribe", Map.of("email", "a@example.com")).andExpect(status().isOk());
        NewsletterSubscriber c = subscribers.findAll().stream().filter(x -> x.getEmail().equals("c@example.com")).findFirst().orElseThrow();
        c.setConfirmSentAt(c.getConfirmSentAt().minusMinutes(5));
        subscribers.save(c);
        postJson("subscribe", Map.of("email", "c@example.com")).andExpect(status().isOk());

        // 확인을 마치면 정원이 다 찬다
        postJson("confirm", Map.of("token", tokenFor("c@example.com"))).andExpect(status().isOk());
        assertThat(subscribers.countByStatus(NewsletterSubscriber.Status.ACTIVE)).isEqualTo(3);
        postJson("subscribe", Map.of("email", "d@example.com")).andExpect(status().isConflict());
    }

    @Test
    void aSeatOpensUpWhenSomeoneUnsubscribes() throws Exception {
        for (String e : new String[]{"a@example.com", "b@example.com", "c@example.com"}) {
            postJson("subscribe", Map.of("email", e)).andExpect(status().isOk());
            postJson("confirm", Map.of("token", tokenFor(e))).andExpect(status().isOk());
        }
        postJson("subscribe", Map.of("email", "d@example.com")).andExpect(status().isConflict());
        String key = subscribers.findAll().stream().filter(x -> x.getEmail().equals("a@example.com")).findFirst().orElseThrow().getUnsubscribeKey();
        postJson("unsubscribe", Map.of("key", key)).andExpect(status().isOk());
        postJson("subscribe", Map.of("email", "d@example.com")).andExpect(status().isOk());
    }
}
