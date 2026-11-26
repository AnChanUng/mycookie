package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// 건의 · 버그 제보를 GitHub 이슈로 올린다.
// 토큰(FEEDBACK_GITHUB_TOKEN)은 저장소의 Issues 쓰기 권한만 가진 fine-grained 토큰을 쓴다. 비어 있으면 꺼진다
@Component
public class GitHubIssueClient {

    public record Issue(int number, String url) {}

    private final RestTemplate http;
    private final String token;
    private final String repo;

    public GitHubIssueClient(RestTemplate http,
                             @Value("${app.feedback.github.token:}") String token,
                             @Value("${app.feedback.github.repo:AnChanUng/mycookie}") String repo) {
        this.http = http;
        this.token = token == null ? "" : token.trim();
        this.repo = repo;
    }

    public boolean enabled() {
        return !token.isBlank() && repo.matches("[\\w.-]+/[\\w.-]+");
    }

    /** 이슈를 만들고 번호와 주소를 돌려준다. 라벨이 저장소에 없으면 GitHub가 새로 만든다. */
    public Issue create(String title, String body, List<String> labels) {
        JsonNode res = http.postForObject("https://api.github.com/repos/" + repo + "/issues",
                new HttpEntity<>(Map.of("title", title, "body", body, "labels", labels), headers()), JsonNode.class);
        if (res == null || !res.hasNonNull("number")) throw new IllegalStateException("GitHub 응답에 이슈 번호가 없습니다.");
        return new Issue(res.get("number").asInt(), res.path("html_url").asText(""));
    }

    private static final Pattern SEQ = Pattern.compile("^#(\\d+)\\s");

    /**
     * 다음 이슈 제목에 붙일 순번(#순번). 이슈만 만든 순서대로 센 값이다(PR은 세지 않는다. GitHub 번호는 PR과 같이 늘어 건너뛴다).
     * 최근 이슈부터 보며 "#순번"이 붙은 마지막 이슈 + 그 뒤에 만들어진 이슈 수 + 1. 못 찾으면 이슈 전체 수 + 1.
     * .github/workflows/issue-number.yml도 같은 순번을 붙인다(이미 붙어 있으면 건너뛴다)
     */
    public int nextSequence() {
        int newer = 0;
        for (int page = 1; page <= 10; page++) {
            JsonNode items = http.exchange("https://api.github.com/repos/" + repo + "/issues?state=all&sort=created&direction=desc&per_page=100&page=" + page,
                    HttpMethod.GET, new HttpEntity<>(headers()), JsonNode.class).getBody();
            if (items == null || !items.isArray() || items.isEmpty()) break;
            for (JsonNode item : items) {
                if (item.has("pull_request")) continue;
                Matcher m = SEQ.matcher(item.path("title").asText(""));
                if (m.find()) return Integer.parseInt(m.group(1)) + newer + 1;
                newer++;
            }
        }
        return newer + 1;
    }

    private HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.parseMediaType("application/vnd.github+json")));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        return headers;
    }
}
