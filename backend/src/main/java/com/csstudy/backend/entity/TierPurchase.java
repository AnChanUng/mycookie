package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 등급 구매 주문. 결제가 끝나면(PAID) 그 등급을 계정의 최소 등급(TierAward)으로 올린다.
// 풀이 수로 정해지는 티어 기준은 그대로 두고, 결제한 등급 아래로만 내려가지 않게 한다
@Entity
@Table(name = "tier_purchases", indexes = {
        @Index(name = "idx_tier_purchases_user", columnList = "user_id")
}, uniqueConstraints = @UniqueConstraint(name = "uk_tier_purchases_order", columnNames = "order_id"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TierPurchase {

    public enum Status { READY, PAID, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 토스페이먼츠에 넘기는 주문 번호(우리가 만든다)
    @Column(name = "order_id", nullable = false, length = 64)
    private String orderId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserTier tier;

    // 주문을 만들 때의 가격. 결제 승인 때 이 값과 다르면 거절한다(금액 조작 방지)
    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;

    @Column(name = "payment_key", length = 200)
    private String paymentKey;

    @Column(length = 40)
    private String method;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "paid_at")
    private Instant paidAt;
}
