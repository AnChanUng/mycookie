package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

// 정기 발송 기록. (작업, 날짜)가 유일해서 서버가 여러 대이거나 재시작해도 같은 날 두 번 보내지 않는다
@Entity
@Table(name = "scheduled_posts", uniqueConstraints = @UniqueConstraint(name = "uk_scheduled_posts_job_date", columnNames = {"job", "run_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduledPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String job;

    @Column(name = "run_date", nullable = false)
    private LocalDate runDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
