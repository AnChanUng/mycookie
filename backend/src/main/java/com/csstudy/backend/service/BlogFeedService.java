package com.csstudy.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

// 기술 블로그(티스토리) 최신 글. 블로그의 RSS를 읽어 30분 동안 메모리에 둔다.
// 글을 올리면 다음 갱신 때 신규 개발자 안내 페이지에 자동으로 나타난다.
// 블로그에 닿지 않으면 마지막으로 읽은 목록을 그대로 돌려준다(재시작 직후라면 빈 목록).
@Slf4j
@Service
public class BlogFeedService {

    public record Post(String title, String url, String category, String publishedAt) {}

    static final Duration TTL = Duration.ofMinutes(30);
    private static final int LIMIT = 12;

    private final String feedUrl;
    private final RestTemplate http;
    private final Clock clock;
    private List<Post> cached = List.of();
    private Instant fetchedAt = Instant.EPOCH;

    // 생성자가 둘이라 스프링이 쓸 것을 지정한다(없으면 백엔드가 켜지지 않는다)
    @Autowired
    public BlogFeedService(@Value("${app.blog.rss-url:https://cookie.tistory.com/rss}") String feedUrl) {
        this(feedUrl, defaultHttp(), Clock.systemUTC());
    }

    BlogFeedService(String feedUrl, RestTemplate http, Clock clock) {
        this.feedUrl = feedUrl;
        this.http = http;
        this.clock = clock;
    }

    private static RestTemplate defaultHttp() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofSeconds(3).toMillis());
        factory.setReadTimeout((int) Duration.ofSeconds(5).toMillis());
        return new RestTemplate(factory);
    }

    public synchronized List<Post> posts() {
        if (feedUrl.isBlank()) return List.of();
        Instant now = clock.instant();
        if (now.isBefore(fetchedAt.plus(TTL))) return cached;
        fetchedAt = now;
        try {
            byte[] body = http.getForObject(feedUrl, byte[].class);
            if (body != null) cached = parse(body);
        } catch (Exception e) {
            log.warn("기술 블로그 RSS를 읽지 못했습니다: {}", e.getMessage());
        }
        return cached;
    }

    static List<Post> parse(byte[] xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // 외부 엔티티(XXE)를 막는다
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setExpandEntityReferences(false);
        Document doc = factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        NodeList items = doc.getElementsByTagName("item");
        List<Post> posts = new ArrayList<>();
        for (int i = 0; i < items.getLength() && posts.size() < LIMIT; i++) {
            Element item = (Element) items.item(i);
            String title = text(item, "title"), url = text(item, "link");
            if (title.isBlank() || !(url.startsWith("https://") || url.startsWith("http://"))) continue;
            posts.add(new Post(title, url, text(item, "category"), isoDate(text(item, "pubDate"))));
        }
        return List.copyOf(posts);
    }

    private static String text(Element parent, String tag) {
        NodeList list = parent.getElementsByTagName(tag);
        return list.getLength() == 0 ? "" : list.item(0).getTextContent().trim();
    }

    private static String isoDate(String rfc822) {
        try {
            return ZonedDateTime.parse(rfc822, DateTimeFormatter.RFC_1123_DATE_TIME).toLocalDate().toString();
        } catch (Exception e) {
            return "";
        }
    }

    static byte[] utf8(String s) { return s.getBytes(StandardCharsets.UTF_8); }
}
