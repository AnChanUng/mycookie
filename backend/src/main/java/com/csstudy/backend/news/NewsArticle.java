package com.csstudy.backend.news;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 기업이 공개한 글의 제목, 링크, 짧은 요약. 본문은 저장하지 않고 원문으로 연결한다
@Entity
@Table(name = "news_articles",
        uniqueConstraints = @UniqueConstraint(name = "uq_news_articles_url_hash", columnNames = "url_hash"),
        indexes = @Index(name = "idx_news_articles_published", columnList = "published_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_key", nullable = false, length = 40)
    private String sourceKey;

    @Column(nullable = false, length = 40)
    private String company;

    @Column(name = "source_name", nullable = false, length = 80)
    private String sourceName;

    // 추적 값을 뺀 주소의 SHA-256. 같은 글이 두 번 들어오지 않게 한다
    @Column(name = "url_hash", nullable = false, length = 64)
    private String urlHash;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(length = 400)
    private String summary;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;
}
