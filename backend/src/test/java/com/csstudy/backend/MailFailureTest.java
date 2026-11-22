package com.csstudy.backend;

import com.csstudy.backend.entity.MailFailure;
import com.csstudy.backend.entity.NewsletterSubscriber;
import com.csstudy.backend.repository.MailFailureRepository;
import com.csstudy.backend.repository.NewsletterSubscriberRepository;
import com.csstudy.backend.service.NewsletterService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Properties;
import java.util.function.BooleanSupplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 메일 발송이 실패하면 어떤 메일이 왜 실패했는지 기록하고, 학습 메일은 보낸 것으로 치지 않고 되감아 다시 보낸다
@SpringBootTest(properties = {"spring.mail.host=smtp.test", "management.health.mail.enabled=false", "app.admin-key=test-admin-key-0123456789abcdef-xyz"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MailFailureTest {

    static final String KEY = "test-admin-key-0123456789abcdef-xyz";

    @Autowired MockMvc mvc;
    @Autowired NewsletterService newsletter;
    @Autowired NewsletterSubscriberRepository subscribers;
    @Autowired MailFailureRepository failures;
    @MockitoBean JavaMailSender smtp;

    @BeforeEach
    void clean() {
        failures.deleteAll();
        subscribers.deleteAll();
        when(smtp.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
    }

    private void smtpFails() {
        doThrow(new MailSendException("550 5.1.1 The email account that you tried to reach does not exist")).when(smtp).send(any(MimeMessage.class));
    }

    // 발송은 별도 스레드에서 일어나므로 조건이 맞을 때까지 잠시 기다린다
    private static void waitFor(BooleanSupplier condition) throws InterruptedException {
        for (int i = 0; i < 100 && !condition.getAsBoolean(); i++) Thread.sleep(50);
        assertThat(condition.getAsBoolean()).as("기다리던 결과").isTrue();
    }

    private NewsletterSubscriber activeSubscriber(String email) {
        return subscribers.save(NewsletterSubscriber.builder().email(email).status(NewsletterSubscriber.Status.ACTIVE)
                .unsubscribeKey("key-" + email).nextIndex(0).build());
    }

    @Test
    void failedCodeMailIsRecordedWithRecipientKindAndReason() throws Exception {
        smtpFails();
        newsletter.subscribe("nobody@example.com");
        waitFor(() -> failures.count() == 1);
        MailFailure f = failures.findAll().get(0);
        assertThat(f.getRecipient()).isEqualTo("nobody@example.com");
        assertThat(f.getKind()).isEqualTo("인증 번호");
        assertThat(f.getSubject()).startsWith("[나의쿠키] 학습 메일 인증 번호");
        assertThat(f.getReason()).contains("MailSendException").contains("550");
        // 본문(인증 번호 자체)은 기록에 남기지 않는다
        assertThat(f.getSubject() + f.getReason()).doesNotContain("구독 창에");
    }

    @Test
    void adminSeesCountsByKindAndTheFailedMails() throws Exception {
        failures.save(MailFailure.builder().at(Instant.now()).recipient("a@example.com").kind("학습 메일").subject("[나의쿠키] 오늘의 학습 #3 | 주제").reason("MailSendException: 550").build());
        failures.save(MailFailure.builder().at(Instant.now().minusSeconds(3 * 86400)).recipient("b@example.com").kind("인증 번호").subject("[나의쿠키] 학습 메일 인증 번호 123456").reason("MailConnectException: timeout").build());
        failures.save(MailFailure.builder().at(Instant.now().minusSeconds(40L * 86400)).recipient("old@example.com").kind("기타").subject("옛 실패").reason("x").build());

        mvc.perform(get("/api/v1/admin/mail-failures")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/mail-failures").header("X-Admin-Key", KEY)).andExpect(status().isOk())
                .andExpect(jsonPath("$.last24h").value(1))
                .andExpect(jsonPath("$.last7d").value(2))
                .andExpect(jsonPath("$.last30d").value(2))
                .andExpect(jsonPath("$.byKind['학습 메일']").value(1))
                .andExpect(jsonPath("$.byKind['인증 번호']").value(1))
                .andExpect(jsonPath("$.recent[?(@.to == 'a@example.com')].subject").value("[나의쿠키] 오늘의 학습 #3 | 주제"));
    }

    @Test
    void failedLearningLetterIsRewoundAndSentAgainThenResetOnSuccess() throws Exception {
        activeSubscriber("reader@example.com");
        LocalDate day = LocalDate.now().plusDays(30);
        smtpFails();
        newsletter.sendDue(day);
        // 실패하면 보낸 것으로 치지 않는다: 세트 번호를 되돌리고 다시 보낼 수 있게 둔다
        waitFor(() -> failures.count() == 1);
        waitFor(() -> subscribers.findAll().get(0).getDeliveryFailures() != null);
        NewsletterSubscriber s = subscribers.findAll().get(0);
        assertThat(s.getDeliveryFailures()).isEqualTo(1);
        assertThat(s.getSetsSent()).isZero();
        assertThat(s.getLastSentOn()).isNull();
        assertThat(failures.findAll().get(0).getKind()).isEqualTo("학습 메일");

        // 서버가 살아나면 같은 1번 세트가 다시 간다(재시도)
        reset(smtp);
        when(smtp.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        newsletter.retryFailed();
        waitFor(() -> subscribers.findAll().get(0).getDeliveryFailures() == null);
        s = subscribers.findAll().get(0);
        assertThat(s.getSetsSent()).isEqualTo(1);
        assertThat(s.getLastSentOn()).isNotNull();
        verify(smtp, atLeastOnce()).send(any(MimeMessage.class));
        assertThat(failures.count()).isEqualTo(1);
    }

    @Test
    void afterThreeFailuresInARowItStopsRetryingForTheDay() throws Exception {
        activeSubscriber("bounce@example.com");
        smtpFails();
        LocalDate day = LocalDate.now().plusDays(60);
        for (int i = 1; i <= 3; i++) {
            newsletter.sendDue(day);
            int expected = i;
            waitFor(() -> failures.count() == expected);
            waitFor(() -> subscribers.findAll().get(0).getDeliveryFailures() != null && subscribers.findAll().get(0).getDeliveryFailures() == expected);
        }
        // 3번째 실패에서는 같은 날 다시 시도하지 않도록 보낸 날짜를 남겨 둔다(세트 번호는 되돌려 다음 날 같은 세트를 보낸다)
        NewsletterSubscriber s = subscribers.findAll().get(0);
        assertThat(s.getSetsSent()).isZero();
        assertThat(s.getLastSentOn()).isNotNull();
        int before = (int) failures.count();
        newsletter.sendDue(day);
        Thread.sleep(300);
        assertThat(failures.count()).isEqualTo(before);
    }
}
