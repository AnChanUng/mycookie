package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

// 구독 메일로 하루에 하나씩 보내는 학습 세트(오늘의 문제 + 오늘의 CS + 기술블로그).
// 내용은 JSON 그대로 두고, day 순서대로 구독자마다 한 세트씩 보낸다
@Entity
@Table(name = "newsletter_daily_sets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsletterDailySet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "day_no", nullable = false, unique = true)
    private int dayNo;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
