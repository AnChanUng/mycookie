package com.csstudy.backend.service;

import com.csstudy.backend.entity.MailFailure;
import com.csstudy.backend.repository.MailFailureRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 메일 발송 실패 기록과 관리자 요약. 실패는 로그에도 남긴다(받는 주소는 로그에 쓰지 않는다)
@Slf4j
@Service
public class MailFailures {

    static final Duration KEEP = Duration.ofDays(30);

    private final MailFailureRepository repository;

    public MailFailures(MailFailureRepository repository) {
        this.repository = repository;
    }

    /** 제목으로 어떤 메일인지 알아본다. */
    static String kindOf(String subject) {
        String s = subject == null ? "" : subject;
        if (s.contains("인증 번호")) return "인증 번호";
        if (s.contains("오늘의 학습") || s.contains("웹 필수지식")) return "학습 메일";
        if (s.contains("비밀번호")) return "비밀번호 재설정";
        if (s.contains("이메일")) return "이메일 인증";
        return "기타";
    }

    /** 실패 한 건을 저장한다. 기록하다가 또 실패해도 메일 발송 흐름에는 영향이 없게 한다. */
    public void record(String to, String subject, Exception error) {
        try {
            repository.save(MailFailure.builder().at(Instant.now()).recipient(cut(to, 254)).kind(kindOf(subject))
                    .subject(cut(subject, 200)).reason(reasonOf(error)).build());
        } catch (RuntimeException e) {
            log.warn("메일 발송 실패 기록을 저장하지 못했습니다: {}", e.getClass().getSimpleName());
        }
    }

    // 예외 이름과 짧은 메시지만. 줄바꿈은 한 줄로 합친다
    static String reasonOf(Exception error) {
        String message = error.getMessage() == null ? "" : error.getMessage().replaceAll("\\s+", " ").trim();
        return cut(error.getClass().getSimpleName() + (message.isEmpty() ? "" : ": " + message), 300);
    }

    private static String cut(String value, int max) {
        if (value == null) return "";
        return value.length() <= max ? value : value.substring(0, max - 1) + "…";
    }

    /** 관리자 화면용 요약: 최근 24시간·7일·30일 실패 건수, 종류별 건수, 최근 100건. */
    public Map<String, Object> summary() {
        Instant now = Instant.now();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("last24h", repository.countByAtAfter(now.minus(Duration.ofHours(24))));
        body.put("last7d", repository.countByAtAfter(now.minus(Duration.ofDays(7))));
        body.put("last30d", repository.countByAtAfter(now.minus(KEEP)));
        Map<String, Long> kinds = new LinkedHashMap<>();
        for (Object[] row : repository.countByKindSince(now.minus(KEEP))) kinds.put((String) row[0], (Long) row[1]);
        body.put("byKind", kinds);
        List<Map<String, Object>> recent = repository.findTop100ByOrderByIdDesc().stream().map(f -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("at", f.getAt());
            row.put("to", f.getRecipient());
            row.put("kind", f.getKind());
            row.put("subject", f.getSubject());
            row.put("reason", f.getReason());
            return row;
        }).toList();
        body.put("recent", recent);
        return body;
    }

    // 30일이 지난 실패 기록은 지운다
    @Scheduled(cron = "0 50 4 * * *", zone = "Asia/Seoul")
    @Transactional
    public void purge() {
        int removed = repository.deleteOlderThan(Instant.now().minus(KEEP));
        if (removed > 0) log.info("메일 발송 실패 기록 {}건 삭제", removed);
    }
}
