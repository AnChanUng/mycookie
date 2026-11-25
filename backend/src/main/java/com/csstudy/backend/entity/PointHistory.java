package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 포인트가 들어오고 나간 기록. 잔액은 PointAccount에 두고, 여기는 내역 화면과 확인용이다
@Entity
@Table(name = "point_history", indexes = @Index(name = "idx_point_history_user", columnList = "user_id, created_at"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PointHistory {

    public enum Reason { ATTEND, SOLVED, TIER_UP, PURCHASE }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // 들어오면 양수, 쓰면 음수
    @Column(nullable = false)
    private long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Reason reason;

    @Column(length = 80)
    private String memo;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
