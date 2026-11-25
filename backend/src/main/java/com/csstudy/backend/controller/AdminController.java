package com.csstudy.backend.controller;

import com.csstudy.backend.dto.GradeResponse;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.*;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.chatbot.ChatbotStats;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.lang.management.ManagementFactory;
import java.lang.management.RuntimeMXBean;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

// 이용 현황(UsageController) 밖의 나머지: 계정, 면접 답변 채점, 챗봇, DB, 서버
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private static final int USER_LIMIT = 200;

    private final AdminAuth adminAuth;
    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final AnswerRepository answerRepository;
    private final ExamProgressRepository examProgressRepository;
    private final UserQuestionProgressRepository userQuestionProgressRepository;
    private final QuestionRepository questionRepository;
    private final CategoryRepository categoryRepository;
    private final UsageEventRepository usageEventRepository;
    private final QuestionReportRepository questionReportRepository;
    private final ChatbotStats chatbotStats;
    private final JdbcTemplate jdbcTemplate;
    private final com.csstudy.backend.repository.AdminAuditLogRepository auditLogs;
    private final com.csstudy.backend.service.MailFailures mailFailures;
    private final com.csstudy.backend.service.DailyPracticeStats dailyPracticeStats;

    @Value("${slack.enabled:false}")
    private boolean slackEnabled;

    // 관리자 페이지 바로가기. 비어 있으면 그 링크는 보이지 않는다(GRAFANA_URL)
    @Value("${app.alert.grafana-url:}")
    private String grafanaUrl;

    @GetMapping("/system")
    public Map<String, Object> system(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("accounts", accounts());
        body.put("grading", grading());
        body.put("examSync", pairs(examProgressRepository.countByCompany(), "company"));
        body.put("openReports", questionReportRepository.countByHandledFalse());
        body.put("chat", chatbotStats.adminStatus());
        body.put("slackEnabled", slackEnabled);
        body.put("database", database());
        body.put("server", server());
        body.put("links", Map.of("grafana", grafanaUrl == null ? "" : grafanaUrl.trim(), "repo", "https://github.com/AnChanUng/mycookie"));
        return body;
    }

    // 메일 발송 실패 현황: 최근 24시간·7일·30일 건수, 종류별 건수, 최근 실패 100건(받는 주소와 오류 요약)
    @GetMapping("/mail-failures")
    public Map<String, Object> mailFailures(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        return mailFailures.summary();
    }

    // 학습 메일 연습 화면 반응: 세트별로 연 횟수, 끝까지 푼 횟수, 완주율
    @GetMapping("/daily-practice")
    public Map<String, Object> dailyPractice(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        return dailyPracticeStats.summary();
    }

    // 관리자 작업 기록(최근 100개)
    @GetMapping("/audit")
    public List<Map<String, Object>> audit(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        return auditLogs.findTop100ByOrderByIdDesc().stream().map(a -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("at", a.getAt());
            row.put("actor", a.getActor());
            row.put("action", a.getAction());
            row.put("target", a.getTarget());
            return row;
        }).toList();
    }

    private Map<String, Object> accounts() {
        Map<Object, Object[]> tokens = byUser(authTokenRepository.summaryByUser());
        Map<Object, Object[]> answers = byUser(answerRepository.summaryByUser());
        Map<Object, Object[]> exams = byUser(examProgressRepository.summaryByUser());
        Map<Object, Object[]> studied = byUser(userQuestionProgressRepository.summaryByUser());

        List<Map<String, Object>> users = new ArrayList<>();
        for (User u : userRepository.findByOrderByIdDesc(PageRequest.of(0, USER_LIMIT))) {
            Object[] t = tokens.get(u.getId());
            Object[] a = answers.get(u.getId());
            Object[] e = exams.get(u.getId());
            Object[] s = studied.get(u.getId());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", u.getId());
            row.put("nickname", u.getNickname());
            row.put("joinedAt", iso(u.getCreatedAt()));
            row.put("tier", com.csstudy.backend.service.MembershipService.baseTier(u).name());
            row.put("sessions", t == null ? 0 : t[1]);
            row.put("lastLoginAt", t == null ? null : iso((LocalDateTime) t[2]));
            row.put("answers", a == null ? 0 : a[1]);
            row.put("avgScore", a == null ? null : round(a[2]));
            row.put("examBanks", e == null ? 0 : e[1]);
            row.put("lastExamSaveAt", e == null ? null : iso((LocalDateTime) e[2]));
            row.put("studied", s == null ? 0 : s[1]);
            row.put("bookmarks", s == null ? 0 : s[2]);
            users.add(row);
        }

        LocalDateTime now = LocalDateTime.now();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", userRepository.count());
        m.put("joined24h", userRepository.countByCreatedAtGreaterThanEqual(now.minusDays(1)));
        m.put("joined7d", userRepository.countByCreatedAtGreaterThanEqual(now.minusDays(7)));
        m.put("sessions", authTokenRepository.count());
        m.put("users", users);
        return m;
    }

    private Map<String, Object> grading() {
        Map<String, Long> grades = new LinkedHashMap<>();
        for (String g : List.of("A", "B", "C", "D", "F")) grades.put(g, 0L);
        answerRepository.findRecentScores().forEach(s -> grades.merge(GradeResponse.calculateGrade(s), 1L, Long::sum));

        LocalDateTime now = LocalDateTime.now();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", answerRepository.count());
        m.put("anonymous", answerRepository.countByUserIsNull());
        m.put("last24h", answerRepository.countByCreatedAtGreaterThanEqual(now.minusDays(1)));
        m.put("last7d", answerRepository.countByCreatedAtGreaterThanEqual(now.minusDays(7)));
        m.put("avgScore", round(answerRepository.findOverallAverageScore()));
        m.put("grades", grades);
        m.put("recent", answerRepository.recentForAdmin(PageRequest.of(0, 50)).stream().map(r -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("at", iso((LocalDateTime) r[0]));
            row.put("nickname", r[1]);
            row.put("question", r[2]);
            row.put("score", r[3]);
            return row;
        }).toList());
        m.put("topQuestions", answerRepository.topQuestions(PageRequest.of(0, 15)).stream().map(r -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("question", r[0]);
            row.put("count", r[1]);
            row.put("avgScore", round(r[2]));
            return row;
        }).toList());
        return m;
    }

    private Map<String, Object> database() {
        Map<String, Object> m = new LinkedHashMap<>();
        long started = System.nanoTime();
        try {
            jdbcTemplate.queryForObject("select 1", Integer.class);
            m.put("up", true);
            m.put("pingMs", (System.nanoTime() - started) / 1_000_000);
        } catch (Exception e) {
            m.put("up", false);
            m.put("pingMs", null);
        }
        m.put("sizeMb", sizeMb());

        Map<String, Long> tables = new LinkedHashMap<>();
        tables.put("users", userRepository.count());
        tables.put("auth_tokens", authTokenRepository.count());
        tables.put("usage_events", usageEventRepository.count());
        tables.put("answers", answerRepository.count());
        tables.put("exam_progress", examProgressRepository.count());
        tables.put("user_question_progress", userQuestionProgressRepository.count());
        tables.put("question_reports", questionReportRepository.count());
        tables.put("questions", questionRepository.count());
        tables.put("categories", categoryRepository.count());
        m.put("tables", tables);
        return m;
    }

    // PostgreSQL에서만 되는 조회라 다른 DB(테스트용 H2)에서는 비워 둔다
    private Long sizeMb() {
        try {
            Long bytes = jdbcTemplate.queryForObject("select pg_database_size(current_database())", Long.class);
            return bytes == null ? null : bytes / (1024 * 1024);
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> server() {
        Runtime rt = Runtime.getRuntime();
        RuntimeMXBean mx = ManagementFactory.getRuntimeMXBean();
        double load = ManagementFactory.getOperatingSystemMXBean().getSystemLoadAverage();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("startedAt", Instant.ofEpochMilli(mx.getStartTime()).toString());
        m.put("uptimeSeconds", mx.getUptime() / 1000);
        m.put("memoryUsedMb", (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024));
        m.put("memoryMaxMb", rt.maxMemory() / (1024 * 1024));
        m.put("processors", rt.availableProcessors());
        m.put("loadAverage", load < 0 ? null : Math.round(load * 100) / 100.0);
        m.put("threads", ManagementFactory.getThreadMXBean().getThreadCount());
        m.put("java", System.getProperty("java.version"));
        return m;
    }

    private static Map<Object, Object[]> byUser(List<Object[]> rows) {
        Map<Object, Object[]> map = new HashMap<>();
        rows.forEach(r -> map.put(r[0], r));
        return map;
    }

    private static List<Map<String, Object>> pairs(List<Object[]> rows, String name) {
        return rows.stream().map(r -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put(name, r[0]);
            row.put("count", r[1]);
            return row;
        }).toList();
    }

    // 엔티티 시각은 서버 시간대의 LocalDateTime이라, 화면에서 한국 시간으로 바꿀 수 있게 UTC 시각으로 내보낸다
    private static String iso(LocalDateTime at) {
        return at == null ? null : at.atZone(ZoneId.systemDefault()).toInstant().toString();
    }

    private static Long round(Object value) {
        return value == null ? null : Math.round(((Number) value).doubleValue());
    }
}
