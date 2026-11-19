package com.csstudy.backend.controller;

import com.csstudy.backend.entity.Feedback;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.FeedbackRepository;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.GitHubIssueClient;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 건의사항 · 버그 제보. 저장한 뒤 GitHub 이슈로 올려 운영자가 바로 개발 · 수정할 수 있게 한다.
// 제목 앞에 [기능개발] · [버그]를 붙이고 같은 이름의 라벨을 단다
@Slf4j
@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Map<String, String> KINDS = Map.of("feature", "기능개발", "bug", "버그");
    static final int PER_VISITOR_PER_DAY = 5;
    static final int SITE_PER_DAY = 100;

    private final FeedbackRepository feedbacks;
    private final GitHubIssueClient github;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String kind = str(body.get("kind"), 16);
        String title = oneLine(str(body.get("title"), 80));
        String content = str(body.get("content"), 2000);
        String visitorId = str(body.get("visitorId"), 40);
        String path = str(body.get("path"), 200);
        if (kind == null || !KINDS.containsKey(kind) || title == null || content == null || visitorId == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "종류, 제목, 내용을 모두 입력해 주세요."));
        }
        if (path != null && !path.startsWith("/")) path = null;

        LocalDate today = LocalDate.now(KST);
        if (feedbacks.countByVisitorIdAndDay(visitorId, today) >= PER_VISITOR_PER_DAY
                || feedbacks.countByDay(today) >= SITE_PER_DAY) {
            return ResponseEntity.status(429).body(Map.of("error", "오늘 보낼 수 있는 제보 수를 넘었습니다. 내일 다시 보내 주세요."));
        }

        String nickname = authService.currentUser(request).map(User::getNickname).orElse(null);
        Feedback saved = feedbacks.save(Feedback.builder()
                .kind(kind).title(title).content(content).path(path)
                .userAgent(str(request.getHeader("User-Agent"), 200))
                .visitorId(visitorId).nickname(nickname)
                .day(today).createdAt(Instant.now())
                .build());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("ok", true);
        if (github.enabled()) {
            try {
                String label = KINDS.get(kind);
                GitHubIssueClient.Issue issue = github.create("[" + label + "] " + neutralize(title), issueBody(saved), List.of(label));
                saved.setIssueNumber(issue.number());
                saved.setIssueUrl(issue.url());
                feedbacks.save(saved);
                out.put("issue", issue.number());
            } catch (Exception e) {
                // 이슈 생성이 실패해도 제보는 DB에 남아 있으므로 사용자에게는 성공으로 알린다
                log.warn("제보 #{} GitHub 이슈 생성 실패: {}", saved.getId(), e.getMessage());
            }
        }
        return ResponseEntity.ok(out);
    }

    // 공개 저장소에 올라가므로 사용자가 쓴 글은 인용으로 감싸고, @멘션 · 이슈 참조가 실제로 걸리지 않게 막는다.
    // 닉네임 · 방문자 ID 같은 개인 정보는 넣지 않는다
    static String issueBody(Feedback f) {
        StringBuilder b = new StringBuilder();
        b.append("> ").append(neutralize(f.getContent()).replace("\n", "\n> ")).append("\n\n");
        b.append("| 항목 | 값 |\n|---|---|\n");
        b.append("| 화면 | ").append(f.getPath() == null ? "-" : "`" + f.getPath().replace("`", "") + "`").append(" |\n");
        b.append("| 브라우저 | ").append(f.getUserAgent() == null ? "-" : neutralize(f.getUserAgent()).replace("|", "/")).append(" |\n");
        b.append("| 로그인 | ").append(f.getNickname() == null ? "아니요" : "예").append(" |\n");
        b.append("| 접수 번호 | ").append(f.getId()).append(" |\n\n");
        b.append("_나의쿠키 사이트의 건의 · 제보 양식으로 접수된 이슈입니다._");
        return b.toString();
    }

    private static String neutralize(String s) {
        // 보이지 않는 문자를 끼워 @사용자 · #번호 링크가 걸리지 않게 한다
        return s.replace("@", "@​").replace("#", "#​");
    }

    private static String oneLine(String s) {
        return s == null ? null : s.replaceAll("[\\r\\n\\t]+", " ").trim();
    }

    private static String str(Object value, int max) {
        if (!(value instanceof String s)) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
