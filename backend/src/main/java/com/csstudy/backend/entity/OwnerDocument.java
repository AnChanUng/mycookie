package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

// 소유자(OWNER)만 읽고 쓰는 개인 자료(JSON). 이력서 기반 기술면접 질문처럼 화면 코드나 저장소에 둘 수 없는 자료를 DB에 둔다
@Entity
@Table(name = "owner_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class OwnerDocument {

    @Id
    @Column(name = "doc_key", length = 40)
    private String key;

    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String json;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
