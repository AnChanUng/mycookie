package com.csstudy.backend;

import com.csstudy.backend.repository.DevLogEntryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DevLogTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired DevLogEntryRepository entries;

    private static String editor;

    @BeforeEach
    void setUp() throws Exception {
        entries.deleteAll();
        if (editor == null) editor = register("일지보민");
    }

    private String register(String name) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions put(String token, String date, Map<String, Object> body) throws Exception {
        var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/devlog/" + date)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }

    private JsonNode read(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    private static Map<String, Object> day(Long version, boolean firstDone, boolean subDone) {
        Map<String, Object> body = new java.util.HashMap<>(Map.of("title", "개발 1일차", "owner", "보민", "items", List.of(
                Map.of("id", "a", "text", "전체 흐름 파악하기", "note", "온보딩 읽기", "done", firstDone),
                Map.of("id", "b", "text", "필수 기능", "done", false, "sub", List.of(
                        Map.of("id", "b1", "text", "SSAFY 로그인", "done", subDone),
                        Map.of("id", "b2", "text", "신규 기능", "done", subDone, "extra", "버려짐"))))));
        if (version != null) body.put("version", version);
        return body;
    }

    @Test
    void anyoneReadsAndWrites() throws Exception {
        mvc.perform(get("/api/v1/devlog")).andExpect(status().isOk())
                .andExpect(jsonPath("$.canEdit").value(true)).andExpect(jsonPath("$.entries").isEmpty());

        // 로그인하지 않아도 저장된다(수정한 사람은 비어 있음)
        JsonNode anon = read(put(null, "2026-11-20", day(null, true, false)).andExpect(status().isOk()));
        assertThat(anon.get("complete").asBoolean()).isFalse();
        assertThat(anon.get("updatedBy").isNull()).isTrue();
        assertThat(anon.at("/items/1/sub/1").has("extra")).as("unknown fields are dropped").isFalse();

        // 로그인했으면 닉네임을 남긴다
        JsonNode signed = read(put(editor, "2026-11-20", day(anon.get("version").asLong(), true, true)).andExpect(status().isOk()));
        assertThat(signed.get("updatedBy").asText()).isEqualTo("일지보민");
        mvc.perform(get("/api/v1/devlog")).andExpect(jsonPath("$.entries[0].items[0].note").value("온보딩 읽기"));

        mvc.perform(delete("/api/v1/devlog/2026-11-20")).andExpect(status().isOk());
        assertThat(entries.count()).isZero();
    }

    @Test
    void staleVersionIsRejected() throws Exception {
        long v = read(put(editor, "2026-11-21", day(null, false, false))).get("version").asLong();
        put(editor, "2026-11-21", day(v, true, false)).andExpect(status().isOk());
        put(editor, "2026-11-21", day(v, false, true)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("다른 사람이 먼저 고쳤어요. 새로고침한 뒤 다시 저장해 주세요."));
        put(editor, "2026-11-21", day(null, false, true)).andExpect(status().isConflict());
    }

    @Test
    void completeOnlyWhenEveryLeafIsDone() throws Exception {
        long v = read(put(editor, "2026-11-22", day(null, true, false))).get("version").asLong();
        assertThat(read(put(editor, "2026-11-22", day(v, true, true))).get("complete").asBoolean()).isTrue();
    }

    @Test
    void rejectsBadInput() throws Exception {
        put(editor, "20261120", day(null, false, false)).andExpect(status().isBadRequest());
        put(editor, "2026-11-24", Map.of("title", "", "items", List.of())).andExpect(status().isBadRequest());
        put(editor, "2026-11-24", Map.of("title", "빈 칸", "items", List.of(Map.of("text", " ")))).andExpect(status().isBadRequest());
        // 할 일이 없으면 완료로 치지 않는다
        JsonNode empty = read(put(editor, "2026-11-24", Map.of("title", "빈 날", "items", List.of())).andExpect(status().isOk()));
        assertThat(empty.get("complete").asBoolean()).isFalse();
    }
}
