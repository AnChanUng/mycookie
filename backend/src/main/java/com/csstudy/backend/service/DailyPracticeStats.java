package com.csstudy.backend.service;

import com.csstudy.backend.entity.DailyPracticeStat;
import com.csstudy.backend.repository.DailyPracticeStatRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 학습 메일의 연습 화면 반응 집계(연 횟수, 끝까지 푼 횟수). 개인을 식별하는 값은 저장하지 않는다
@Service
@RequiredArgsConstructor
public class DailyPracticeStats {

    public enum Kind { OPEN, FINISH }

    private final DailyPracticeStatRepository repository;
    private final NewsletterDailySets sets;

    /** 있는 세트(day)일 때만 센다. 없는 세트면 false. */
    public boolean record(int day, Kind kind) {
        if (sets.find(day).isEmpty()) return false;
        if (increment(day, kind) == 0) {
            try {
                repository.save(DailyPracticeStat.builder().dayNo(day).opens(0).finishes(0).build());
            } catch (DataIntegrityViolationException ignored) {
                // 동시에 다른 요청이 먼저 만들었다
            }
            increment(day, kind);
        }
        return true;
    }

    private int increment(int day, Kind kind) {
        return kind == Kind.OPEN ? repository.addOpen(day) : repository.addFinish(day);
    }

    /** 관리자 화면용: 세트별 연 횟수, 끝까지 푼 횟수, 완주율(%) */
    public Map<String, Object> summary() {
        List<Map<String, Object>> rows = new ArrayList<>();
        long opens = 0, finishes = 0;
        for (DailyPracticeStat s : repository.findAllByOrderByDayNoAsc()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("day", s.getDayNo());
            row.put("theme", sets.find(s.getDayNo()).map(NewsletterDailySets.DailySet::theme).orElse(""));
            row.put("opens", s.getOpens());
            row.put("finishes", s.getFinishes());
            row.put("rate", rate(s.getOpens(), s.getFinishes()));
            rows.add(row);
            opens += s.getOpens();
            finishes += s.getFinishes();
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("opens", opens);
        body.put("finishes", finishes);
        body.put("rate", rate(opens, finishes));
        body.put("sets", rows);
        return body;
    }

    private static Integer rate(long opens, long finishes) {
        return opens == 0 ? null : (int) Math.min(100, Math.round(finishes * 100.0 / opens));
    }
}
