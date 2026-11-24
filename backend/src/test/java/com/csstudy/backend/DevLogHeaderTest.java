package com.csstudy.backend;

import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.repository.DevLogHeaderRepository;
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

// 개발 일지 맨 위 안내 줄: TEAM은 읽기만, 저장소 주인(OWNER)은 고치고 지울 수 있다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DevLogHeaderTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired DevLogHeaderRepository headers;
    @Autowired com.csstudy.backend.service.RoleService roles;

    private String register(String name) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private ResultActions put(String token, Map<String, Object> body) throws Exception {
        var req = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/devlog/header")
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }

    @Test
    void ownerEditsAndDeletesLinesTeamOnlyReads() throws Exception {
        headers.deleteAll();
        String team = register("머리줄보민"), owner = register("머리줄찬웅"), stranger = register("머리줄손님");
        roles.grant("머리줄보민", Role.TEAM);
        roles.grant("머리줄찬웅", Role.TEAM);
        roles.grant("머리줄찬웅", Role.OWNER);

        mvc.perform(get("/api/v1/devlog/header")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/devlog/header").header("Authorization", "Bearer " + stranger)).andExpect(status().isForbidden());
        // 저장한 적이 없으면 기본 줄을 보여 준다
        mvc.perform(get("/api/v1/devlog/header").header("Authorization", "Bearer " + team))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].label").value("Grafana"))
                .andExpect(jsonPath("$.lines[2].value").value("ssh@ip"))
                .andExpect(jsonPath("$.canEdit").value(false));

        var lines = List.of(Map.of("label", "Grafana", "value", "https://grafana.mycookie.dev"),
                Map.of("label", "홈서버", "value", "ssh cookie@100.64.0.1"), Map.of("label", "", "value", ""));
        put(team, Map.of("lines", lines)).andExpect(status().isForbidden());
        put(owner, Map.of("lines", lines)).andExpect(status().isOk())
                .andExpect(jsonPath("$.lines.length()").value(2))   // 빈 줄은 버린다
                .andExpect(jsonPath("$.lines[1].value").value("ssh cookie@100.64.0.1"))
                .andExpect(jsonPath("$.version").value(0));
        mvc.perform(get("/api/v1/devlog/header").header("Authorization", "Bearer " + owner))
                .andExpect(jsonPath("$.canEdit").value(true)).andExpect(jsonPath("$.lines.length()").value(2));

        // 옛 version으로 저장하면 충돌, 맞는 version이면 줄을 지울 수 있다
        put(owner, Map.of("lines", List.of(), "version", 99)).andExpect(status().isConflict());
        put(owner, Map.of("lines", List.of(Map.of("label", "Grafana", "value", "https://grafana.mycookie.dev")), "version", 0))
                .andExpect(status().isOk()).andExpect(jsonPath("$.lines.length()").value(1));
        put(owner, Map.of("lines", List.of(Map.of("label", "빈 내용", "value", " ")), "version", 1)).andExpect(status().isBadRequest());
        // TEAM도 바뀐 줄을 본다
        mvc.perform(get("/api/v1/devlog/header").header("Authorization", "Bearer " + team))
                .andExpect(jsonPath("$.lines.length()").value(1)).andExpect(jsonPath("$.updatedBy").value("머리줄찬웅"));
    }
}
