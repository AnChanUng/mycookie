package com.csstudy.backend;

import com.csstudy.backend.entity.Question;
import com.csstudy.backend.repository.QuestionRepository;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.admin-key=test-admin-key")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminSystemTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired QuestionRepository questionRepository;

    @Test
    void systemRequiresTheKey() throws Exception {
        mvc.perform(get("/api/v1/admin/system")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/system").header("X-Admin-Key", "wrong")).andExpect(status().isUnauthorized());
    }

    @Test
    void accountsGradingAndHealthShowUp() throws Exception {
        String registered = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", "monitored-user", "password", "pw123456"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String bearer = "Bearer " + json.readTree(registered).get("token").asText();

        mvc.perform(put("/api/v1/exam/progress/hf").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("data", "{}"))))
                .andExpect(status().isOk());

        Question question = questionRepository.findAll().stream().findFirst().orElseThrow();
        mvc.perform(post("/api/v1/questions/" + question.getId() + "/grade").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("userAnswer", "프로세스와 스레드의 차이를 설명하는 답변입니다."))))
                .andExpect(status().isOk());

        String user = "$.accounts.users[?(@.nickname == 'monitored-user')]";
        mvc.perform(get("/api/v1/admin/system").header("X-Admin-Key", "test-admin-key"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(user + ".sessions").value(1))
                .andExpect(jsonPath(user + ".answers").value(1))
                .andExpect(jsonPath(user + ".examBanks").value(1))
                .andExpect(jsonPath(user + ".password").doesNotExist())
                .andExpect(jsonPath("$.accounts.joined24h").isNumber())
                .andExpect(jsonPath("$.grading.recent[0].nickname").value("monitored-user"))
                .andExpect(jsonPath("$.grading.recent[0].question").value(question.getTitle()))
                .andExpect(jsonPath("$.grading.grades.length()").value(5))
                .andExpect(jsonPath("$.examSync[?(@.company == 'hf')].count").value(1))
                .andExpect(jsonPath("$.chat.geminiConfigured").value(false))
                .andExpect(jsonPath("$.database.up").value(true))
                .andExpect(jsonPath("$.database.tables.users").isNumber())
                .andExpect(jsonPath("$.server.uptimeSeconds").isNumber());
    }
}
