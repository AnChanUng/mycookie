package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.Semaphore;

@Service
public class StudyCoachService {
    public record Goal(String exam, int days, int minutes) {}
    public record Plan(List<String> subjects, String summary) {}
    static final Map<String, List<String>> SCOPES = Map.of(
        "backend", List.of("db", "net", "os", "pl", "ds"),
        "finance", List.of("db", "os", "net", "sec", "ds", "se", "pl", "bd"),
        "general", List.of("db", "os", "net", "ds", "sec", "se", "pl", "bd"),
        "interview", List.of("db", "net", "os", "ds", "pl"),
        "data", List.of("db", "bd", "pl", "ds"));
    private final ObjectMapper json;
    private final String key, model;
    private final RestTemplate http;
    private final Semaphore slots = new Semaphore(2);
    private final Map<Long, Deque<Long>> requests = new HashMap<>();

    public StudyCoachService(ObjectMapper json, @Value("${gemini.api-key:}") String key,
            @Value("${STUDY_COACH_MODEL:gemini-flash-lite-latest}") String model) {
        this.json = json; this.key = key; this.model = model;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000); factory.setReadTimeout(30000);
        this.http = new RestTemplate(factory);
    }
    public static void validate(Goal goal) {
        if (goal == null || goal.exam() == null || !SCOPES.containsKey(goal.exam()) || goal.days() < 0 || goal.days() > 730 || goal.minutes() < 15 || goal.minutes() > 180)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "시험 유형과 남은 일수, 공부 시간을 확인해 주세요.");
    }
    private synchronized void quota(long user) {
        long now = System.currentTimeMillis();
        requests.values().forEach(q -> { while (!q.isEmpty() && q.peekFirst() < now - 3600000) q.removeFirst(); });
        requests.values().removeIf(Deque::isEmpty);
        var q = requests.computeIfAbsent(user, ignored -> new ArrayDeque<>());
        if (q.size() >= 15 || (!q.isEmpty() && now - q.peekLast() < 5000))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해 주세요. AI 계획은 시간당 15회까지 만들 수 있어요.");
        q.addLast(now);
    }
    public Plan plan(long user, Goal goal) {
        validate(goal);
        if (key == null || key.isBlank()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI 연결이 준비되지 않았어요. 기본 계획으로 먼저 시작할 수 있습니다.");
        quota(user);
        if (!slots.tryAcquire()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "AI가 계획을 작성 중입니다. 잠시 후 다시 시도해 주세요.");
        try {
            // Only allowlisted goal enums/numbers leave the server. No user identifier, nickname or progress.
            String input = json.writeValueAsString(Map.of("goal", goal, "availableSubjects", SCOPES.get(goal.exam())));
            var schema = Map.of("type", "OBJECT", "properties", Map.of(
                "subjects", Map.of("type", "ARRAY", "items", Map.of("type", "STRING", "enum", SCOPES.get(goal.exam()))),
                "summary", Map.of("type", "STRING")), "required", List.of("subjects", "summary"));
            var body = Map.of("systemInstruction", Map.of("parts", List.of(Map.of("text",
                "한국어 CS 학습 코치다. db=DB,os=운영체제·컴퓨터구조,net=네트워크,ds=자료구조·알고리즘,sec=정보보호,se=소프트웨어공학,pl=프로그래밍,bd=빅데이터·AI. "
                + "주어진 시험 유형과 남은 기간, 하루 공부 시간에 맞춰 availableSubjects 전체를 중복 없이 우선순위대로 정렬한다. "
                + "summary는 오늘의 학습 방향과 이유를 한국어 2문장, 300자 이내로 설명한다. 개인의 약점이나 풀이 기록을 봤다고 주장하지 않는다. "
                + "기업별 출제 확률, 합격 가능성, 존재하지 않는 콘텐츠를 지어내지 않는다. 남은 기간이 짧으면 핵심 복습 중심, 여유가 있으면 기초 개념 중심으로 제안한다. "
                + "실제 문제 선택과 시간 배분은 서버 및 화면이 처리하므로 문제 번호, URL, 시간 배분은 생성하지 않는다."))),
                "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", input)))),
                "generationConfig", Map.of("temperature", 0.2, "maxOutputTokens", 2048, "responseMimeType", "application/json", "responseSchema", schema));
            var headers = new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON); headers.set("x-goog-api-key", key);
            String raw = http.postForObject("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", new HttpEntity<>(body, headers), String.class, model);
            JsonNode candidate = json.readTree(raw).path("candidates").path(0);
            if (!"STOP".equals(candidate.path("finishReason").asText())) throw new IllegalArgumentException();
            var text = new StringBuilder();
            for (JsonNode part : candidate.path("content").path("parts")) if (!part.path("thought").asBoolean()) text.append(part.path("text").asText(""));
            return validatedPlan(json.readTree(text.toString()), goal);
        } catch (Exception ex) {
            // Do not log requests, credentials or provider responses.
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "AI 응답을 확인하지 못했어요. 다시 시도하거나 기본 계획으로 시작해 주세요.");
        } finally { slots.release(); }
    }
    public static Plan validatedPlan(JsonNode result, Goal goal) {
        validate(goal);
        if (result == null || !result.path("subjects").isArray() || !result.path("summary").isTextual()) throw new IllegalArgumentException("Invalid plan");
        var ids = new ArrayList<String>();
        for (JsonNode id : result.path("subjects")) {
            if (!id.isTextual() || !SCOPES.get(goal.exam()).contains(id.asText()) || ids.contains(id.asText())) throw new IllegalArgumentException("Invalid subject");
            ids.add(id.asText());
        }
        String summary = result.path("summary").asText().trim();
        if (ids.size() != SCOPES.get(goal.exam()).size() || summary.isBlank() || summary.length() > 500) throw new IllegalArgumentException("Incomplete plan");
        return new Plan(List.copyOf(ids), summary);
    }
}
