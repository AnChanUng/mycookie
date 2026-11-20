package com.csstudy.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.*;

@SpringBootTest(properties = "app.admin-key=test-admin-key-0123456789abcdef-xyz")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountOperationsTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.csstudy.backend.repository.TierAwardRepository awards;
    static final String KEY = "test-admin-key-0123456789abcdef-xyz";

    @Test void testProfilesHaveSeparateTiersAndOnlyFirstTwoAreAdmins() throws Exception {
        String[] tiers = {"BRONZE", "SILVER", "GOLD", "DIAMOND", "RUBY"};
        mvc.perform(post("/api/v1/admin/test-accounts").contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"admin1\",\"password\":\"ck9\"}"))
            .andExpect(status().isUnauthorized());
        for (int i = 1; i <= 5; i++) {
            String name = "admin" + i;
            var result = mvc.perform(post("/api/v1/admin/test-accounts").header("X-Admin-Key", KEY)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("nickname", name, "password", "ck9"))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tier").value(tiers[i-1]));
            if (i <= 2) result.andExpect(jsonPath("$.roles", hasItem("ADMIN")));
            else result.andExpect(jsonPath("$.roles").isEmpty());
            var login = mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("nickname", name, "password", "ck9")))).andExpect(status().isOk());
            String token = json.readTree(login.andReturn().getResponse().getContentAsString()).get("token").asText();
            mvc.perform(put("/api/v1/rank/solved").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("visitorId", "test-profile-" + i, "count", 1000))))
                .andExpect(status().isOk());
            long userId=json.readTree(login.andReturn().getResponse().getContentAsString()).get("id").asLong();
            awards.saveAndFlush(new com.csstudy.backend.entity.TierAward("user:"+userId,24));
            mvc.perform(get("/api/v1/membership").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tier").value(tiers[i-1]));
            mvc.perform(put("/api/v1/auth/nickname").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"변경된테스트이름\"}"))
                .andExpect(status().isBadRequest());
            mvc.perform(get("/api/v1/rank/solved").param("all", "true").header("X-Visitor-Id", "test-profile-" + i))
                .andExpect(jsonPath("$.top[*].nickname", hasItem(name))).andExpect(jsonPath("$.me.nickname").value(name));
        }
        mvc.perform(post("/api/v1/admin/test-accounts").header("X-Admin-Key", KEY).contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"admin1\",\"password\":\"other\"}" )).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/admin/roles").header("X-Admin-Key", KEY).contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"admin5\",\"role\":\"ADMIN\"}")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/test-accounts/profile").header("X-Admin-Key", KEY).contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"admin5\"}")).andExpect(status().isOk())
            .andExpect(jsonPath("$.roles").isEmpty()).andExpect(jsonPath("$.tier").value("RUBY"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"admin5\",\"password\":\"ck9\"}")).andExpect(status().isOk());
    }

    @Test void signupRejectsShortPasswordsButKeepsSimpleValidSignup() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"가입규칙검사\",\"password\":\"short\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"가입규칙검사\",\"password\":\"long-enough-password\"}"))
            .andExpect(status().isOk());
    }
}
