package com.csstudy.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

// 계정별 포인트 잔액과 어디까지 지급했는지. 같은 풀이 · 승급에 포인트를 두 번 주지 않으려고 지급한 지점을 남긴다
@Entity
@Table(name = "point_accounts")
@Getter
@Setter
@NoArgsConstructor
public class PointAccount {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false)
    private long balance;

    // 포인트를 준 누적 풀이 수. 이보다 많이 풀면 늘어난 만큼만 준다
    @Column(name = "solved_credited", nullable = false)
    private long solvedCredited;

    // 포인트를 준 등급 단계(동 쿠키 Ⅴ = 0, 루비 쿠키 Ⅰ = 24)
    @Column(name = "level_credited", nullable = false)
    private int levelCredited;

    @Column(name = "last_attend_date")
    private LocalDate lastAttendDate;

    @Column(name = "attend_streak", nullable = false)
    private int attendStreak;

    // 오늘의 퀘스트: 날짜, 그날 처음 정산할 때의 풀이 수(출발점), 받은 퀘스트(비트). 나중에 생긴 칸이라 비어 있을 수 있다
    @Column(name = "quest_date")
    private LocalDate questDate;

    @Column(name = "quest_base")
    private Long questBase;

    @Column(name = "quest_claimed")
    private Integer questClaimed;

    // 그날 처음 정산할 때의 solvedCredited. 하루에 포인트로 인정하는 새 풀이 수(PointService.DAILY_SOLVED_CAP)를 이 값에서 센다. 나중에 생긴 칸이라 비어 있을 수 있다
    @Column(name = "credited_base")
    private Long creditedBase;

    @Column(name = "updated_at")
    private Instant updatedAt;
}
