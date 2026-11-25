package com.csstudy.backend.controller;

import com.csstudy.backend.entity.QuestionReport;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.repository.QuestionReportRepository;
import com.csstudy.backend.security.ClientAddress;
import com.csstudy.backend.security.DailyIpLimit;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.service.SlackService;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ReportController {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Set<String> KINDS = Set.of("answer", "typo", "explain", "etc");
    private static final int PER_VISITOR_PER_DAY = 20;
    private static final int LIST_LIMIT = 200;

    private final QuestionReportRepository reportRepository;
    private final SlackService slackService;
    private final AdminAuth adminAuth;
    private final ClientAddress addresses;

    // 방문자 ID는 바꿔 보낼 수 있어서 같은 곳(IP)에서 하루에 보낼 수 있는 수도 따로 막는다(Slack 알림 · GitHub 이슈 도배 방지)
    @Value("${app.security.reports-per-ip-per-day:30}")
    private int perIpPerDay = 30;
    private DailyIpLimit perIp;

    @PostConstruct
    void initLimit() { perIp = new DailyIpLimit(perIpPerDay); }

    // 누구나 부르는 제보 엔드포인트
    @PostMapping("/reports")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String visitorId = str(body.get("visitorId"), 40);
        String path = str(body.get("path"), 200);
        String questionId = str(body.get("questionId"), 40);
        String kind = str(body.get("kind"), 16);
        if (visitorId == null || questionId == null || path == null || !path.startsWith("/") || !KINDS.contains(kind)) {
            return ResponseEntity.badRequest().body(Map.of("error", "제보 내용을 확인해 주세요."));
        }

        LocalDate today = LocalDate.now(KST);
        if (reportRepository.countByVisitorIdAndDay(visitorId, today) >= PER_VISITOR_PER_DAY) {
            throw new CookieException(CookieErrorCode.REPORT_DAILY_LIMIT);
        }
        // 같은 문제에 아직 처리하지 않은 제보가 있으면 조용히 받아들인 것처럼 응답한다
        if (reportRepository.existsByQuestionIdAndPathAndHandledFalse(questionId, path)) {
            return ResponseEntity.ok(Map.of("ok", true, "duplicate", true));
        }
        if (!perIp.tryAcquire(addresses.resolve(request), today)) throw new CookieException(CookieErrorCode.REPORT_DAILY_LIMIT);

        QuestionReport saved = reportRepository.save(QuestionReport.builder()
                .visitorId(visitorId)
                .path(path)
                .questionId(questionId)
                .questionText(str(body.get("questionText"), 500))
                .kind(kind)
                .message(str(body.get("message"), 1000))
                .day(today)
                .createdAt(Instant.now())
                .build());

        // 알림이 꺼져 있거나 실패해도 제보 자체는 남는다
        try {
            slackService.sendQuestionReport(saved);
        } catch (Exception e) {
            log.warn("제보 Slack 알림 실패: {}", e.getMessage());
        }
        return ResponseEntity.ok(Map.of("ok", true, "duplicate", false));
    }

    @GetMapping("/admin/reports")
    public Map<String, Object> list(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("open", reportRepository.countByHandledFalse());
        out.put("total", reportRepository.count());
        out.put("last7d", reportRepository.countSince(LocalDate.now(KST).minusDays(6)));
        out.put("items", reportRepository.findByOrderByHandledAscIdDesc(PageRequest.of(0, LIST_LIMIT)).stream()
                .map(ReportController::row).toList());
        out.put("top", reportRepository.topReported(PageRequest.of(0, 15)).stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("questionId", r[0]);
            m.put("path", r[1]);
            m.put("count", r[2]);
            return m;
        }).toList());
        return out;
    }

    // 처리함 / 처리 안 함 표시를 바꾼다
    @PostMapping("/admin/reports/{id}")
    public Map<String, Object> update(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                      @PathVariable Long id,
                                      @RequestBody Map<String, Object> body) {
        adminAuth.require(key);
        QuestionReport report = reportRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "제보를 찾을 수 없습니다."));
        report.setHandled(Boolean.TRUE.equals(body.get("handled")));
        return row(reportRepository.save(report));
    }

    private static Map<String, Object> row(QuestionReport r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("at", r.getCreatedAt().toString());
        m.put("visitor", r.getVisitorId().substring(0, Math.min(8, r.getVisitorId().length())));
        m.put("path", r.getPath());
        m.put("questionId", r.getQuestionId());
        m.put("questionText", r.getQuestionText());
        m.put("kind", r.getKind());
        m.put("message", r.getMessage());
        m.put("handled", r.isHandled());
        return m;
    }

    private static String str(Object value, int max) {
        if (!(value instanceof String s)) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
