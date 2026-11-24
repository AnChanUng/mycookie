package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

// 채팅 메시지에 붙는 이모지 반응. kind는 lounge(전체 채팅) 또는 direct(1:1 대화)다.
// 기존 메시지 표는 건드리지 않도록 반응만 따로 둔다
@Entity
@Table(name = "chat_reactions", indexes = @Index(columnList = "kind,message_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"kind", "message_id", "reactor", "emoji"}))
@Getter @Setter @NoArgsConstructor
public class ChatReaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 8) private String kind;
    @Column(name = "message_id", nullable = false) private Long messageId;
    // 전체 채팅은 방문자 ID, 1:1 대화는 "u:계정ID"
    @Column(nullable = false, length = 64) private String reactor;
    @Column(nullable = false, length = 16) private String emoji;
    @Column(nullable = false) private Instant createdAt;
}
