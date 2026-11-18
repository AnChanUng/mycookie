package com.csstudy.backend.service;

import com.csstudy.backend.entity.NewsletterSubscriber;
import com.csstudy.backend.entity.NewsletterSubscriber.Status;
import com.csstudy.backend.repository.NewsletterSubscriberRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.List;

// 학습 메일 구독: 구독 신청 → 확인 메일 → 링크를 누르면 바로 첫 편지 → 이후 정해진 시간마다 한 통씩.
// 무료 SMTP 한도(예: Gmail 하루 약 500통)를 넘지 않게 하루 발송 수를 제한하고, 못 보낸 사람은 다음 날 먼저 보낸다
@Slf4j
@Service
public class NewsletterService {

    static final Duration CONFIRM_TTL = Duration.ofHours(48);
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final NewsletterSubscriberRepository subscribers;
    private final NewsletterLetter letters;
    private final MailService mail;
    private final TransactionTemplate tx;
    private final String baseUrl;
    private final int dailyLimit;

    public NewsletterService(NewsletterSubscriberRepository subscribers, NewsletterLetter letters, MailService mail,
                             TransactionTemplate tx,
                             @Value("${app.base-url:http://localhost:3000}") String baseUrl,
                             @Value("${app.newsletter.daily-limit:400}") int dailyLimit) {
        this.subscribers = subscribers;
        this.letters = letters;
        this.mail = mail;
        this.tx = tx;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.dailyLimit = dailyLimit;
    }

    public boolean enabled() {
        return mail.configured();
    }

    // 이미 구독 중인지는 응답으로 알려 주지 않는다. 확인 메일은 같은 주소에 1분에 한 번만
    @Transactional
    public void subscribe(String rawEmail) {
        if (!enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "지금은 메일 서버가 준비되지 않아 구독할 수 없어요.");
        String email = EmailAccountService.normalize(rawEmail);
        NewsletterSubscriber s = subscribers.findByEmailForUpdate(email).orElse(null);
        if (s != null && s.getStatus() == Status.ACTIVE) return;
        LocalDateTime now = LocalDateTime.now(SEOUL);
        if (s != null && s.getConfirmSentAt() != null && s.getConfirmSentAt().isAfter(now.minusMinutes(1))) return;
        if (s == null) {
            s = NewsletterSubscriber.builder().email(email).status(Status.PENDING).unsubscribeKey(random()).nextIndex(0).build();
        }
        String token = random();
        s.setStatus(Status.PENDING);
        s.setConfirmHash(EmailAccountService.hash(token));
        s.setConfirmSentAt(now);
        subscribers.saveAndFlush(s);
        mail.send(email, "[나의쿠키] 학습 메일 구독을 확인해 주세요",
                "아래 링크를 누르면 구독이 완료되고, 바로 첫 학습 메일을 보내 드려요. 48시간 동안 유효합니다.\n\n"
                        + baseUrl + "/newsletter/confirm?token=" + token
                        + "\n\n직접 신청하지 않았다면 이 메일을 무시하세요. 링크를 누르지 않으면 메일이 가지 않습니다.");
    }

    @Transactional
    public void confirm(String token) {
        String message = "확인 링크가 만료되었거나 이미 사용되었습니다. 다시 구독해 주세요.";
        if (token == null || token.isBlank() || token.length() > 128) throw bad(message);
        NewsletterSubscriber s = subscribers.findByConfirmHashForUpdate(EmailAccountService.hash(token.trim())).orElseThrow(() -> bad(message));
        LocalDateTime now = LocalDateTime.now(SEOUL);
        if (s.getStatus() != Status.PENDING || s.getConfirmSentAt() == null || s.getConfirmSentAt().isBefore(now.minus(CONFIRM_TTL))) {
            throw bad(message);
        }
        s.setStatus(Status.ACTIVE);
        s.setConfirmHash(null);
        s.setConfirmedAt(now);
        // 구독하자마자 첫 편지를 보낸다
        deliver(s, LocalDate.now(SEOUL));
    }

    @Transactional
    public void unsubscribe(String key) {
        if (key == null || key.isBlank()) throw bad("수신 거부 링크가 올바르지 않습니다.");
        NewsletterSubscriber s = subscribers.findByUnsubscribeKey(key.trim()).orElseThrow(() -> bad("수신 거부 링크가 올바르지 않습니다."));
        s.setStatus(Status.UNSUBSCRIBED);
        s.setConfirmHash(null);
    }

    // 평일 아침 8시 30분(한국 시간). 야간(21시~8시) 발송은 별도 동의가 필요해 피한다
    @Scheduled(cron = "${app.newsletter.cron:0 30 8 * * MON-FRI}", zone = "Asia/Seoul")
    public void scheduled() {
        if (enabled()) sendDue(LocalDate.now(SEOUL));
    }

    /** 오늘 받을 차례인 구독자에게 보낸다. 보낸 수를 돌려준다. */
    public int sendDue(LocalDate today) {
        int sent = 0;
        while (sent < dailyLimit) {
            int batch = Math.min(50, dailyLimit - sent);
            // 한 명씩 잠그고 처리해 서버가 여러 대여도 같은 사람에게 두 번 보내지 않는다
            Integer done = tx.execute(status -> {
                List<NewsletterSubscriber> due = subscribers.dueOn(today, PageRequest.of(0, batch));
                int n = 0;
                for (NewsletterSubscriber candidate : due) {
                    NewsletterSubscriber s = subscribers.findByEmailForUpdate(candidate.getEmail()).orElse(null);
                    if (s == null || s.getStatus() != Status.ACTIVE || today.equals(s.getLastSentOn())) continue;
                    deliver(s, today);
                    n++;
                }
                return n;
            });
            if (done == null || done == 0) break;
            sent += done;
        }
        if (sent > 0) log.info("학습 메일 {}통 발송", sent);
        return sent;
    }

    private void deliver(NewsletterSubscriber s, LocalDate today) {
        String unsubscribeUrl = baseUrl + "/newsletter/unsubscribe?key=" + s.getUnsubscribeKey();
        NewsletterLetter.Letter letter = letters.build(s.getNextIndex(), baseUrl, unsubscribeUrl);
        s.setNextIndex((s.getNextIndex() + 1) % letters.size());
        s.setLastSentOn(today);
        mail.send(s.getEmail(), letter.subject(), letter.text(), letter.html(), unsubscribeUrl);
    }

    private static String random() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
