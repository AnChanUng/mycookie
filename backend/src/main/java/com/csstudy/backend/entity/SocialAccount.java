package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// 소셜(구글 · 카카오) · 깃허브 로그인 계정을 기존 닉네임 계정(users)에 연결한다.
// 학습 기록은 모두 users.id에 묶여 있어서, 연결만 하면 예전 기록을 그대로 쓴다
@Entity
@Table(name = "social_accounts",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_social_provider_subject", columnNames = {"provider", "provider_user_id"}),
                @UniqueConstraint(name = "uk_social_user_provider", columnNames = {"user_id", "provider"})
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // google · naver · kakao · github
    @Column(nullable = false, length = 16)
    private String provider;

    // 제공자가 주는 고유 번호. 이메일 · 이름은 바뀔 수 있어서 이것으로만 찾는다
    @Column(name = "provider_user_id", nullable = false, length = 128)
    private String providerUserId;

    @Column(length = 255)
    private String email;

    // 네이버 로그인에서 동의한 연령대(예: "20-29"). 로그인할 때마다 최신 값으로 바꾼다
    @Column(name = "age_range", length = 16)
    private String ageRange;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
