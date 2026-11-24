package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// 마이페이지 프로필 꾸미기(대표 아이콘, 한 줄 소개, 관심 분야, 목표). 계정 하나에 한 줄.
// 기존 users 표를 바꾸지 않도록 따로 둔다
@Entity
@Table(name = "user_profiles")
@Getter @Setter @NoArgsConstructor
public class UserProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(length = 16)
    private String avatar;

    @Column(length = 60)
    private String bio;

    // 관심 분야 키를 쉼표로 이어 저장한다(정해 둔 목록 안에서만, 최대 5개)
    @Column(length = 120)
    private String interests;

    @Column(length = 60)
    private String goal;

    private Instant updatedAt;
}
