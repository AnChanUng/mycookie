package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

// 개발 일지 맨 위 안내 줄(Grafana 주소, 홈서버 접속 방법 등). 한 줄짜리 표로 쓴다.
// 줄 목록은 JSON 문자열로 통째로 저장한다([{label, value}]). 저장소 주인(OWNER)만 고친다
@Entity
@Table(name = "dev_log_header")
@Getter @Setter @NoArgsConstructor
public class DevLogHeader {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "lines_json", nullable = false, length = 8000)
    private String linesJson;

    @Version
    private Long version;

    private Instant updatedAt;

    @Column(length = 40)
    private String updatedBy;
}
