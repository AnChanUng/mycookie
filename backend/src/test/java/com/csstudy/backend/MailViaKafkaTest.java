package com.csstudy.backend;

import com.csstudy.backend.service.MailDelivery;
import com.csstudy.backend.service.MailFailures;
import com.csstudy.backend.service.MailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.Properties;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// MAIL_VIA_KAFKA: 켜져 있으면 메일을 Kafka 이벤트로 넘기고, Kafka가 없거나 넣지 못하면 서버 안에서 바로 보낸다
class MailViaKafkaTest {

    final ObjectMapper json = new ObjectMapper();
    final JavaMailSender smtp = mock(JavaMailSender.class);
    final MailFailures failures = mock(MailFailures.class);
    final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    @SuppressWarnings("unchecked")
    final KafkaTemplate<String, String> template = mock(KafkaTemplate.class);

    @SuppressWarnings("unchecked")
    private MailService service(boolean kafkaEnabled, boolean viaKafka, KafkaTemplate<String, String> kafkaTemplate) {
        ObjectProvider<JavaMailSender> senderProvider = mock(ObjectProvider.class);
        when(senderProvider.getIfAvailable()).thenReturn(smtp);
        ObjectProvider<KafkaTemplate<String, String>> kafkaProvider = mock(ObjectProvider.class);
        when(kafkaProvider.getIfAvailable()).thenReturn(kafkaTemplate);
        when(smtp.createMimeMessage()).thenAnswer(i -> new MimeMessage(Session.getInstance(new Properties())));
        return new MailService(senderProvider, failures, events, kafkaProvider, json, "noreply@example.com", false, "smtp.test",
                kafkaEnabled, viaKafka, "test");
    }

    @Test
    void publishesToKafkaWhenEnabledAndDoesNotSendDirectly() throws Exception {
        when(template.send(anyString(), anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(mock(SendResult.class)));
        MailService mail = service(true, true, template);
        mail.send("reader@example.com", "[나의쿠키] 제목", "본문", "<p>본문</p>", "https://mycookie.dev/u");

        ArgumentCaptor<String> payload = ArgumentCaptor.forClass(String.class);
        verify(template).send(eq("test.mail.send"), eq("reader@example.com"), payload.capture());
        MailService.Mail sent = json.readValue(payload.getValue(), MailService.Mail.class);
        assertThat(sent).isEqualTo(new MailService.Mail("reader@example.com", "[나의쿠키] 제목", "본문", "<p>본문</p>", "https://mycookie.dev/u"));
        Thread.sleep(200);
        verify(smtp, never()).send(any(MimeMessage.class));

        // 소비자가 받으면 실제로 보낸다
        mail.deliver(sent);
        verify(smtp).send(any(MimeMessage.class));
        verify(events).publishEvent(new MailDelivery("reader@example.com", "[나의쿠키] 제목", null));
    }

    @Test
    void fallsBackToDirectSendWhenKafkaIsOffOrFails() throws Exception {
        // 스위치가 꺼져 있으면 Kafka를 쓰지 않는다
        MailService off = service(true, false, template);
        off.send("a@example.com", "[나의쿠키] 제목", "본문");
        verify(smtp, timeout(2000)).send(any(MimeMessage.class));
        verify(template, never()).send(anyString(), anyString(), anyString());

        // 스위치는 켰지만 Kafka 자체가 꺼져 있으면 바로 보낸다
        reset(smtp);
        MailService kafkaDown = service(false, true, template);
        kafkaDown.send("b@example.com", "[나의쿠키] 제목", "본문");
        verify(smtp, timeout(2000)).send(any(MimeMessage.class));

        // Kafka에 넣지 못하면 바로 보낸다
        reset(smtp);
        when(template.send(anyString(), anyString(), anyString())).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("broker down")));
        MailService failing = service(true, true, template);
        failing.send("c@example.com", "[나의쿠키] 제목", "본문");
        verify(smtp, timeout(2000)).send(any(MimeMessage.class));
    }

    @Test
    void deliverRecordsFailureInsteadOfThrowing() {
        MailService mail = service(false, false, null);
        doThrow(new org.springframework.mail.MailSendException("550 no such user")).when(smtp).send(any(MimeMessage.class));
        mail.deliver(new MailService.Mail("x@example.com", "[나의쿠키] 제목", "본문", null, null));
        verify(failures).record(eq("x@example.com"), eq("[나의쿠키] 제목"), any(Exception.class));
    }
}
