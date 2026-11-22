package com.csstudy.backend.news;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 기업 소식: 피드를 읽어 저장하고(중복 제외, 한 곳이 실패해도 계속), 20개씩 최신순으로 보여 준다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NewsApiTest {

    @Autowired MockMvc mvc;
    @Autowired NewsArticleRepository articles;

    @BeforeEach
    void clean() { articles.deleteAll(); }

    private static String rss(String title, String url, String date) {
        return "<rss version=\"2.0\"><channel><item><title>" + title + "</title><link>" + url + "</link>"
                + "<description>요약 " + title + "</description><pubDate>" + date + "</pubDate></item></channel></rss>";
    }

    @Test
    void collectsNewArticlesOnceAndSurvivesAFailingSource() throws Exception {
        RestTemplate http = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(http).ignoreExpectOrder(true).build();
        Clock clock = Clock.fixed(Instant.parse("2026-11-22T00:00:00Z"), ZoneOffset.UTC);
        NewsCollector collector = new NewsCollector(articles, http, clock);

        for (NewsSources.Source s : NewsSources.ALL) {
            if (s.key().equals("kakao")) {
                server.expect(requestTo(s.feedUrl())).andExpect(method(HttpMethod.GET))
                        .andRespond(withSuccess(rss("카카오 글", "https://tech.kakao.com/p/1?utm_source=x", "Fri, 20 Nov 2026 01:00:00 GMT"), MediaType.APPLICATION_XML));
            } else if (s.key().equals("toss")) {
                server.expect(requestTo(s.feedUrl())).andRespond(withServerError());
            } else {
                server.expect(requestTo(s.feedUrl())).andRespond(withSuccess("<rss><channel></channel></rss>", MediaType.APPLICATION_XML));
            }
        }
        assertThat(collector.collectAll()).isEqualTo(1);
        assertThat(articles.count()).isEqualTo(1);

        // 같은 글은 다시 저장하지 않는다
        MockRestServiceServer again = MockRestServiceServer.bindTo(http).ignoreExpectOrder(true).build();
        for (NewsSources.Source s : NewsSources.ALL) {
            again.expect(requestTo(s.feedUrl())).andRespond(withSuccess(
                    s.key().equals("kakao") ? rss("카카오 글", "https://tech.kakao.com/p/1", "Fri, 20 Nov 2026 01:00:00 GMT") : "<rss><channel></channel></rss>",
                    MediaType.APPLICATION_XML));
        }
        assertThat(collector.collectAll()).isZero();
        assertThat(articles.count()).isEqualTo(1);
    }

    private void save(String key, String company, String title, String publishedAt) {
        String url = "https://news.example/" + title;
        articles.save(NewsArticle.builder().sourceKey(key).company(company).sourceName(company + " 블로그")
                .urlHash(NewsFeedParser.hash(url)).url(url).title(title).summary("요약")
                .publishedAt(Instant.parse(publishedAt)).fetchedAt(Instant.parse("2026-11-22T00:00:00Z")).build());
    }

    @Test
    void listsNewestFirstTwentyAtATimeAndFiltersByCompany() throws Exception {
        for (int i = 1; i <= 25; i++) save("kakao", "카카오", "글" + String.format("%02d", i), "2026-11-" + String.format("%02d", i) + "T00:00:00Z");
        save("toss", "토스", "토스 글", "2026-11-26T00:00:00Z");

        mvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(20))
                .andExpect(jsonPath("$.items[0].title").value("토스 글"))
                .andExpect(jsonPath("$.items[1].title").value("글25"))
                .andExpect(jsonPath("$.total").value(26))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andExpect(jsonPath("$.companies", hasItem("카카오")));
        // 더 보기: 다음 쪽에는 남은 6개가 오래된 순서대로 이어진다
        mvc.perform(get("/api/v1/news").param("page", "1"))
                .andExpect(jsonPath("$.items.length()").value(6))
                .andExpect(jsonPath("$.items[5].title").value("글01"))
                .andExpect(jsonPath("$.hasMore").value(false));
        mvc.perform(get("/api/v1/news").param("company", "토스"))
                .andExpect(jsonPath("$.items[*].title", contains("토스 글")))
                .andExpect(jsonPath("$.total").value(1));
        // 한 번에 가져올 수 있는 수는 50개까지
        mvc.perform(get("/api/v1/news").param("size", "1000")).andExpect(jsonPath("$.size").value(50));
        // 목록에 없는 회사 이름은 받지 않는다
        mvc.perform(get("/api/v1/news").param("company", "없는회사")).andExpect(status().isBadRequest());
    }
}
