package com.csstudy.backend.controller;

import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.PointService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// 포인트와 상점. 로그인한 본인 것만 본다
@RestController
@RequestMapping("/api/v1/points")
@RequiredArgsConstructor
public class PointController {

    private final AuthService auth;
    private final PointService points;

    // 잔액 · 출석 · 보유 아이템 · 최근 내역 · 상점 목록. 열 때마다 새 풀이 · 승급 몫을 먼저 지급한다
    @GetMapping
    public PointService.Summary summary(HttpServletRequest request) {
        return points.summary(auth.requireUser(request));
    }

    // 출석. 화면이 로그인한 접속마다 자동으로 부른다. 오늘 이미 받았으면 0P로 돌려준다
    @PostMapping("/attend")
    public PointService.Attend attend(HttpServletRequest request) {
        return points.attend(auth.requireUser(request));
    }

    @PostMapping("/shop")
    public PointService.Summary buy(@RequestBody Map<String, String> body, HttpServletRequest request) {
        return points.buy(auth.requireUser(request), body == null ? null : body.get("item"));
    }
}
