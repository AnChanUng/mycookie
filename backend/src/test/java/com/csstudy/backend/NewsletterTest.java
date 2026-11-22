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
    void confirmingSendsTheFirstDailySetRightAway() throws Exception {
        subscribed("reader@example.com");
        verify(mail).send(eq("reader@example.com"), startsWith("[나의쿠키] 오늘의 학습 #1"), contains("정답과 해설"), contains("<a href"), contains("/newsletter/unsubscribe?key="));
        NewsletterSubscriber s = subscriber("reader@example.com");
        assertThat(s.getStatus()).isEqualTo(NewsletterSubscriber.Status.ACTIVE);
        assertThat(s.getSetsSent()).isEqualTo(1);
        assertThat(s.getNextIndex()).isZero();
        // 확인 링크는 한 번만
        postJson("confirm", Map.of("token", "nope")).andExpect(status().isBadRequest());
    }

    @Test
    void dailySetsGoInOrderAndNeverRepeat() throws Exception {
        subscribed("order@example.com");
        LocalDate day = LocalDate.now().plusDays(90);
        clearInvocations(mail);
        // 세트가 1개뿐이면 다음 날에는 같은 세트를 되풀이하지 않고 웹 필수지식 편지를 보낸다
        newsletter.sendDue(day);
        verify(mail).send(eq("order@example.com"), contains("웹 필수지식"), contains("문제 풀러 가기"), anyString(), anyString());
        NewsletterSubscriber s = subscriber("order@example.com");
        assertThat(s.getSetsSent()).isEqualTo(1);
        assertThat(s.getNextIndex()).isEqualTo(1);

        // 2번 세트가 DB에 생기면 그다음 날에는 2번을 보낸다
        NewsletterDailySets.DailySet first = dailySets.find(1).orElseThrow();
        dailySetRows.save(NewsletterDailySet.builder().dayNo(2).content(json.writeValueAsString(
                new NewsletterDailySets.DailySet(2, "두 번째 주제", first.question(), first.cs()))).build());
        clearInvocations(mail);
        newsletter.sendDue(day.plusDays(1));
        verify(mail).send(eq("order@example.com"), startsWith("[나의쿠키] 오늘의 학습 #2 | 두 번째 주제"), anyString(), anyString(), anyString());
        assertThat(subscriber("order@example.com").getSetsSent()).isEqualTo(2);
        dailySetRows.delete(dailySetRows.findByDayNo(2).orElseThrow());
    }

    @Test
    void blogComesFromCollectedArticlesAndNeverRepeats() throws Exception {
        NewsArticle a = article("blog-a"), b = article("blog-b");
        subscribed("blog@example.com");
        NewsletterSubscriber s = subscriber("blog@example.com");
        assertThat(s.getLastBlogArticleId()).isNotNull();
        String firstUrl = articles.findById(s.getLastBlogArticleId()).orElseThrow().getUrl();
        verify(mail).send(eq("blog@example.com"), startsWith("[나의쿠키] 오늘의 학습 #1"), contains(firstUrl), contains("href=\"" + firstUrl + "\""), anyString());

        // 다음 세트에는 그다음에 수집된 글이 들어간다
        NewsletterDailySets.DailySet first = dailySets.find(1).orElseThrow();
        dailySetRows.save(NewsletterDailySet.builder().dayNo(2).content(json.writeValueAsString(
                new NewsletterDailySets.DailySet(2, "두 번째 주제", first.question(), first.cs()))).build());
        newsletter.sendDue(LocalDate.now().plusDays(120));
        assertThat(subscriber("blog@example.com").getLastBlogArticleId()).isGreaterThan(s.getLastBlogArticleId());
        dailySetRows.delete(dailySetRows.findByDayNo(2).orElseThrow());
        articles.deleteAll(java.util.List.of(a, b));
    }

    @Test
    void dailySetLetterHasQuestionCsBlogAndAnswerAtTheBottom() {
        NewsletterDailySets.DailySet set = dailySets.find(1).orElseThrow();
        NewsArticle blog = NewsArticle.builder().company("toss").sourceName("토스 기술블로그").url("https://toss.tech/article/sample")
                .title("샘플 글").summary("요약 문장").publishedAt(Instant.parse("2026-11-20T00:00:00Z")).build();
        NewsletterLetter.Letter letter = letters.buildDaily(set, blog, "https://mycookie.dev", "https://mycookie.dev/newsletter/unsubscribe?key=k");
        String text = letter.text();
        assertThat(text).contains("1. 오늘의 문제", "2. 오늘의 CS", "3. 오늘의 기술블로그 · toss", "샘플 글 (2026.11.20)", "요약 문장", "① ", "④ ", "수신 거부");
        // 정답은 문제·CS·블로그를 다 보여 준 뒤 맨 아래에
        assertThat(text.indexOf("[정답과 해설]")).isGreaterThan(text.indexOf("[3. 오늘의 기술블로그"));
        assertThat(letter.html()).contains("<pre").contains("href=\"https://toss.tech/article/sample\"")
                .doesNotContain("**").doesNotContain("<script");
        // 수집된 글이 없으면 기술블로그 칸만 빠진다
        assertThat(letters.buildDaily(set, null, "https://mycookie.dev", "https://mycookie.dev/newsletter/unsubscribe?key=k").text())
                .doesNotContain("오늘의 기술블로그").contains("[정답과 해설]");
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
