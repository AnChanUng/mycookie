package com.csstudy.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 채팅 · 순위용 공개 프로필: 고른 아이콘 · 테두리만, 고른 사람만 돌려준다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PublicProfileTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String register(String name) throws Exception {
        return "Bearer " + json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void onlyAvatarAndFrameOfPeopleWhoChose() throws Exception {
        String a = register("공개아이콘가");
        register("공개아이콘나");
        mvc.perform(put("/api/v1/me/profile").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("avatar", "🦊", "bio", "비밀 소개", "goal", "비밀 목표", "interests", List.of("ai")))))
                .andExpect(status().isOk());
        // 로그인 없이 묻고, 고른 사람만 아이콘이 나온다. 소개 · 목표는 나오지 않는다
        mvc.perform(get("/api/v1/profiles/public").param("nicknames", "공개아이콘가", "공개아이콘나", "없는사람"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$['공개아이콘가'].avatar").value("🦊"))
                .andExpect(jsonPath("$['공개아이콘가'].frame").doesNotExist())
                .andExpect(jsonPath("$['공개아이콘가'].bio").doesNotExist())
                .andExpect(jsonPath("$['공개아이콘가'].goal").doesNotExist())
                .andExpect(jsonPath("$['공개아이콘나']").doesNotExist())
                .andExpect(jsonPath("$['없는사람']").doesNotExist());
        mvc.perform(get("/api/v1/profiles/public")).andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }
}
