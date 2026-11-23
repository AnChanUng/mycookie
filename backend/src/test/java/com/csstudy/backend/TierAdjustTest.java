package com.csstudy.backend;

import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.entity.TierAward;
import com.csstudy.backend.repository.TierAwardRepository;
import com.csstudy.backend.repository.UserRepository;
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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 관리자 페이지 "등급 조정": 최소 등급을 내리거나 올리고, 지우면 푼 문제 수대로 돌아간다. 일반 계정은 쓸 수 없다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TierAdjustTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RoleService roles;
    @Autowired UserRepository users;
    @Autowired TierAwardRepository awards;

    private String register(String nickname) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", nickname, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private org.springframework.test.web.servlet.ResultActions adjust(String token, Map<String, Object> body) throws Exception {
        return mvc.perform(post("/api/v1/admin/tier").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)));
    }

    @Test
    void adminCanLowerRaiseAndClearMinimumTier() throws Exception {
        String admin = register("tier-admin");
        roles.grant("tier-admin", Role.ADMIN);
        String other = register("tier-other");
        register("tier-target");
        long id = users.findByNickname("tier-target").orElseThrow().getId();
        // 시험 · 구매로 루비 Ⅰ 최소 등급이 있는 계정
        awards.saveAndFlush(new TierAward("user:" + id, 24));
        mvc.perform(get("/api/v1/admin/tier").param("nickname", "tier-target").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tier").value("RUBY")).andExpect(jsonPath("$.floor").value("루비 쿠키 Ⅰ"));

        // 일반 계정은 바꿀 수 없다
        adjust(other, Map.of("nickname", "tier-target", "tier", "BRONZE"))
                .andExpect(result -> assertTrue(result.getResponse().getStatus() >= 400));

        // 다이아 Ⅴ로 내린다
        adjust(admin, Map.of("nickname", "tier-target", "tier", "DIAMOND", "division", 5))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tier").value("DIAMOND")).andExpect(jsonPath("$.division").value(5))
                .andExpect(jsonPath("$.before.tier").value("RUBY")).andExpect(jsonPath("$.baseTier").value("BRONZE"));

        // 문제 수대로: 최소 등급을 지우면 0문제라 동 쿠키
        adjust(admin, Map.of("nickname", "tier-target", "tier", "AUTO"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tier").value("BRONZE")).andExpect(jsonPath("$.floor").doesNotExist());
        assertFalse(awards.findById("user:" + id).isPresent());

        // 잘못된 값 · 없는 계정
        adjust(admin, Map.of("nickname", "tier-target", "tier", "PLATINUM")).andExpect(status().isBadRequest());
        adjust(admin, Map.of("nickname", "tier-target", "tier", "GOLD", "division", 7)).andExpect(status().isBadRequest());
        adjust(admin, Map.of("nickname", "no-such-user", "tier", "GOLD")).andExpect(status().isNotFound());

        // 작업 기록에 남는다
        mvc.perform(get("/api/v1/admin/audit").header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$[?(@.action == '등급 조정')]").exists());
    }
}
