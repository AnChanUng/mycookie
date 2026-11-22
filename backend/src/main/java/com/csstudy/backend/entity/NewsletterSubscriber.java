package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 학습 메일 구독자. 확인 링크를 눌러야 ACTIVE가 되고(이중 동의), 수신 거부하면 행을 지운다.
// 개인정보는 이메일 주소와 신청·확인 시각만 저장한다. 확인하지 않은 신청은 링크가 만료되면 지운다
// (UNSUBSCRIBED는 예전에 남긴 행을 읽기 위해서만 남겨 둔 값)
@Entity
@Table(name = "newsletter_subscribers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsletterSubscriber {

    public enum Status { PENDING, ACTIVE, UNSUBSCRIBED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;

    // 확인 링크 토큰의 SHA-256 해시
    @Column(name = "confirm_hash", length = 64)
    private String confirmHash;

    @Column(name = "confirm_sent_at")
    private LocalDateTime confirmSentAt;

    // 수신 거부 링크 키. 메일마다 넣어야 해서 원문을 둔다(이 키로는 수신 거부만 할 수 있다)
    @Column(name = "unsubscribe_key", nullable = false, unique = true, length = 64)
    private String unsubscribeKey;

    // 다음에 보낼 웹 필수지식 순번
    @Column(name = "next_index", nullable = false)
    private int nextIndex;

    // 지금까지 받은 오늘의 학습 세트 수. 다음에 보낼 세트는 sets_sent + 1번이다.
    // 기존 구독자 행이 있어도 열을 추가할 수 있게 비워 둘 수 있고, 비어 있으면 0으로 본다
    @Column(name = "sets_sent")
    private Integer setsSent;

    // 마지막으로 받은 기술블로그 글(news_articles.id). 다음에는 이보다 뒤에 수집된 글을 보낸다
    @Column(name = "last_blog_article_id")
    private Long lastBlogArticleId;

    @Column(name = "last_sent_on")
    private LocalDate lastSentOn;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
