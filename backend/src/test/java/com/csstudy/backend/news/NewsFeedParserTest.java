package com.csstudy.backend.news;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NewsFeedParserTest {

    private static byte[] utf8(String s) { return s.getBytes(StandardCharsets.UTF_8); }

    static final String RSS = """
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"><channel><title>블로그</title>
          <item><title>  새 <b>기술</b> 글  </title>
            <link>https://tech.example.com/post/1?utm_source=rss&amp;id=7&amp;utm_medium=x#top</link>
            <description><![CDATA[<p>첫 문단 &amp; <a href="https://x">링크</a></p><script>alert(1)</script>둘째]]></description>
            <pubDate>Fri, 14 Nov 2026 08:00:00 GMT</pubDate></item>
          <item><title>위험한 링크</title><link>javascript:alert(1)</link></item>
          <item><title></title><link>https://tech.example.com/post/2</link></item>
        </channel></rss>""";

    static final String ATOM = """
        <?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom"><title>피드</title>
          <entry><title>아톰 글</title>
            <link rel="replies" href="https://tech.example.com/replies/9"/>
            <link rel="alternate" href="https://tech.example.com/atom/9"/>
            <summary>요약입니다</summary><published>2026-11-15T09:30:00+09:00</published>
            <source><title>다른 제목</title></source></entry>
        </feed>""";

    @Test
    void parsesRssAndCleansTitleSummaryAndUrl() throws Exception {
        var items = NewsFeedParser.parse(utf8(RSS));
        assertThat(items).hasSize(1);
        var item = items.get(0);
        assertThat(item.title()).isEqualTo("새 기술 글");
        // 추적 쿼리와 #조각은 빠지고 의미 있는 쿼리는 남는다
        assertThat(item.url()).isEqualTo("https://tech.example.com/post/1?id=7");
        // 태그와 스크립트는 걷어 내고 엔티티는 풀린다
        assertThat(item.summary()).isEqualTo("첫 문단 & 링크 둘째").doesNotContain("<", "alert");
        assertThat(item.publishedAt()).isEqualTo(Instant.parse("2026-11-14T08:00:00Z"));
    }

    @Test
    void parsesAtomAndPrefersTheAlternateLink() throws Exception {
        var items = NewsFeedParser.parse(utf8(ATOM));
        assertThat(items).hasSize(1);
        assertThat(items.get(0).title()).isEqualTo("아톰 글");
        assertThat(items.get(0).url()).isEqualTo("https://tech.example.com/atom/9");
        assertThat(items.get(0).summary()).isEqualTo("요약입니다");
        assertThat(items.get(0).publishedAt()).isEqualTo(Instant.parse("2026-11-15T00:30:00Z"));
    }

    @Test
    void readsFeedsThatContainIllegalControlCharacters() throws Exception {
        String xml = "<rss><channel><item><title>제어문자</title><link>https://a.example/p?source=rss----abc---4</link></item></channel></rss>";
        var items = NewsFeedParser.parse(utf8(xml));
        assertThat(items).hasSize(1);
        assertThat(items.get(0).title()).isEqualTo("제어문자");
        assertThat(items.get(0).url()).isEqualTo("https://a.example/p");
    }

    @Test
    void rejectsDoctypeToBlockExternalEntities() {
        String xxe = "<?xml version=\"1.0\"?><!DOCTYPE r [<!ENTITY x SYSTEM \"file:///etc/passwd\">]><rss><channel><item><title>&x;</title><link>https://a.example/p</link></item></channel></rss>";
        assertThatThrownBy(() -> NewsFeedParser.parse(utf8(xxe))).isInstanceOf(Exception.class);
    }

    @Test
    void normalizesUrlsAndHashesStably() {
        assertThat(NewsFeedParser.normalizeUrl("HTTPS://Tech.Example.com/a%20b?fbclid=1&k=v")).isEqualTo("https://tech.example.com/a%20b?k=v");
        assertThat(NewsFeedParser.normalizeUrl("ftp://x.example/a")).isNull();
        assertThat(NewsFeedParser.normalizeUrl("javascript:alert(1)")).isNull();
        assertThat(NewsFeedParser.normalizeUrl("  ")).isNull();
        assertThat(NewsFeedParser.hash("https://a.example/p")).hasSize(64).isEqualTo(NewsFeedParser.hash("https://a.example/p"));
    }

    @Test
    void cutsLongSummaryAtTwoHundredCharacters() {
        String text = NewsFeedParser.clean("가".repeat(500), 200);
        assertThat(text.codePointCount(0, text.length())).isEqualTo(200);
        assertThat(text).endsWith("…");
    }
}
