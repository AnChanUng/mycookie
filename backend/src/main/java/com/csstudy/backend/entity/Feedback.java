package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

// 사이트 전체에 대한 건의 · 버그 제보. GitHub 이슈로도 올리지만, 키가 없거나 실패해도 여기에는 남는다
@Entity
@Table(name = "feedbacks", indexes = {
        @Index(name = "idx_feedbacks_day", columnList = "feedback_day")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // feature(기능개발) · bug(버그)
    @Column(nullable = false, length = 16)
    private String kind;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(nullable = false, length = 2000)
    private String content;

    // 제보한 화면 경로(버그 재현에 쓴다)
    @Column(length = 200)
    private String path;

    @Column(name = "user_agent", length = 200)
    private String userAgent;

    // 로그인하지 않아도 보낼 수 있어서 브라우저의 익명 ID로 하루 제보 수를 센다
    @Column(name = "visitor_id", nullable = false, length = 40)
    private String visitorId;

    // 로그인한 사람이면 닉네임(이슈 본문에는 넣지 않는다)
    @Column(length = 40)
    private String nickname;

    @Column(name = "issue_number")
    private Integer issueNumber;

    @Column(name = "issue_url", length = 300)
    private String issueUrl;

    // 이슈 제목 앞 순번(#순번). 제보 화면에 바로 보여 준다. 순번을 못 정했으면 비어 있다
    @Column(name = "issue_seq")
    private Integer issueSeq;

    // Mattermost로 알린 시각(다시 처리할 때 두 번 알리지 않는다)
    @Column(name = "notified_at")
    private Instant notifiedAt;

    @Column(name = "feedback_day", nullable = false)
    private LocalDate day;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
