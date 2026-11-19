package com.csstudy.backend.controller;

import com.csstudy.backend.entity.Feedback;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.FeedbackRepository;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.FeedbackEvents;
import com.csstudy.backend.service.FeedbackProcessor;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.Map;

// 건의사항 · 버그 제보. 저장한 뒤 GitHub 이슈로 올리고 Mattermost로 알려 운영자가 바로 개발 · 수정할 수 있게 한다.
// Kafka를 켜면 이벤트만 넣고 바로 답하며, 이슈와 알림은 소비자가 처리한다(FeedbackEvents, FeedbackProcessor).
// 제목 앞에 [기능개발] · [버그]를 붙이고 같은 이름의 라벨을 단다
@Slf4j
@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final Map<String, String> KINDS = FeedbackProcessor.KINDS;
    static final int PER_VISITOR_PER_DAY = 5;
    static final int SITE_PER_DAY = 100;

    private final FeedbackRepository feedbacks;
    private final FeedbackEvents events;
    private final FeedbackProcessor processor;
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
        if (events.publish(saved.getId())) {
            out.put("queued", true);
        } else {
            try {
                Feedback done = processor.process(saved.getId());
                if (done != null && done.getIssueNumber() != null) out.put("issue", done.getIssueNumber());
            } catch (Exception e) {
                // 이슈 생성이나 알림이 실패해도 제보는 DB에 남아 있으므로 사용자에게는 성공으로 알린다
                log.warn("제보 #{} 처리 실패: {}", saved.getId(), e.getMessage());
            }
        }
        return ResponseEntity.ok(out);
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
