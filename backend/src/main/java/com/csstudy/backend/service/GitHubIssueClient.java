package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

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
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.parseMediaType("application/vnd.github+json")));
        headers.set("X-GitHub-Api-Version", "2022-11-28");
        JsonNode res = http.postForObject("https://api.github.com/repos/" + repo + "/issues",
                new HttpEntity<>(Map.of("title", title, "body", body, "labels", labels), headers), JsonNode.class);
        if (res == null || !res.hasNonNull("number")) throw new IllegalStateException("GitHub 응답에 이슈 번호가 없습니다.");
        return new Issue(res.get("number").asInt(), res.path("html_url").asText(""));
    }
}
