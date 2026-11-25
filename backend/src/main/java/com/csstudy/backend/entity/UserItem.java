package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 포인트 상점에서 산 꾸미기 아이템(테마 · 아이콘 · 테두리). 한 번 사면 계속 쓴다
@Entity
@Table(name = "user_items", uniqueConstraints = @UniqueConstraint(name = "uk_user_items", columnNames = {"user_id", "item_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // "theme:sakura", "avatar:🦄", "frame:rainbow"처럼 종류:값
    @Column(name = "item_key", nullable = false, length = 40)
    private String itemKey;

    // 살 때의 가격
    @Column(nullable = false)
    private long price;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
