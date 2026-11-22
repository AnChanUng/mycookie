package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// 계정에 붙는 권한. 닉네임은 바뀔 수 있으므로 계정 ID에 묶는다.
//   ADMIN: /admin 관리자 모니터링, OWNER: /private/chanung(찬웅 전용), TEAM: /private/bomin(신입 온보딩, 개발 일지)
//   BANK: /private/banks(비공개 문제집). 다이아 쿠키 이상일 때만 열린다
// 권한은 인터넷에서 줄 수 없고 홈서버의 관리자 키로만 준다(AccountAdminController, deploy/homeserver/account.sh)
@Entity
@Table(name = "account_roles", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "role"}))
@Getter @Setter @NoArgsConstructor
public class AccountRole {

    public enum Role { ADMIN, OWNER, TEAM, BANK }

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Role role;

    @Column(nullable = false)
    private Instant grantedAt;

    public AccountRole(Long userId, Role role) {
        this.userId = userId;
        this.role = role;
        this.grantedAt = Instant.now();
    }
}
