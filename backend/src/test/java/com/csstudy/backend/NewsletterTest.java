package com.csstudy.backend;

import com.csstudy.backend.entity.NewsletterDailySet;
import com.csstudy.backend.entity.NewsletterSubscriber;
import com.csstudy.backend.news.NewsArticle;
import com.csstudy.backend.news.NewsArticleRepository;
import com.csstudy.backend.repository.NewsletterDailySetRepository;
import com.csstudy.backend.repository.NewsletterSubscriberRepository;
import com.csstudy.backend.service.MailService;
import com.csstudy.backend.service.NewsletterDailySets;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
    @Autowired NewsletterDailySets dailySets;
    @Autowired NewsletterDailySetRepository dailySetRows;
    @Autowired NewsArticleRepository articles;
    @MockitoBean MailService mail;

    @BeforeEach
    void mailServerReady() {
        when(mail.configured()).thenReturn(true);
    }

    private ResultActions postJson(String path, Map<String, ?> body) throws Exception {
        return mvc.perform(post("/api/v1/newsletter/" + path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    // 메일로 간 가장 최근 6자리 인증 번호
    private String codeFor(String email) {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).send(eq(email), contains("인증 번호"), body.capture());
        Matcher m = Pattern.compile("인증 번호: (\\d{6})").matcher(body.getValue());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    private void subscribed(String email) throws Exception {
        postJson("subscribe", Map.of("email", email)).andExpect(status().isOk());
        postJson("verify", Map.of("email", email, "code", codeFor(email))).andExpect(status().isOk());
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
    void verifyingStartsTheSubscriptionButTheFirstLetterWaitsForMorning() throws Exception {
        subscribed("reader@example.com");
        // 인증하는 순간에는 학습 메일을 보내지 않는다(인증 번호 메일만 간다)
        verify(mail, never()).send(eq("reader@example.com"), startsWith("[나의쿠키] 오늘의 학습"), anyString(), anyString(), anyString());
        NewsletterSubscriber s = subscriber("reader@example.com");
        assertThat(s.getStatus()).isEqualTo(NewsletterSubscriber.Status.ACTIVE);
        assertThat(s.getSetsSent()).isNull();
        assertThat(s.getLastSentOn()).isNull();

        // 다음 아침 발송(8시 30분)에 1번 세트가 간다
        newsletter.sendDue(LocalDate.now().plusDays(1));
        verify(mail).send(eq("reader@example.com"), startsWith("[나의쿠키] 오늘의 학습 #1"), contains("정답과 해설"), contains("<a href"), contains("/newsletter/unsubscribe?key="));
        assertThat(subscriber("reader@example.com").getSetsSent()).isEqualTo(1);
        // 예전에 보낸 확인 링크가 잘못되면 거절한다
        postJson("confirm", Map.of("token", "nope")).andExpect(status().isBadRequest());
    }

    @Test
    void wrongOrExpiredCodesAreRefusedAndTooManyWrongTriesLockTheCode() throws Exception {
        postJson("subscribe", Map.of("email", "code@example.com")).andExpect(status().isOk());
        String code = codeFor("code@example.com");
        String wrong = code.equals("000000") ? "111111" : "000000";
        // 번호가 아닌 값, 틀린 번호
        postJson("verify", Map.of("email", "code@example.com", "code", "12ab")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NEWSLETTER_CODE_WRONG"));
        postJson("verify", Map.of("email", "code@example.com", "code", wrong)).andExpect(status().isBadRequest());
        // 틀린 횟수가 쌓이면 맞는 번호도 막고 새 번호를 받게 한다
        for (int i = 0; i < 3; i++) postJson("verify", Map.of("email", "code@example.com", "code", wrong)).andExpect(status().isBadRequest());
        postJson("verify", Map.of("email", "code@example.com", "code", code)).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.code").value("NEWSLETTER_CODE_LOCKED"));
        assertThat(subscriber("code@example.com").getStatus()).isEqualTo(NewsletterSubscriber.Status.PENDING);

        // 번호를 받은 적 없는 주소와 만료된 번호
        postJson("verify", Map.of("email", "nobody@example.com", "code", "123456")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NEWSLETTER_CODE_EXPIRED"));
        NewsletterSubscriber s = subscriber("code@example.com");
        s.setConfirmSentAt(java.time.LocalDateTime.now().minusMinutes(11));
        subscribers.save(s);
        postJson("verify", Map.of("email", "code@example.com", "code", code)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NEWSLETTER_CODE_EXPIRED"));
    }

    @Test
    void codeCanBeResentOnlyAfterAMinuteAndAnActiveAddressIsToldItIsAlreadyRegistered() throws Exception {
        postJson("subscribe", Map.of("email", "resend@example.com")).andExpect(status().isOk());
        postJson("subscribe", Map.of("email", "resend@example.com")).andExpect(status().isOk());
        verify(mail, times(1)).send(eq("resend@example.com"), contains("인증 번호"), anyString());

        NewsletterSubscriber s = subscriber("resend@example.com");
        s.setConfirmSentAt(java.time.LocalDateTime.now().minusMinutes(2));
        subscribers.save(s);
        postJson("subscribe", Map.of("email", "resend@example.com")).andExpect(status().isOk());
        verify(mail, times(2)).send(eq("resend@example.com"), contains("인증 번호"), anyString());
        postJson("verify", Map.of("email", "resend@example.com", "code", codeFor("resend@example.com"))).andExpect(status().isOk());

        // 이미 구독 중이면 번호를 보내지 않고 "이미 등록된 메일입니다"로 알려 준다
        clearInvocations(mail);
        postJson("subscribe", Map.of("email", "resend@example.com")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NEWSLETTER_ALREADY"))
                .andExpect(jsonPath("$.error").value("이미 등록된 메일입니다."));
        verify(mail, never()).send(eq("resend@example.com"), anyString(), anyString());
    }

    @Test
    void dailySetsGoInOrderAndNeverRepeat() throws Exception {
        subscribed("order@example.com");
        LocalDate day = LocalDate.now().plusDays(90);
        clearInvocations(mail);
        // 첫 발송은 1번, 다음 날에는 2번 세트
        newsletter.sendDue(day);
        verify(mail).send(eq("order@example.com"), startsWith("[나의쿠키] 오늘의 학습 #1 |"), anyString(), anyString(), anyString());
        newsletter.sendDue(day.plusDays(1));
        verify(mail).send(eq("order@example.com"), startsWith("[나의쿠키] 오늘의 학습 #2 |"), anyString(), anyString(), anyString());
        assertThat(subscriber("order@example.com").getSetsSent()).isEqualTo(2);

        // 마지막 세트까지 받은 사람에게는 같은 세트를 되풀이하지 않고 웹 필수지식 편지를 보낸다
        NewsletterSubscriber s = subscriber("order@example.com");
        s.setSetsSent(30);
        subscribers.save(s);
        clearInvocations(mail);
        newsletter.sendDue(day.plusDays(2));
        verify(mail).send(eq("order@example.com"), contains("웹 필수지식"), contains("문제 풀러 가기"), anyString(), anyString());
        assertThat(subscriber("order@example.com").getSetsSent()).isEqualTo(30);
        assertThat(subscriber("order@example.com").getNextIndex()).isEqualTo(1);
    }

    @Test
    void setWithoutItsOwnBlogUsesTheNextCollectedArticle() throws Exception {
        NewsArticle a = article("blog-a"), b = article("blog-b");
        NewsletterDailySets.DailySet first = dailySets.find(1).orElseThrow();
        dailySetRows.save(NewsletterDailySet.builder().dayNo(31).content(json.writeValueAsString(
                new NewsletterDailySets.DailySet(31, "글이 정해지지 않은 주제", first.question(), null, null))).build());
        dailySetRows.save(NewsletterDailySet.builder().dayNo(32).content(json.writeValueAsString(
                new NewsletterDailySets.DailySet(32, "글이 정해지지 않은 주제 2", first.question(), null, null))).build());
        subscribed("blog@example.com");
        NewsletterSubscriber s = subscriber("blog@example.com");
        assertThat(s.getLastBlogArticleId()).as("세트에 글이 정해져 있으면 수집 글을 쓰지 않는다").isNull();
        s.setSetsSent(30);
        subscribers.save(s);

        clearInvocations(mail);
        newsletter.sendDue(LocalDate.now().plusDays(120));
        Long firstId = subscriber("blog@example.com").getLastBlogArticleId();
        assertThat(firstId).isNotNull();
        String firstUrl = articles.findById(firstId).orElseThrow().getUrl();
        verify(mail).send(eq("blog@example.com"), startsWith("[나의쿠키] 오늘의 학습 #31"), contains(firstUrl), contains("href=\"" + firstUrl + "\""), anyString());

        // 다음 날에는 그다음에 수집된 글(같은 글 되풀이 금지)
        newsletter.sendDue(LocalDate.now().plusDays(121));
        assertThat(subscriber("blog@example.com").getLastBlogArticleId()).isGreaterThan(firstId);
        dailySetRows.delete(dailySetRows.findByDayNo(31).orElseThrow());
        dailySetRows.delete(dailySetRows.findByDayNo(32).orElseThrow());
        articles.deleteAll(java.util.List.of(a, b));
    }

    @Test
    void dailySetLetterIsQuestionThenRelatedBlogThenAnswer() {
        NewsletterDailySets.DailySet set = dailySets.find(1).orElseThrow();
        NewsletterLetter.Letter letter = letters.buildDaily(set, null, "https://mycookie.dev", "https://mycookie.dev/newsletter/unsubscribe?key=k");
        String text = letter.text();
        assertThat(text).contains("[1. 오늘의 문제", "[2. 이 문제와 이어지는 기술블로그 · " + set.blog().company(), set.blog().url(),
                "① ", "④ ", "[정답과 해설]", "나의쿠키에서 더 공부하기", "수신 거부");
        assertThat(text).doesNotContain("10분").doesNotContain("오늘의 CS");
        // 문제 → 관련 기술블로그 → 정답과 해설 → 더 공부하기 순서
        assertThat(text.indexOf("[2. 이 문제와 이어지는 기술블로그")).isGreaterThan(text.indexOf("[1. 오늘의 문제"));
        assertThat(text.indexOf("[정답과 해설]")).isGreaterThan(text.indexOf("[2. 이 문제와 이어지는 기술블로그"));
        assertThat(text.indexOf("나의쿠키에서 더 공부하기")).isGreaterThan(text.indexOf("[정답과 해설]"));
        assertThat(letter.html()).contains("<pre").contains("href=\"" + set.blog().url() + "\"")
                .doesNotContain("**").doesNotContain("<script");

        // 세트에 글이 없으면 수집 글을, 그것도 없으면 그 칸을 건너뛴다
        NewsletterDailySets.DailySet bare = new NewsletterDailySets.DailySet(99, "주제", set.question(), null, null);
        NewsArticle crawled = NewsArticle.builder().company("toss").sourceName("토스 기술블로그").url("https://toss.tech/article/sample")
                .title("샘플 글").summary("요약 문장").publishedAt(Instant.parse("2026-11-20T00:00:00Z")).build();
        assertThat(letters.buildDaily(bare, crawled, "https://mycookie.dev", "https://mycookie.dev/newsletter/unsubscribe?key=k").text())
                .contains("[2. 오늘의 기술블로그 · toss]", "샘플 글 (2026.11.20)", "요약 문장");
        assertThat(letters.buildDaily(bare, null, "https://mycookie.dev", "https://mycookie.dev/newsletter/unsubscribe?key=k").text())
                .doesNotContain("기술블로그").contains("[정답과 해설]");
    }

    @Test
    void thirtySetsAreCompleteAndAnswersAreNotGuessableByLength() {
        int[] positions = new int[4];
        int longest = 0;
        for (int day = 1; day <= 30; day++) {
            NewsletterDailySets.DailySet set = dailySets.find(day).orElseThrow(() -> new AssertionError("세트 없음"));
            assertThat(set.day()).isEqualTo(day);
            assertThat(set.blog()).as("%d번 세트의 관련 기술블로그", day).isNotNull();
            assertThat(set.blog().url()).startsWith("https://");
            assertThat(set.question().explanation()).as("%d번 해설", day).hasSizeGreaterThanOrEqualTo(2);
            NewsletterDailySets.Question q = set.question();
            positions[q.answer()]++;
            int max = q.options().stream().mapToInt(String::length).max().orElseThrow();
            if (q.options().get(q.answer()).length() == max) longest++;
        }
        for (int count : positions) assertThat(count).isBetween(5, 10);
        assertThat(longest).as("정답이 가장 긴 보기인 세트 수").isLessThanOrEqualTo(9);
    }

    private NewsArticle article(String key) {
        return articles.save(NewsArticle.builder().sourceKey("test").company("테스트").sourceName("테스트 블로그")
                .urlHash(key + System.nanoTime()).url("https://example.com/" + key).title("글 " + key)
                .publishedAt(Instant.now().minusSeconds(3600)).fetchedAt(Instant.now()).build());
    }

    @Test
    void unsubscribingDeletesTheEmailAndUnconfirmedSignupsAreCleanedUp() throws Exception {
        subscribed("bye@example.com");
        String key = subscriber("bye@example.com").getUnsubscribeKey();
        postJson("unsubscribe", Map.of("key", key)).andExpect(status().isOk());
        assertThat(subscribers.findAll()).noneMatch(x -> x.getEmail().equals("bye@example.com"));
        // 지운 뒤에도 다시 구독할 수 있다
        subscribed("bye@example.com");
        assertThat(subscriber("bye@example.com").getStatus()).isEqualTo(NewsletterSubscriber.Status.ACTIVE);

        // 확인하지 않은 신청은 링크가 만료되면 지운다. 막 신청한 것과 구독 중인 사람은 남긴다
        postJson("subscribe", Map.of("email", "fresh@example.com")).andExpect(status().isOk());
        postJson("subscribe", Map.of("email", "stale@example.com")).andExpect(status().isOk());
        NewsletterSubscriber stale = subscriber("stale@example.com");
        stale.setConfirmSentAt(java.time.LocalDateTime.now().minusDays(3));
        subscribers.save(stale);
        newsletter.purgeUnconfirmed();
        assertThat(subscribers.findAll()).noneMatch(x -> x.getEmail().equals("stale@example.com"));
        assertThat(subscriber("fresh@example.com").getStatus()).isEqualTo(NewsletterSubscriber.Status.PENDING);
        assertThat(subscriber("bye@example.com").getStatus()).isEqualTo(NewsletterSubscriber.Status.ACTIVE);
    }

    @Test
    void seedingTwiceKeepsOneRowPerDay() throws Exception {
        long before = dailySetRows.count();
        dailySets.seed();
        dailySets.seed();
        assertThat(dailySetRows.count()).isEqualTo(before);
        assertThat(dailySetRows.findByDayNo(1)).isPresent();
    }

    private NewsletterSubscriber subscriber(String email) {
        return subscribers.findAll().stream().filter(x -> x.getEmail().equals(email)).findFirst().orElseThrow();
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
