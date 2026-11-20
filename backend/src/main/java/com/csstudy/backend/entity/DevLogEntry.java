package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;

// 팀 개발 일지 하루치(/private/bomin/log). 할 일 목록은 JSON 문자열로 통째로 저장한다(하루 수십 줄이라 표로 나눌 이유가 없다).
// version으로 두 사람이 동시에 고쳤을 때 나중 저장이 앞 저장을 덮어쓰지 않게 막는다
@Entity
@Table(name = "dev_log_entries")
@Getter @Setter @NoArgsConstructor
public class DevLogEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "log_date", nullable = false, unique = true)
    private LocalDate logDate;

    @Column(nullable = false, length = 80)
    private String title;

    @Column(length = 40)
    private String owner;

    // [{id, text, note, done, sub: [{id, text, note, done}]}]
    @Column(name = "items_json", nullable = false, length = 40000)
    private String itemsJson;

    @Version
    private Long version;

    private Instant updatedAt;

    @Column(length = 40)
    private String updatedBy;
}
