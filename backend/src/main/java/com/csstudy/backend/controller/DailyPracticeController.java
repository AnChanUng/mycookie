package com.csstudy.backend.controller;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.service.DailyPracticeStats;
import com.csstudy.backend.service.NewsletterDailySets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 학습 메일의 "오늘 주제 5문제 더 풀기"로 들어오는 화면이 쓰는 연습 문제. 메일 본문과 같은 공개 학습 자료라 로그인 없이 읽는다
@RestController
@RequestMapping("/api/v1/daily")
@RequiredArgsConstructor
public class DailyPracticeController {

    private final NewsletterDailySets sets;
    private final DailyPracticeStats stats;

    @GetMapping("/{day}")
    public ResponseEntity<Map<String, Object>> practice(@PathVariable int day) {
        NewsletterDailySets.DailySet set = sets.find(day).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND));
        List<NewsletterDailySets.Question> practice = set.practice();
        if (practice == null || practice.isEmpty()) throw new CookieException(CookieErrorCode.NOT_FOUND);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("day", set.day());
        body.put("theme", set.theme());
        body.put("blog", set.blog());
        body.put("practice", practice);
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic()).body(body);
    }

    /** 화면을 열었는지(open), 5문제를 끝까지 풀었는지(finish)만 센다. 개인 정보는 받지 않는다. */
    @PostMapping("/{day}/events")
    public ResponseEntity<Void> event(@PathVariable int day, @RequestBody Map<String, String> body) {
        String type = body == null ? null : body.get("type");
        DailyPracticeStats.Kind kind = "open".equals(type) ? DailyPracticeStats.Kind.OPEN
                : "finish".equals(type) ? DailyPracticeStats.Kind.FINISH : null;
        if (kind == null) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        if (!stats.record(day, kind)) throw new CookieException(CookieErrorCode.NOT_FOUND);
        return ResponseEntity.noContent().build();
    }
}
