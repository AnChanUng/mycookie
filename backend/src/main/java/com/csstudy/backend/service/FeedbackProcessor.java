package com.csstudy.backend.service;

import com.csstudy.backend.entity.Feedback;
import com.csstudy.backend.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

// 저장된 제보 하나를 처리한다: GitHub 이슈를 만들고 Mattermost로 알린다.
// Kafka 소비자(FeedbackEventListener)나, Kafka가 꺼져 있을 때는 제보 요청 안에서 바로 불린다.
// 같은 제보를 여러 번 처리해도 안전하다(이슈 번호, 알린 시각을 DB에 남겨 이미 끝난 단계는 건너뛴다).
// 단계가 실패하면 예외를 던져 Kafka가 다시 시도하게 한다
@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackProcessor {

    public static final Map<String, String> KINDS = Map.of("feature", "기능개발", "bug", "버그");

    private final FeedbackRepository feedbacks;
    private final GitHubIssueClient github;
    private final MattermostService mattermost;

    /** 처리한 뒤의 제보(이슈 번호가 들어 있을 수 있다). 없는 번호면 null. */
    public Feedback process(long id) {
        Feedback f = ensureIssue(id);
        return f == null ? null : notifyOnce(f);
    }

    /** 알림만 보낸다(이슈는 이미 시도했을 때). 제보 요청 안에서 Kafka가 꺼져 있을 때 쓴다. */
    public Feedback notifyOnce(long id) {
        Feedback f = feedbacks.findById(id).orElse(null);
        return f == null ? null : notifyOnce(f);
    }

    private Feedback notifyOnce(Feedback f) {
        if (f.getNotifiedAt() == null && mattermost.enabled()) {
            mattermost.postNotice(notice(f));
            f.setNotifiedAt(Instant.now());
            f = feedbacks.save(f);
        }
        return f;
    }

    /**
     * GitHub 이슈만 만든다(이미 있으면 그대로). 제보 요청 안에서 불러 화면에 #순번을 바로 보여 준다.
     * 제목은 "#순번 [라벨] 제목". 순번을 못 정하면 순번 없이 만들고, 이슈 번호 워크플로가 나중에 붙인다
     */
    public Feedback ensureIssue(long id) {
        Feedback f = feedbacks.findById(id).orElse(null);
        if (f == null) {
            log.warn("제보 #{}을 찾지 못해 건너뜁니다", id);
            return null;
        }
        if (f.getIssueNumber() != null || !github.enabled()) return f;
        String label = KINDS.getOrDefault(f.getKind(), "기능개발");
        int seq = 0;
        try {
            seq = github.nextSequence();
        } catch (Exception e) {
            log.warn("제보 #{} 이슈 순번을 정하지 못해 순번 없이 만듭니다: {}", id, e.getMessage());
        }
        String title = (seq > 0 ? "#" + seq + " " : "") + "[" + label + "] " + neutralize(f.getTitle());
        GitHubIssueClient.Issue issue = github.create(title, issueBody(f), List.of(label));
        f.setIssueNumber(issue.number());
        f.setIssueUrl(issue.url());
        f.setIssueSeq(seq > 0 ? seq : null);
        return feedbacks.save(f);
    }

    // 공개 저장소에 올라가므로 사용자가 쓴 글은 인용으로 감싸고, @멘션 · 이슈 참조가 실제로 걸리지 않게 막는다.
    // 닉네임 · 방문자 ID 같은 개인 정보는 넣지 않는다
    public static String issueBody(Feedback f) {
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

    // Mattermost 알림. @channel 같은 멘션이 실제로 울리지 않게 막는다
    static String notice(Feedback f) {
        boolean bug = "bug".equals(f.getKind());
        String content = f.getContent().length() > 300 ? f.getContent().substring(0, 300) + "…" : f.getContent();
        StringBuilder t = new StringBuilder("#### ").append(bug ? ":bug: 새 버그 제보" : ":bulb: 새 기능 요청").append('\n')
                .append("**").append(neutralize(f.getTitle())).append("**\n")
                .append("> ").append(neutralize(content).replace("\n", "\n> ")).append("\n\n");
        if (f.getIssueUrl() != null) t.append("[GitHub 이슈 #").append(f.getIssueSeq() != null ? f.getIssueSeq() : f.getIssueNumber()).append("](").append(f.getIssueUrl()).append(")");
        else t.append("GitHub 이슈는 만들지 않았어요(토큰 없음) · 접수 번호 ").append(f.getId());
        if (f.getPath() != null) t.append(" | 화면 `").append(f.getPath().replace("`", "")).append('`');
        return t.toString();
    }

    static String neutralize(String s) {
        // 보이지 않는 문자를 끼워 @사용자 · #번호 링크가 걸리지 않게 한다
        return s.replace("@", "@​").replace("#", "#​");
    }
}
