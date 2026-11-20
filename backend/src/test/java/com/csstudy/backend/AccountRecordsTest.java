package com.csstudy.backend;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountRecordsTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;

    private JsonNode auth(String path, String nickname, String password) throws Exception {
        String body = mvc.perform(post("/api/v1/auth/" + path)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", nickname, "password", password))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    @Test
    void passwordIsStoredHashedAndLoginStillWorks() throws Exception {
        auth("register", "hash-user", "pw123456");
        assertThat(userRepository.findByNickname("hash-user").orElseThrow().getPassword())
                .startsWith("$2").doesNotContain("pw123456");

        assertThat(auth("login", "hash-user", "pw123456").get("token").asText()).isNotBlank();
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", "hash-user", "password", "wrong"))))
                .andExpect(status().isBadRequest());
    }

    private org.springframework.test.web.servlet.ResultActions changePassword(String token, String current, String next) throws Exception {
        var request = post("/api/v1/auth/change-password").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("currentPassword", current, "newPassword", next)));
        return mvc.perform(token == null ? request : request.header("Authorization", bearer(token)));
    }

    @Test
    void passwordChangeNeedsLoginAndCurrentPasswordThenRevokesOtherSessions() throws Exception {
        JsonNode existing = auth("register", "reset-existing", "old-password");
        String secondToken = auth("login", "reset-existing", "old-password").get("token").asText();
        String otherToken = auth("register", "reset-other", "other-password").get("token").asText();

        String fresh = json.readTree(changePassword(existing.get("token").asText(), "old-password", "new-password")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();

        for (String token : new String[]{existing.get("token").asText(), secondToken}) {
            mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(token)))
                    .andExpect(status().isUnauthorized());
        }
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(fresh))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer(otherToken))).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", "reset-existing", "password", "old-password"))))
                .andExpect(status().isBadRequest());
        assertThat(auth("login", "reset-existing", "new-password").get("id")).isEqualTo(existing.get("id"));
    }

    @Test
    void nobodyCanChangeAnotherAccountsPassword() throws Exception {
        auth("register", "reset-victim", "victim-password");
        String attacker = auth("register", "reset-attacker", "attacker-password").get("token").asText();

        // 옛 재설정 주소는 없어졌고, 로그인 없이 바꿀 수도 없다
        mvc.perform(post("/api/v1/auth/reset-password").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", "reset-victim", "password", "hacked"))))
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isGreaterThanOrEqualTo(400));
        changePassword(null, "victim-password", "hacked").andExpect(status().isUnauthorized());
        // 본인 토큰이어도 현재 비밀번호가 틀리거나 비어 있으면 거절
        changePassword(attacker, "wrong", "hacked").andExpect(status().isBadRequest());
        changePassword(attacker, "", "hacked").andExpect(status().isBadRequest());

        auth("login", "reset-victim", "victim-password");
        auth("login", "reset-attacker", "attacker-password");
    }

    @Test
    void passwordChangeRejectsInvalidNewPasswords() throws Exception {
        String token = auth("register", "reset-invalid", "original-password").get("token").asText();
        for (String password : new String[]{" ", "가".repeat(25)}) {
            changePassword(token, "original-password", password).andExpect(status().isBadRequest());
        }
        auth("login", "reset-invalid", "original-password");
    }

    @Test
    void plaintextPasswordFromBeforeEncryptionIsUpgradedOnLogin() throws Exception {
        userRepository.save(User.builder().nickname("legacy-user").password("oldpw").build());

        auth("login", "legacy-user", "oldpw");
        assertThat(userRepository.findByNickname("legacy-user").orElseThrow().getPassword()).startsWith("$2");
        auth("login", "legacy-user", "oldpw");
    }

    @Test
    void examProgressIsSavedPerAccountAndNeedsLogin() throws Exception {
        String tokenA = auth("register", "exam-a", "password-for-tests").get("token").asText();
        String tokenB = auth("register", "exam-b", "password-for-tests").get("token").asText();
        String data = "{\"stats\":{\"q1\":{\"c\":0,\"w\":1,\"last\":\"w\"}},\"history\":[],\"updatedAt\":1}";

        mvc.perform(put("/api/v1/exam/progress/ibk").header("Authorization", bearer(tokenA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("data", data))))
                .andExpect(status().isOk());

        mvc.perform(get("/api/v1/exam/progress/ibk").header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.data").value(data));
        mvc.perform(get("/api/v1/exam/progress/ibk").header("Authorization", bearer(tokenB)))
                .andExpect(jsonPath("$.data").isEmpty());

        // 남의 userId를 넣어도 토큰 없이는 읽을 수 없다
        mvc.perform(get("/api/v1/exam/progress/ibk").param("userId", "1"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/exam/progress/ibk").header("Authorization", bearer("nope")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesToken() throws Exception {
        String token = auth("register", "logout-user", "password-for-tests").get("token").asText();
        mvc.perform(post("/api/v1/auth/logout").header("Authorization", bearer(token)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/exam/progress/ibk").header("Authorization", bearer(token)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void studyBookmarkAndGradesAreTrackedPerAccount() throws Exception {
        String tokenA = auth("register", "study-a", "password-for-tests").get("token").asText();
        String tokenB = auth("register", "study-b", "password-for-tests").get("token").asText();
        JsonNode questions = json.readTree(mvc.perform(get("/api/v1/questions"))
                .andReturn().getResponse().getContentAsString());
        assertThat(questions.size()).isGreaterThan(0);
        long id = questions.get(0).get("id").asLong();

        mvc.perform(post("/api/v1/questions/" + id + "/study").header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.studyCount").value(1));
        mvc.perform(post("/api/v1/questions/" + id + "/bookmark").header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.bookmarked").value(true));
        mvc.perform(post("/api/v1/questions/" + id + "/bookmark")).andExpect(status().isUnauthorized());

        mvc.perform(get("/api/v1/questions/" + id).header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.studyCount").value(1))
                .andExpect(jsonPath("$.bookmarked").value(true));
        mvc.perform(get("/api/v1/questions/" + id).header("Authorization", bearer(tokenB)))
                .andExpect(jsonPath("$.studyCount").value(0))
                .andExpect(jsonPath("$.bookmarked").value(false));

        mvc.perform(get("/api/v1/stats").header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.studiedQuestions").value(1));
        mvc.perform(get("/api/v1/stats").header("Authorization", bearer(tokenB)))
                .andExpect(jsonPath("$.studiedQuestions").value(0));

        mvc.perform(post("/api/v1/questions/" + id + "/grade").header("Authorization", bearer(tokenA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("userAnswer", "프로세스와 스레드의 차이를 설명합니다."))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/grading/stats").header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.totalAnswered").value(1));
        mvc.perform(get("/api/v1/grading/stats").header("Authorization", bearer(tokenB)))
                .andExpect(jsonPath("$.totalAnswered").value(0));
        mvc.perform(get("/api/v1/questions/" + id + "/answers").header("Authorization", bearer(tokenA)))
                .andExpect(jsonPath("$.length()").value(1));
    }
}
