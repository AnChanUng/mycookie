package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 메일 발송에 실패한 기록. 관리자 화면에서 어떤 메일이 왜 실패했는지 보려고 30일만 보관한다(받는 주소와 오류 요약만, 본문은 남기지 않는다)
@Entity
@Table(name = "mail_failures", indexes = @Index(name = "idx_mail_failures_at", columnList = "at"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MailFailure {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Instant at;

    // 받는 주소
    @Column(nullable = false, length = 254)
    private String recipient;

    // 어떤 메일인지: 인증 번호, 학습 메일, 비밀번호 재설정, 이메일 인증, 기타
    @Column(nullable = false, length = 30)
    private String kind;

    @Column(nullable = false, length = 200)
    private String subject;

    // 오류 요약(예외 이름과 짧은 메시지)
    @Column(nullable = false, length = 300)
    private String reason;
}
