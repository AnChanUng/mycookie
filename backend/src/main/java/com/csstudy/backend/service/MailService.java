package com.csstudy.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// 메일 발송. spring.mail.host(MAIL_HOST)가 있으면 그 SMTP 서버로 보낸다(온프레미스 메일 서버, 회사 SMTP 릴레이 등).
// 응답 시간으로 가입 여부가 드러나지 않게 발송은 요청 스레드 밖에서 한다
@Slf4j
@Service
public class MailService {

    private final ObjectProvider<JavaMailSender> sender;
    private final String from;
    private final boolean logLinks;
    private final boolean hostSet;
    private final ExecutorService worker = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "mail-sender");
        t.setDaemon(true);
        return t;
    });

    public MailService(ObjectProvider<JavaMailSender> sender,
                       @Value("${app.mail.from:}") String from,
                       @Value("${app.mail.log-links:false}") boolean logLinks,
                       @Value("${spring.mail.host:}") String host) {
        this.hostSet = !host.isBlank();
        this.sender = sender;
        this.from = from;
        this.logLinks = logLinks;
    }

    public boolean configured() {
        // MAIL_HOST가 빈 값이어도 스프링이 메일 발송기를 만들 수 있어 주소로 판단한다
        return hostSet && sender.getIfAvailable() != null;
    }

    public void send(String to, String subject, String body) {
        JavaMailSender mail = configured() ? sender.getIfAvailable() : null;
        if (mail == null) {
            // 메일 서버가 없는 개발 환경: 링크를 로그로 확인한다(운영에서는 MAIL_LOG_LINKS를 켜지 않는다)
            if (logLinks) log.info("[메일 미설정] to={} subject={}\n{}", to, subject, body);
            else log.warn("메일 서버(MAIL_HOST)가 설정되지 않아 '{}' 메일을 보내지 못했습니다", subject);
            return;
        }
        worker.execute(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                if (!from.isBlank()) message.setFrom(from);
                message.setTo(to);
                message.setSubject(subject);
                message.setText(body);
                mail.send(message);
            } catch (Exception e) {
                log.warn("메일 발송 실패: subject={} reason={}", subject, e.getMessage());
            }
        });
    }
}
