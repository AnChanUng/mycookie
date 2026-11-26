package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

// 메일 발송. spring.mail.host(MAIL_HOST)가 있으면 그 SMTP 서버로 보낸다(온프레미스 메일 서버, 회사 SMTP 릴레이 등).
// 응답 시간으로 가입 여부가 드러나지 않게 발송은 요청 스레드 밖에서 한다.
// MAIL_VIA_KAFKA=true이고 Kafka가 켜져 있으면 "mail.send" 이벤트로 넘기고 소비자가 보낸다(서버가 여러 대여도 나눠 보내고, 재시작해도 남은 메일을 이어서 보낸다).
// Kafka가 꺼져 있거나 넣지 못하면 지금처럼 서버 안의 발송 스레드가 바로 보낸다
@Slf4j
@Service
public class MailService {

    /** Kafka로 넘기는 메일 한 통. */
    public record Mail(String to, String subject, String text, String html, String unsubscribeUrl) {}

    private final ObjectProvider<JavaMailSender> sender;
    private final MailFailures failures;
    private final ApplicationEventPublisher events;
    private final ObjectProvider<KafkaTemplate<String, String>> kafka;
    private final ObjectMapper json;
    private final String from;
    private final boolean logLinks;
    private final boolean hostSet;
    private final boolean viaKafka;
    private final String topic;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "mail-sender");
        t.setDaemon(true);
        return t;
    });

    public MailService(ObjectProvider<JavaMailSender> sender, MailFailures failures, ApplicationEventPublisher events,
                       ObjectProvider<KafkaTemplate<String, String>> kafka, ObjectMapper json,
                       @Value("${app.mail.from:}") String from,
                       @Value("${app.mail.log-links:false}") boolean logLinks,
                       @Value("${spring.mail.host:}") String host,
                       @Value("${app.kafka.enabled:false}") boolean kafkaEnabled,
                       @Value("${app.mail.via-kafka:false}") boolean viaKafka,
                       @Value("${app.kafka.topic-prefix:local}") String prefix) {
        this.hostSet = !host.isBlank();
        this.sender = sender;
        this.failures = failures;
        this.events = events;
        this.kafka = kafka;
        this.json = json;
        this.from = from;
        this.logLinks = logLinks;
        this.viaKafka = kafkaEnabled && viaKafka;
        this.topic = topic(prefix);
    }

    public static String topic(String prefix) { return prefix + ".mail.send"; }

    public boolean configured() {
        // MAIL_HOST가 빈 값이어도 스프링이 메일 발송기를 만들 수 있어 주소로 판단한다
        return hostSet && sender.getIfAvailable() != null;
    }

    public void send(String to, String subject, String body) {
        send(to, subject, body, null, null);
    }

    // html이 있으면 글자 본문과 함께 보낸다(메일 앱이 고른다). unsubscribeUrl은 메일 앱의 "수신 거부" 버튼이 쓴다
    public void send(String to, String subject, String text, String html, String unsubscribeUrl) {
        if (!configured()) {
            // 메일 서버가 없는 개발 환경: 링크를 로그로 확인한다(운영에서는 MAIL_LOG_LINKS를 켜지 않는다)
            if (logLinks) log.info("[메일 미설정] to={} subject={}\n{}", to, subject, text);
            else log.warn("메일 서버(MAIL_HOST)가 설정되지 않아 '{}' 메일을 보내지 못했습니다", subject);
            return;
        }
        Mail mail = new Mail(to, subject, text, html, unsubscribeUrl);
        if (publish(mail)) return;
        worker.execute(() -> deliver(mail));
    }

    // Kafka로 넘긴다. 넘겼으면 true, Kafka를 안 쓰거나 실패하면 false(호출한 쪽이 바로 보낸다)
    private boolean publish(Mail mail) {
        KafkaTemplate<String, String> template = viaKafka ? kafka.getIfAvailable() : null;
        if (template == null) return false;
        try {
            // 키를 받는 주소로 두어 같은 사람에게 가는 메일은 순서대로 보낸다
            template.send(topic, mail.to(), json.writeValueAsString(mail)).get(5, TimeUnit.SECONDS);
            return true;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("메일을 Kafka에 넣지 못해 바로 보냅니다: subject={} reason={}", mail.subject(), MailFailures.reasonOf(e));
            return false;
        }
    }

    /** 실제 SMTP 발송. 발송 스레드나 Kafka 소비자가 부른다. 실패해도 예외를 던지지 않고 기록과 결과 이벤트로 알린다. */
    public void deliver(Mail mail) {
        JavaMailSender smtp = configured() ? sender.getIfAvailable() : null;
        if (smtp == null) {
            log.warn("메일 서버(MAIL_HOST)가 설정되지 않아 '{}' 메일을 보내지 못했습니다", mail.subject());
            return;
        }
        try {
            InternetAddress fromAddress = fromAddress();
            MimeMessage message = newMessage(smtp, fromAddress);
            MimeMessageHelper helper = new MimeMessageHelper(message, mail.html() != null, "UTF-8");
            if (fromAddress != null) helper.setFrom(fromAddress);
            helper.setTo(mail.to());
            helper.setSubject(mail.subject());
            if (mail.html() != null) helper.setText(mail.text(), mail.html());
            else helper.setText(mail.text());
            // 사람이 아니라 서버가 보낸 메일임을 알린다(자동 응답 · 부재중 답장이 돌아오지 않게)
            message.setHeader("Auto-Submitted", "auto-generated");
            if (mail.unsubscribeUrl() != null) {
                message.setHeader("List-Unsubscribe", "<" + mail.unsubscribeUrl() + ">");
            }
            smtp.send(message);
            events.publishEvent(new MailDelivery(mail.to(), mail.subject(), null));
        } catch (Exception e) {
            // 받는 주소는 로그에 쓰지 않고, 실패 기록(30일 보관)에만 남긴다
            log.warn("메일 발송 실패: subject={} reason={}", mail.subject(), MailFailures.reasonOf(e));
            failures.record(mail.to(), mail.subject(), e);
            events.publishEvent(new MailDelivery(mail.to(), mail.subject(), e));
        }
    }

    static final String SENDER_NAME = "나의쿠키";

    // 보내는 사람. MAIL_FROM에 이름이 없으면 "나의쿠키"를 붙인다(주소만 보이는 메일은 스팸 점수가 오른다)
    InternetAddress fromAddress() throws java.io.UnsupportedEncodingException, jakarta.mail.internet.AddressException {
        if (from.isBlank()) return null;
        InternetAddress address = new InternetAddress(from.trim(), true);
        if (address.getPersonal() == null || address.getPersonal().isBlank()) {
            address = new InternetAddress(address.getAddress(), SENDER_NAME, "UTF-8");
        }
        return address;
    }

    // Message-ID를 보내는 사람 도메인으로 만든다. 기본값은 컨테이너 이름(예: …@3f2a1b9c)이라 스팸 필터가 수상하게 본다
    static MimeMessage newMessage(JavaMailSender smtp, InternetAddress sender) {
        String address = sender == null ? null : sender.getAddress();
        int at = address == null ? -1 : address.lastIndexOf('@');
        if (at < 0 || !(smtp instanceof org.springframework.mail.javamail.JavaMailSenderImpl impl)) return smtp.createMimeMessage();
        String domain = address.substring(at + 1);
        return new MimeMessage(impl.getSession()) {
            @Override
            protected void updateMessageID() throws jakarta.mail.MessagingException {
                setHeader("Message-ID", "<" + java.util.UUID.randomUUID() + "@" + domain + ">");
            }
        };
    }
}
