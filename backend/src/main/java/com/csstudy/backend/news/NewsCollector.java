package com.csstudy.backend.news;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

// 정해 둔 기업 피드를 한 번씩 읽어 새 글만 저장한다. 한 곳이 실패해도 다른 곳은 계속 읽는다.
// 소스 주소는 NewsSources에 적어 둔 것뿐이라(사용자 입력이 아님) 임의 주소를 요청하지 않는다
@Slf4j
@Service
public class NewsCollector {

    private static final int MAX_BODY = 3 * 1024 * 1024;
    private static final String AGENT = "Mozilla/5.0 (compatible; MyCookieNewsBot/1.0; +https://mycookie.dev)";

    private final NewsArticleRepository articles;
    private final RestTemplate http;
    private final Clock clock;

    @Autowired
    public NewsCollector(NewsArticleRepository articles) {
        this(articles, defaultHttp(), Clock.systemUTC());
    }

    NewsCollector(NewsArticleRepository articles, RestTemplate http, Clock clock) {
        this.articles = articles;
        this.http = http;
        this.clock = clock;
    }

    private static RestTemplate defaultHttp() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(15).toMillis());
        return new RestTemplate(factory);
    }

    /** 모든 소스를 읽고 새로 저장한 글 수를 돌려준다. */
    public int collectAll() {
        return collect(NewsSources.ALL);
    }

    /** 고른 소스만 읽고 새로 저장한 글 수를 돌려준다. */
    public int collect(List<NewsSources.Source> sources) {
        int saved = 0;
        for (NewsSources.Source source : sources) {
            try {
                saved += collect(source);
            } catch (Exception e) {
                log.warn("기업 소식을 읽지 못했습니다: {} ({})", source.key(), e.getClass().getSimpleName());
            }
        }
        log.info("기업 소식 수집을 마쳤습니다: 새 글 {}개", saved);
        return saved;
    }

    int collect(NewsSources.Source source) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.USER_AGENT, AGENT);
        headers.setAccept(List.of(MediaType.APPLICATION_RSS_XML, MediaType.APPLICATION_ATOM_XML, MediaType.APPLICATION_XML, MediaType.TEXT_XML));
        byte[] body = http.exchange(source.feedUrl(), HttpMethod.GET, new HttpEntity<>(headers), byte[].class).getBody();
        if (body == null || body.length == 0 || body.length > MAX_BODY) return 0;

        Instant now = clock.instant();
        int saved = 0;
        for (NewsFeedParser.Item item : NewsFeedParser.parse(body, source.feedUrl())) {
            String hash = NewsFeedParser.hash(item.url());
            if (articles.existsByUrlHash(hash)) continue;
            Instant published = item.publishedAt() == null || item.publishedAt().isAfter(now) ? now : item.publishedAt();
            try {
                articles.save(NewsArticle.builder()
                        .sourceKey(source.key()).company(source.company()).sourceName(source.name())
                        .urlHash(hash).url(item.url()).title(item.title()).summary(item.summary())
                        .publishedAt(published).fetchedAt(now).build());
                saved++;
            } catch (DataIntegrityViolationException duplicate) {
                // 같은 글이 동시에 들어왔다. 먼저 저장된 것을 그대로 둔다
            }
        }
        return saved;
    }
}
