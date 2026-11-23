package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

// 비공개 문제집(/private/banks)을 열어 준 계정. 관리자 페이지에서 주고 뺀다(PrivateBankAdminController).
// 권한 표(account_roles)의 종류에 넣지 않고 따로 둔다: 그 표의 role 열에는 기존 값만 받는 제약이 있을 수 있고,
// 이 권한은 문제집 열람 하나만 여는 좁은 권한이라 관리자 · 주인 권한과 섞지 않는다. 닉네임은 바뀔 수 있어 계정 ID에 묶는다
@Entity
@Table(name = "private_bank_grants", uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))
@Getter @NoArgsConstructor
public class PrivateBankGrant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Instant grantedAt;

    public PrivateBankGrant(Long userId) {
        this.userId = userId;
        this.grantedAt = Instant.now();
    }
}
