package com.csstudy.backend;

import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.service.RoleService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 소유자 개인 자료(기술면접 질문)는 OWNER 권한 계정만 읽고 쓴다. 다른 계정과 로그인하지 않은 요청은 막힌다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OwnerDocumentTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RoleService roles;

    private String register(String nickname) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", nickname, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void onlyTheOwnerCanReadAndWritePrivateDocuments() throws Exception {
        String ordinary = register("일반문서손님");
        String owner = register("문서소유자");
        roles.grant("문서소유자", Role.OWNER);
        String body = "{\"data\":[{\"id\":\"t1\",\"title\":\"주제\",\"levels\":[]}]}";

        mvc.perform(get("/api/v1/private/docs/tech-interview")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/private/docs/tech-interview").header("Authorization", "Bearer " + ordinary)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/private/docs/tech-interview").header("Authorization", "Bearer " + ordinary)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());

        // 소유자: 처음에는 비어 있고, 저장하면 그대로 돌아오며, 캐시되지 않는다
        mvc.perform(get("/api/v1/private/docs/tech-interview").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").doesNotExist());
        mvc.perform(put("/api/v1/private/docs/tech-interview").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/private/docs/tech-interview").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].title").value("주제"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));

        // 배열이 아니거나 허용하지 않는 이름이면 받지 않는다
        mvc.perform(put("/api/v1/private/docs/tech-interview").header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON).content("{\"data\":{}}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/private/docs/other").header("Authorization", "Bearer " + owner)).andExpect(status().isNotFound());
    }
}
