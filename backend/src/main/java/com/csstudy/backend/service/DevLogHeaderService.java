package com.csstudy.backend.service;

import com.csstudy.backend.entity.DevLogHeader;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.DevLogHeaderRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

// 개발 일지 맨 위 안내 줄. 저장한 적이 없으면 기본 줄(Grafana, Swagger, 홈서버)을 보여 준다
@Service
public class DevLogHeaderService {

    static final int MAX_LINES = 12, MAX_LABEL = 40, MAX_VALUE = 300;
    static final List<Map<String, String>> DEFAULT_LINES = List.of(
            Map.of("label", "Grafana", "value", "https://grafana.mycookie.dev"),
            Map.of("label", "Swagger(API 문서, 개발 서버)", "value", "https://staging.mycookie.dev/api/docs"),
            Map.of("label", "홈서버", "value", "ssh@ip"));
    private static final TypeReference<List<Map<String, String>>> LINES = new TypeReference<>() {};

    private final DevLogHeaderRepository headers;
    private final ObjectMapper json;

    public DevLogHeaderService(DevLogHeaderRepository headers, ObjectMapper json) {
        this.headers = headers;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> get() {
        return headers.findFirstByOrderByIdAsc().map(this::view).orElseGet(() -> {
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("lines", DEFAULT_LINES);
            out.put("version", null);
            return out;
        });
    }

    @Transactional
    public Map<String, Object> save(Map<String, Object> body, User user) {
        List<Map<String, String>> lines = clean(body.get("lines"));
        Long version = body.get("version") instanceof Number n ? n.longValue() : null;
        DevLogHeader header = headers.findFirstByOrderByIdAsc().orElse(null);
        if (header == null) header = new DevLogHeader();
        else if (version == null || !version.equals(header.getVersion())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "다른 곳에서 먼저 고쳤어요. 새로고침한 뒤 다시 저장해 주세요.");
        }
        try { header.setLinesJson(json.writeValueAsString(lines)); }
        catch (JsonProcessingException e) { throw bad("안내 줄을 저장하지 못했어요."); }
        header.setUpdatedAt(Instant.now());
        header.setUpdatedBy(user.getNickname());
        return view(headers.saveAndFlush(header));
    }

    // 빈 줄은 버리고 정해진 길이로 자른다. 모든 줄을 지워 빈 목록으로 저장할 수도 있다
    private List<Map<String, String>> clean(Object raw) {
        if (!(raw instanceof List<?> list)) throw bad("안내 줄 형식이 맞지 않아요.");
        List<Map<String, String>> out = new ArrayList<>();
        for (Object o : list) {
            if (!(o instanceof Map<?, ?> m)) throw bad("안내 줄 형식이 맞지 않아요.");
            String label = trim(m.get("label"), MAX_LABEL), value = trim(m.get("value"), MAX_VALUE);
            if (label == null && value == null) continue;
            if (value == null) throw bad("'" + label + "' 줄의 내용을 입력해 주세요.");
            Map<String, String> line = new LinkedHashMap<>();
            line.put("label", label == null ? "" : label);
            line.put("value", value);
            out.add(line);
        }
        if (out.size() > MAX_LINES) throw bad("안내 줄은 " + MAX_LINES + "개까지 적을 수 있어요.");
        return out;
    }

    private Map<String, Object> view(DevLogHeader h) {
        List<Map<String, String>> lines;
        try { lines = json.readValue(h.getLinesJson(), LINES); } catch (JsonProcessingException e) { lines = List.of(); }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("lines", lines);
        out.put("version", h.getVersion());
        out.put("updatedAt", h.getUpdatedAt());
        out.put("updatedBy", h.getUpdatedBy());
        return out;
    }

    private static String trim(Object v, int max) {
        if (!(v instanceof String s) || s.isBlank()) return null;
        String t = s.trim().replaceAll("\\p{Cntrl}", " ");
        return t.length() > max ? t.substring(0, max) : t;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
