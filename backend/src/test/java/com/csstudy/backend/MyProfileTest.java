package com.csstudy.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 마이페이지 프로필 꾸미기: 본인만 읽고 고치며, 정해 둔 아이콘 · 관심 분야만 받는다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MyProfileTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String register(String name) throws Exception {
        return "Bearer " + json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions put(String token, Map<String, Object> body) throws Exception {
        var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile")
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", token);
        return mvc.perform(req);
    }

    @Test
    void ownerEditsOwnProfileOnly() throws Exception {
        String a = register("프로필가"), b = register("프로필나");
        mvc.perform(get("/api/v1/me/profile")).andExpect(status().isUnauthorized());
        // 처음에는 빈 프로필
        mvc.perform(get("/api/v1/me/profile").header("Authorization", a))
                .andExpect(status().isOk()).andExpect(jsonPath("$.avatar").doesNotExist()).andExpect(jsonPath("$.interests.length()").value(0));

        put(a, Map.of("avatar", "🦊", "bio", "  백엔드\n개발자 준비 중  ", "goal", "올해 금 쿠키", "interests", List.of("backend", "ai", "backend")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").value("🦊"))
                .andExpect(jsonPath("$.bio").value("백엔드 개발자 준비 중"))
                .andExpect(jsonPath("$.interests.length()").value(2));
        mvc.perform(get("/api/v1/me/profile").header("Authorization", a)).andExpect(jsonPath("$.goal").value("올해 금 쿠키"));
        // 다른 사람은 내 프로필과 상관없이 자기 것만 본다
        mvc.perform(get("/api/v1/me/profile").header("Authorization", b)).andExpect(jsonPath("$.avatar").doesNotExist());

        put(a, Map.of("avatar", "💩")).andExpect(status().isBadRequest());
        put(a, Map.of("interests", List.of("hacking"))).andExpect(status().isBadRequest());
        put(a, Map.of("interests", List.of("backend", "frontend", "ai", "data", "cloud", "security"))).andExpect(status().isBadRequest());
        put(a, Map.of("bio", "가".repeat(61))).andExpect(status().isBadRequest());
        // 비우면 지워진다
        put(a, Map.of("bio", "", "interests", List.of())).andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").doesNotExist()).andExpect(jsonPath("$.interests.length()").value(0));
    }

    @Test
    void themesAndFramesUnlockWithTier() throws Exception {
        String t = register("해금테스터");
        // 처음(동 쿠키)에는 기본 테마만
        put(t, Map.of("theme", "cookie", "frame", "none")).andExpect(status().isOk()).andExpect(jsonPath("$.theme").value("cookie"));
        put(t, Map.of("theme", "gold")).andExpect(status().isBadRequest());
        put(t, Map.of("frame", "silver")).andExpect(status().isBadRequest());
        put(t, Map.of("theme", "rainbow")).andExpect(status().isBadRequest());
        // 160문제를 풀면 금 쿠키: 금 테마 · 금 테두리가 열리고, 다이아는 아직
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/rank/solved").header("Authorization", t)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("visitorId", "unlock-device-1", "count", 160))))
                .andExpect(status().isOk());
        put(t, Map.of("theme", "gold", "frame", "gold")).andExpect(status().isOk())
                .andExpect(jsonPath("$.theme").value("gold")).andExpect(jsonPath("$.frame").value("gold"));
        put(t, Map.of("theme", "diamond")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/me/profile").header("Authorization", t)).andExpect(jsonPath("$.frame").value("gold"));
    }
}
