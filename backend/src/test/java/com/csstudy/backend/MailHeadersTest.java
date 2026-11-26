package com.csstudy.backend;

import com.csstudy.backend.service.MailFailures;
import com.csstudy.backend.service.MailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

// 스팸함에 덜 가도록 보내는 사람 이름과 Message-ID 도메인을 맞추는지 본다
class MailHeadersTest {

    @SuppressWarnings("unchecked")
    private MimeMessage sent(String from) {
        JavaMailSenderImpl smtp = spy(new JavaMailSenderImpl());
        smtp.setSession(Session.getInstance(new Properties()));
        doNothing().when(smtp).send(any(MimeMessage.class));
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(smtp);
        MailService mail = new MailService(provider, mock(MailFailures.class), mock(ApplicationEventPublisher.class),
                mock(ObjectProvider.class), new ObjectMapper(), from, false, "smtp.example.com", false, false, "test");
        mail.deliver(new MailService.Mail("someone@example.org", "[나의쿠키] 이메일 인증", "본문", null, null));
        var captor = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(smtp).send(captor.capture());
        MimeMessage message = captor.getValue();
        // 실제 발송(JavaMailSenderImpl)은 보내기 직전에 saveChanges로 Message-ID를 만든다. 발송을 막았으니 직접 부른다
        try { message.saveChanges(); } catch (jakarta.mail.MessagingException e) { throw new IllegalStateException(e); }
        return message;
    }

    @Test
    void addsSenderNameAndUsesSenderDomainForMessageId() throws Exception {
        MimeMessage message = sent("no-reply@mycookie.dev");
        InternetAddress from = (InternetAddress) message.getFrom()[0];
        assertThat(from.getAddress()).isEqualTo("no-reply@mycookie.dev");
        assertThat(from.getPersonal()).isEqualTo("나의쿠키");
        assertThat(message.getHeader("Message-ID")[0]).endsWith("@mycookie.dev>");
        assertThat(message.getHeader("Auto-Submitted")[0]).isEqualTo("auto-generated");
    }

    @Test
    void keepsNameAlreadyGivenInMailFrom() throws Exception {
        MimeMessage message = sent("쿠키 알림 <cookie@example.com>");
        InternetAddress from = (InternetAddress) message.getFrom()[0];
        assertThat(from.getPersonal()).isEqualTo("쿠키 알림");
        assertThat(message.getHeader("Message-ID")[0]).endsWith("@example.com>");
    }
}
