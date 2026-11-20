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

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 관리자 계정과 권한: 예약 이름, 키로만 만드는 관리자 계정, 비밀번호 규칙, 관리자 로그인으로 관리자 API 열기
@SpringBootTest(properties = "app.admin-key=test-admin-key-0123456789abcdef-xyz")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountRoleTest {

    static final String KEY = "test-admin-key-0123456789abcdef-xyz";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.csstudy.backend.repository.UserRepository users;
    @Autowired com.csstudy.backend.repository.ExamProgressRepository progress;
    @Autowired com.csstudy.backend.controller.RankController ranks;

    private ResultActions postJson(String path, Object body, String key, String token) throws Exception {
        var req = post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (key != null) req.header("X-Admin-Key", key);
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }

    private String login(String nickname, String password) throws Exception {
        return json.readTree(postJson("/api/v1/auth/login", Map.of("nickname", nickname, "password", password), null, null)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private String register(String nickname) throws Exception {
        return json.readTree(postJson("/api/v1/auth/register", Map.of("nickname", nickname, "password", "test-password"), null, null)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    void reservedNamesCannotBeTakenByNormalSignupOrRename() throws Exception {
        for (String name : List.of("admin1", "Admin2", "ADMIN", "admin 3", "관리자", "운영자님")) {
            postJson("/api/v1/auth/register", Map.of("nickname", name, "password", "test-password"), null, null)
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("NICKNAME_RESERVED"));
        }
        String token = register("평범한사용자");
        mvc.perform(put("/api/v1/auth/nickname").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("nickname", "admin1")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("NICKNAME_RESERVED"));
    }

    @Test
    void adminAccountsAreCreatedOnlyWithTheKeyAndAStrongPassword() throws Exception {
        Map<String, Object> body = Map.of("nickname", "admin7", "password", "a-long-and-random-passphrase", "roles", List.of("ADMIN", "TEAM"));
        // 키 없이, 틀린 키로, 로그인한 일반 사용자로는 만들 수 없다
        postJson("/api/v1/admin/accounts", body, null, null).andExpect(status().isUnauthorized());
        postJson("/api/v1/admin/accounts", body, "wrong-key-wrong-key-wrong-key-wrong", null).andExpect(status().isUnauthorized());
        postJson("/api/v1/admin/accounts", body, null, register("키없는사용자")).andExpect(status().isUnauthorized());
        // 비어 있거나 아이디를 포함한 비밀번호는 거절(길이 제한은 없음)
        postJson("/api/v1/admin/accounts", Map.of("nickname", "admin8", "password", " ", "roles", "ADMIN"), KEY, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("WEAK_ADMIN_PASSWORD"));
        postJson("/api/v1/admin/accounts", Map.of("nickname", "admin8", "password", "admin8admin8admin8", "roles", "ADMIN"), KEY, null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("WEAK_ADMIN_PASSWORD"));
        // 관리자 계정 이름은 admin으로 시작해야 한다
        postJson("/api/v1/admin/accounts", Map.of("nickname", "그냥이름", "password", "a-long-and-random-passphrase", "roles", "ADMIN"), KEY, null)
                .andExpect(status().isBadRequest());

        postJson("/api/v1/admin/accounts", body, KEY, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("admin7")).andExpect(jsonPath("$.roles", hasItem("ADMIN")));
        postJson("/api/v1/admin/accounts", body, KEY, null).andExpect(status().isConflict());
        // 짧아도 아이디만 포함하지 않으면 된다
        postJson("/api/v1/admin/accounts", Map.of("nickname", "admin6", "password", "ck9", "roles", "ADMIN"), KEY, null).andExpect(status().isOk());

        String admin = login("admin7", "a-long-and-random-passphrase");
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + admin)).andExpect(jsonPath("$.roles", hasItem("TEAM")));
        // 관리자 로그인으로 관리자 API가 열리고, 일반 사용자는 막힌다
        mvc.perform(get("/api/v1/admin/system").header("Authorization", "Bearer " + admin)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/system").header("Authorization", "Bearer " + register("일반사용자2"))).andExpect(status().isUnauthorized());
        // 관리자로 로그인해도 계정 생성과 권한 부여는 키 없이는 못 한다
        postJson("/api/v1/admin/accounts", Map.of("nickname", "admin9", "password", "a-long-and-random-passphrase", "roles", "ADMIN"), null, admin)
                .andExpect(status().isUnauthorized());
        postJson("/api/v1/admin/roles", Map.of("nickname", "admin7", "role", "OWNER"), null, admin).andExpect(status().isUnauthorized());
        // 키가 맞으면 여전히 관리자 API를 쓸 수 있다(홈서버 스크립트)
        mvc.perform(get("/api/v1/admin/system").header("X-Admin-Key", KEY)).andExpect(status().isOk());
    }

    @Test
    void adminSolvesCountInTotalsAndInTheBoard() throws Exception {
        ranks.profileChanged(null);
        var before = json.readTree(mvc.perform(get("/api/v1/rank/solved")).andReturn().getResponse().getContentAsString());
        postJson("/api/v1/admin/accounts", Map.of("nickname", "admin11", "password", "rank-total-pass", "roles", List.of("ADMIN")), KEY, null)
                .andExpect(status().isOk());
        String admin = login("admin11", "rank-total-pass");
        mvc.perform(put("/api/v1/rank/solved").header("Authorization", "Bearer " + admin).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("visitorId", "admin-total-device", "count", 41)))).andExpect(status().isOk());
        // 관리자도 순위표와 참여자 수·전체 문제 수에 포함한다
        mvc.perform(get("/api/v1/rank/solved").param("all", "true"))
                .andExpect(jsonPath("$.top[*].nickname", hasItem("admin11")))
                .andExpect(jsonPath("$.totalSolvers").value(before.get("totalSolvers").asInt() + 1))
                .andExpect(jsonPath("$.totalSolved").value(before.get("totalSolved").asLong() + 41));
        var board = json.readTree(mvc.perform(get("/api/v1/rank/solved").param("all", "true")
                .header("X-Visitor-Id", "admin-total-device")).andReturn().getResponse().getContentAsString());
        long previous = Long.MAX_VALUE;
        for (var row : board.path("top")) {
            org.junit.jupiter.api.Assertions.assertTrue(row.path("count").asLong() <= previous);
            previous = row.path("count").asLong();
        }
        org.junit.jupiter.api.Assertions.assertEquals("admin11", board.path("me").path("nickname").asText());
        // 문제를 풀지 않은 관리자는 참여자로 세지 않는다
        postJson("/api/v1/admin/accounts", Map.of("nickname", "admin12", "password", "rank-total-pass", "roles", List.of("ADMIN")), KEY, null)
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/rank/solved").header("Authorization", "Bearer " + login("admin12", "rank-total-pass"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("visitorId", "admin-zero-device", "count", 0)))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/rank/solved"))
                .andExpect(jsonPath("$.totalSolvers").value(before.get("totalSolvers").asInt() + 1));
    }

    @Test
    void savedAccountProgressAppearsWithoutADeviceReport() throws Exception {
        String token = register("기기보고없는쿠키");
        var user = users.findByNickname("기기보고없는쿠키").orElseThrow();
        progress.saveAndFlush(com.csstudy.backend.entity.ExamProgress.builder().user(user)
                .company("spring").data("{\"stats\":{\"q1\":{\"c\":1},\"q2\":{\"w\":1}}}").build());
        ranks.profileChanged(null);
        mvc.perform(get("/api/v1/rank/solved").param("all", "true")
                .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.top[*].nickname", hasItem("기기보고없는쿠키")))
                .andExpect(jsonPath("$.me.nickname").value("기기보고없는쿠키"))
                .andExpect(jsonPath("$.me.count").value(2));
    }

    @Test
    void ownerWithAdminRoleAndANormalNameStaysOnTheBoard() throws Exception {
        String token = register("순위주인");
        postJson("/api/v1/admin/roles", Map.of("nickname", "순위주인", "role", "ADMIN"), KEY, null).andExpect(status().isOk());
        postJson("/api/v1/admin/roles", Map.of("nickname", "순위주인", "role", "OWNER"), KEY, null).andExpect(status().isOk());
        mvc.perform(put("/api/v1/rank/solved").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("visitorId", "owner-board-device", "count", 77)))).andExpect(status().isOk());
        // 관리 권한과 관계없이 문제 수 기준으로 순위에 나온다
        mvc.perform(get("/api/v1/rank/solved").param("all", "true"))
                .andExpect(jsonPath("$.top[*].nickname", hasItem("순위주인")));
    }

    @Test
    void rolesAreGrantedAndRevokedWithTheKey() throws Exception {
        String token = register("권한받을사람");
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.roles").isEmpty());
        postJson("/api/v1/admin/roles", Map.of("nickname", "권한받을사람", "role", "OWNER"), KEY, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles", hasItem("OWNER")));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.roles", hasItem("OWNER")));
        postJson("/api/v1/admin/roles", Map.of("nickname", "권한받을사람", "role", "OWNER", "grant", false), KEY, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.roles", not(hasItem("OWNER"))));
        postJson("/api/v1/admin/roles", Map.of("nickname", "권한받을사람", "role", "KING"), KEY, null).andExpect(status().isBadRequest());
        postJson("/api/v1/admin/roles", Map.of("nickname", "없는사람", "role", "TEAM"), KEY, null).andExpect(status().isNotFound());
    }
}
