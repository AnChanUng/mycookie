package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nickname;

    @Column(nullable = false)
    private String password;

    // 소셜 가입으로 만든 계정은 사용자가 모르는 임의 비밀번호를 갖는다(false). null은 기존 계정이라 직접 정한 비밀번호
    @Column(name = "password_set")
    private Boolean passwordSet;

    public boolean hasOwnPassword() {
        return !Boolean.FALSE.equals(passwordSet);
    }

    @Enumerated(EnumType.STRING)
    @Column(name = "base_tier", length = 16)
    private UserTier baseTier;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
