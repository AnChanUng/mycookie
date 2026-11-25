package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 학습 메일 "오늘 주제 5문제" 화면의 세트별 횟수. 누가 눌렀는지는 남기지 않고 숫자만 센다
@Entity
@Table(name = "daily_practice_stats")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DailyPracticeStat {

    @Id
    @Column(name = "day_no")
    private int dayNo;

    // 연습 화면을 연 횟수(메일 버튼을 눌러 들어온 수에 가깝다)
    @Column(nullable = false)
    private long opens;

    // 5문제를 끝까지 풀고 결과를 본 횟수
    @Column(nullable = false)
    private long finishes;
}
