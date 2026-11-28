package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

// 학습 메일 문제에 나온 개념 하나. 메일에는 term과 summary(한 줄 정리)만 넣고,
// 자세한 설명 · 심화 학습 질문 · 공식 문서(content, JSON)는 개념 페이지(/concepts/{slug})에서 보여 준다
@Entity
@Table(name = "newsletter_concepts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NewsletterConcept {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(nullable = false, length = 120)
    private String term;

    @Column(nullable = false, length = 300)
    private String summary;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
