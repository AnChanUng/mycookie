package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// 메일로 보내는 1회용 링크 토큰(이메일 인증, 비밀번호 재설정). 원문은 메일에만 있고 DB에는 SHA-256 해시만 둔다
@Entity
@Table(name = "email_tokens", indexes = @Index(name = "idx_email_tokens_user_purpose", columnList = "user_id,purpose"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailToken {

    public enum Purpose { VERIFY_EMAIL, RESET_PASSWORD }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Purpose purpose;

    // 인증할 주소(VERIFY_EMAIL) 또는 메일을 보낸 주소(RESET_PASSWORD)
    @Column(nullable = false, length = 254)
    private String email;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
