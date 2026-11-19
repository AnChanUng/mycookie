package com.csstudy.backend.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class BlogFeedServiceTest {

    static final String RSS = """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>블로그</title>
          <item><title>홈서버 구축하기: 서버 구축부터 DB 마이그레이션까지</title><link>https://cookie.tistory.com/258</link>
            <category>인프라</category><pubDate>Thu, 19 Nov 2026 21:00:00 +0900</pubDate></item>
          <item><title>AI 워크플로우</title><link>https://cookie.tistory.com/259</link><pubDate>bad date</pubDate></item>
          <item><title>위험한 링크</title><link>javascript:alert(1)</link></item>
        </channel></rss>""";

    @Test
    void parsesPostsAndSkipsUnsafeLinks() throws Exception {
        var posts = BlogFeedService.parse(BlogFeedService.utf8(RSS));
        assertThat(posts).hasSize(2);
        assertThat(posts.get(0).title()).startsWith("홈서버 구축하기");
        assertThat(posts.get(0).url()).isEqualTo("https://cookie.tistory.com/258");
        assertThat(posts.get(0).category()).isEqualTo("인프라");
        assertThat(posts.get(0).publishedAt()).isEqualTo("2026-11-19");
        assertThat(posts.get(1).publishedAt()).isEmpty();
    }

    @Test
    void rejectsDoctypeEntities() {
        String evil = "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file:///etc/passwd\">]><rss><channel><item><title>&x;</title><link>https://a</link></item></channel></rss>";
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> BlogFeedService.parse(BlogFeedService.utf8(evil))).isInstanceOf(Exception.class);
    }

    @Test
    void cachesAndKeepsLastListWhenBlogIsDown() {
        RestTemplate http = mock(RestTemplate.class);
        AtomicReference<Instant> now = new AtomicReference<>(Instant.parse("2026-11-19T00:00:00Z"));
        Clock clock = new Clock() {
            public ZoneOffset getZone() { return ZoneOffset.UTC; }
            public Clock withZone(java.time.ZoneId z) { return this; }
            public Instant instant() { return now.get(); }
        };
        when(http.getForObject(anyString(), eq(byte[].class))).thenReturn(BlogFeedService.utf8(RSS));
        var svc = new BlogFeedService("https://cookie.tistory.com/rss", http, clock);
        assertThat(svc.posts()).hasSize(2);
        assertThat(svc.posts()).hasSize(2);
        verify(http, times(1)).getForObject(anyString(), eq(byte[].class));   // 30분 안에는 다시 읽지 않는다

        now.set(now.get().plus(BlogFeedService.TTL).plusSeconds(1));
        when(http.getForObject(anyString(), eq(byte[].class))).thenThrow(new RestClientException("down"));
        assertThat(svc.posts()).hasSize(2);   // 실패해도 마지막 목록 유지
        assertThat(new BlogFeedService("", http, clock).posts()).isEmpty();
    }
}
