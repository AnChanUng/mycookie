package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 관리자가 한 작업 기록(계정 생성, 권한 부여 등). 비밀번호나 키 같은 값은 남기지 않는다
@Entity
@Table(name = "admin_audit_logs", indexes = @Index(name = "idx_admin_audit_at", columnList = "at"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdminAuditLog {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant at;

    // 누가: 관리자 계정 닉네임, 또는 홈서버의 관리자 키로 한 작업이면 "홈서버(관리자 키)"
    @Column(nullable = false, length = 60)
    private String actor;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(length = 120)
    private String target;
}
