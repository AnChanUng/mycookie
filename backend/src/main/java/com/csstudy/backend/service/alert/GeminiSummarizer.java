package com.csstudy.backend.service.alert;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;

// 긴급 오류 알림에 붙일 요약을 Gemini(무료 등급)로 만든다. 키가 없거나 실패하면 빈 값을 돌려주고,
// 알림은 요약 없이 원본 증거만으로 나간다. 입력은 호출하는 쪽에서 LogMasking으로 가린 뒤 넘긴다
@Slf4j
@Component
public class GeminiSummarizer {

    static final String PROMPT = """
            당신은 나의쿠키(Spring Boot 3.5 + PostgreSQL + Redis + Kafka, 노트북 한 대의 홈서버) 운영 담당자입니다.
            아래는 방금 운영 서버에서 일어난 고위험 오류의 증거입니다. 당장 대응할 개발자가 30초 안에 읽을 요약을 한국어로 쓰세요.
            반드시 아래 다섯 줄 형식만 쓰고, 증거에 없는 내용은 추측이라고 밝히세요. 각 줄은 한 문장으로 짧게.
            - 무슨 일:
            - 영향:
            - 의심 원인:
            - 먼저 볼 곳:
            - 바로 할 조치:
            """;

    private final ObjectMapper json;
    private final String key, model;
    private final RestTemplate http;

    public GeminiSummarizer(ObjectMapper json, @Value("${gemini.api-key:}") String key,
                            @Value("${app.alert.gemini-model:gemini-2.5-flash}") String model) {
        this.json = json;
        this.key = key == null ? "" : key.trim();
        this.model = model;
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(20000);
        this.http = new RestTemplate(factory);
    }

    public boolean enabled() { return !key.isEmpty(); }

    public Optional<String> summarize(String maskedEvidence) {
        if (!enabled()) return Optional.empty();
        try {
            var headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", key);
            var body = Map.of(
                    "systemInstruction", Map.of("parts", List.of(Map.of("text", PROMPT))),
                    "contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", maskedEvidence)))),
                    "generationConfig", Map.of("temperature", 0.2, "maxOutputTokens", 1024));
            String raw = http.postForObject("https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    new HttpEntity<>(body, headers), String.class, model);
            JsonNode candidate = json.readTree(raw).path("candidates").path(0);
            var text = new StringBuilder();
            for (JsonNode part : candidate.path("content").path("parts"))
                if (!part.path("thought").asBoolean()) text.append(part.path("text").asText(""));
            String out = text.toString().trim();
            return out.isEmpty() ? Optional.empty() : Optional.of(out.length() > 1500 ? out.substring(0, 1500) + "…" : out);
        } catch (Exception e) {
            // 응답 본문과 키는 남기지 않는다. 오류 알림이 다시 오류 알림을 부르지 않게 WARN으로만 남긴다
            log.warn("Gemini 요약 실패({}), 원본 증거만 보냅니다", e.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
