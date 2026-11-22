package com.csstudy.backend.service;

import com.csstudy.backend.entity.NewsletterSubscriber;
import com.csstudy.backend.news.NewsArticle;
import com.csstudy.backend.news.NewsArticleRepository;
import com.csstudy.backend.entity.NewsletterSubscriber.Status;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
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

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.List;

// 학습 메일 구독: 구독 신청 → 확인 메일 → 링크를 누르면 바로 첫 편지 → 이후 정해진 시간마다 한 통씩.
// 편지는 오늘의 학습 세트(오늘의 문제 + 오늘의 CS + 기술블로그)를 1번부터 차례로 보내고, 받을 세트가 아직 없으면 웹 필수지식 편지를 보낸다.
// 무료 SMTP 한도(예: Gmail 하루 약 500통)를 넘지 않게 하루 발송 수를 제한하고, 못 보낸 사람은 다음 날 먼저 보낸다
@Slf4j
@Service
public class NewsletterService {

    // 인증 번호(메일로 보낸 6자리)의 유효 시간과 한 번호로 틀릴 수 있는 횟수, 다시 받기까지 기다릴 시간
    static final Duration CONFIRM_TTL = Duration.ofMinutes(10);
    static final int MAX_CODE_ATTEMPTS = 5;
    static final Duration RESEND_WAIT = Duration.ofSeconds(60);
    // 기술블로그는 최근 30일 안에 올라온 글만 보낸다
    static final Duration BLOG_WINDOW = Duration.ofDays(30);
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final NewsletterSubscriberRepository subscribers;
    private final NewsletterLetter letters;
    private final NewsletterDailySets dailySets;
    private final NewsArticleRepository articles;
    private final MailService mail;
    private final TransactionTemplate tx;
    private final String baseUrl;
    private final int dailyLimit;
    private final int maxSubscribers;

    public NewsletterService(NewsletterSubscriberRepository subscribers, NewsletterLetter letters, NewsletterDailySets dailySets, NewsArticleRepository articles, MailService mail,
                             TransactionTemplate tx,
                             @Value("${app.base-url:http://localhost:3000}") String baseUrl,
                             @Value("${app.newsletter.daily-limit:400}") int dailyLimit,
                             @Value("${app.newsletter.max-subscribers:400}") int maxSubscribers) {
        this.subscribers = subscribers;
        this.letters = letters;
        this.dailySets = dailySets;
        this.articles = articles;
        this.mail = mail;
        this.tx = tx;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.dailyLimit = dailyLimit;
        this.maxSubscribers = maxSubscribers;
    }

    public boolean enabled() {
        return mail.configured();
    }

    // 이메일을 받으면 6자리 인증 번호를 메일로 보낸다. 번호를 맞게 넣어야(verify) 구독이 시작된다.
    // 같은 주소에는 60초에 한 번만 보내고, 이미 구독 중인 주소는 "이미 등록된 메일입니다"로 거절한다
    @Transactional
    public void subscribe(String rawEmail) {
        if (!enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "지금은 메일 서버가 준비되지 않아 구독할 수 없어요.");
        String email = EmailAccountService.normalize(rawEmail);
        NewsletterSubscriber s = subscribers.findByEmailForUpdate(email).orElse(null);
        LocalDateTime now = LocalDateTime.now(SEOUL);
        // 이미 구독 중인 주소는 인증 번호를 보내지 않고 바로 알려 준다(주소가 등록돼 있는지 화면에서 알 수 있다)
        if (s != null && s.getStatus() == Status.ACTIVE) throw new CookieException(CookieErrorCode.NEWSLETTER_ALREADY);
        if (s != null && s.getConfirmSentAt() != null && s.getConfirmSentAt().isAfter(now.minus(RESEND_WAIT))) return;
        // 구독자는 최대 maxSubscribers명. 이미 자리를 잡은(인증 번호가 유효한) 신청이면 자리를 더 쓰지 않는다
        boolean holdsSeat = s != null && s.getStatus() == Status.PENDING && s.getConfirmSentAt() != null && s.getConfirmSentAt().isAfter(now.minus(CONFIRM_TTL));
        if (!holdsSeat && subscribers.countTaken(now.minus(CONFIRM_TTL)) >= maxSubscribers) throw new CookieException(CookieErrorCode.NEWSLETTER_FULL);
        if (s == null) {
            s = NewsletterSubscriber.builder().email(email).status(Status.PENDING).unsubscribeKey(random()).nextIndex(0).build();
        }
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        s.setStatus(Status.PENDING);
        s.setConfirmHash(codeHash(email, code));
        s.setConfirmAttempts(0);
        s.setConfirmSentAt(now);
        subscribers.saveAndFlush(s);
        mail.send(email, "[나의쿠키] 학습 메일 인증 번호 " + code,
                "나의쿠키 학습 메일 인증 번호\n\n인증 번호: " + code
                        + "\n\n구독 창에 이 6자리 번호를 입력하면 구독이 시작돼요. 10분 동안 유효합니다."
                        + "\n구독하면 평일(월~금) 아침 8시 30분에 오늘의 문제와 관련 기술블로그를 보내 드려요."
                        + "\n\n직접 신청하지 않았다면 이 메일을 무시하세요. 번호를 입력하지 않으면 메일이 가지 않습니다.");
    }

    // 인증 번호 확인: 맞으면 구독 시작(첫 메일은 다음 아침 8시 30분 발송에 함께 나간다)
    @Transactional(noRollbackFor = CookieException.class)
    public void verify(String rawEmail, String rawCode) {
        String email = EmailAccountService.normalize(rawEmail);
        String code = rawCode == null ? "" : rawCode.trim();
        NewsletterSubscriber s = subscribers.findByEmailForUpdate(email).orElse(null);
        LocalDateTime now = LocalDateTime.now(SEOUL);
        if (s == null || s.getStatus() != Status.PENDING || s.getConfirmHash() == null || s.getConfirmSentAt() == null
                || s.getConfirmSentAt().isBefore(now.minus(CONFIRM_TTL))) {
            throw new CookieException(CookieErrorCode.NEWSLETTER_CODE_EXPIRED);
        }
        int attempts = s.getConfirmAttempts() == null ? 0 : s.getConfirmAttempts();
        if (attempts >= MAX_CODE_ATTEMPTS) throw new CookieException(CookieErrorCode.NEWSLETTER_CODE_LOCKED);
        if (!code.matches("\\d{6}") ||!MessageDigest.isEqual(codeHash(email, code).getBytes(StandardCharsets.UTF_8), s.getConfirmHash().getBytes(StandardCharsets.UTF_8))) {
            s.setConfirmAttempts(attempts + 1);
            subscribers.saveAndFlush(s);
            throw new CookieException(CookieErrorCode.NEWSLETTER_CODE_WRONG);
        }
        // 번호를 맞힌 순간에도 정원을 넘지 않게 다시 본다
        if (subscribers.countByStatus(Status.ACTIVE) >= maxSubscribers) throw new CookieException(CookieErrorCode.NEWSLETTER_FULL);
        s.setStatus(Status.ACTIVE);
        s.setConfirmHash(null);
        s.setConfirmAttempts(null);
        s.setConfirmedAt(now);
    }

    // 번호는 6자리라 그대로 해시하면 맞혀 볼 수 있으니 이메일을 섞어 저장한다(틀릴 수 있는 횟수도 제한)
    private static String codeHash(String email, String code) {
        return EmailAccountService.hash(email + ":" + code);
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
        // 확인하는 순간에도 정원을 넘지 않게 다시 본다(신청해 둔 사이 다른 사람이 먼저 확인했을 수 있다)
        if (subscribers.countByStatus(Status.ACTIVE) >= maxSubscribers) throw new CookieException(CookieErrorCode.NEWSLETTER_FULL);
        s.setStatus(Status.ACTIVE);
        s.setConfirmHash(null);
        s.setConfirmedAt(now);
    }

    @Transactional
    public void unsubscribe(String key) {
        if (key == null || key.isBlank()) throw bad("수신 거부 링크가 올바르지 않습니다.");
        NewsletterSubscriber s = subscribers.findByUnsubscribeKey(key.trim()).orElseThrow(() -> bad("수신 거부 링크가 올바르지 않습니다."));
        // 개인정보는 필요한 동안만: 수신 거부하면 이메일을 포함한 구독 기록을 바로 지운다
        subscribers.delete(s);
    }

    // 확인 링크를 누르지 않은 신청(이메일 주소)은 링크가 만료되면 지운다. 매일 새벽에 정리
    @Scheduled(cron = "0 40 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public int purgeUnconfirmed() {
        int removed = subscribers.deleteUnconfirmedBefore(LocalDateTime.now(SEOUL).minus(CONFIRM_TTL));
        if (removed > 0) log.info("확인되지 않은 학습 메일 신청 {}건 삭제", removed);
        return removed;
    }

    // 평일(월~금) 아침 8시 30분(한국 시간). 야간(21시~8시) 발송은 별도 동의가 필요해 피한다
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
        int sent = s.getSetsSent() == null ? 0 : s.getSetsSent();
        NewsletterLetter.Letter letter = dailySets.find(sent + 1)
                .map(set -> {
                    s.setSetsSent(sent + 1);
                    // 세트에 문제와 이어지는 글이 정해져 있으면 그것을 쓰고, 없을 때만 수집 글에서 고른다
                    NewsArticle blog = set.blog() == null ? nextBlog(s) : null;
                    if (blog != null) s.setLastBlogArticleId(blog.getId());
                    return letters.buildDaily(set, blog, baseUrl, unsubscribeUrl);
                })
                .orElseGet(() -> {
                    // 받을 세트가 아직 없으면 같은 세트를 되풀이하지 않고 웹 필수지식 편지를 보낸다
                    NewsletterLetter.Letter fallback = letters.build(s.getNextIndex(), baseUrl, unsubscribeUrl);
                    s.setNextIndex((s.getNextIndex() + 1) % letters.size());
                    return fallback;
                });
        s.setLastSentOn(today);
        mail.send(s.getEmail(), letter.subject(), letter.text(), letter.html(), unsubscribeUrl);
    }

    // 크롤링해 둔 기업 블로그 글 중 이 구독자가 받은 글 다음에 수집된 최근 글. 새 글이 없으면 보내지 않는다(같은 글 되풀이 금지)
    private NewsArticle nextBlog(NewsletterSubscriber s) {
        long after = s.getLastBlogArticleId() == null ? 0 : s.getLastBlogArticleId();
        return articles.findFirstByIdGreaterThanAndPublishedAtAfterOrderByIdAsc(after, Instant.now().minus(BLOG_WINDOW)).orElse(null);
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
