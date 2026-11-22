package com.csstudy.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 관리자 작업(계정 생성, 권한 부여)은 기록으로 남고 관리자만 볼 수 있다. 비밀번호는 기록에 없다
@SpringBootTest(properties = "app.admin-key=audit-test-key-0123456789abcdef-xyz")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AdminAuditTest {

    static final String KEY = "audit-test-key-0123456789abcdef-xyz";
    @Autowired MockMvc mvc;

    @Test
    void adminActionsAreLoggedWithoutSecrets() throws Exception {
        mvc.perform(post("/api/v1/admin/accounts").header("X-Admin-Key", KEY).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"admin31\",\"password\":\"never-logged-pass\",\"roles\":[\"ADMIN\"]}")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/admin/roles").header("X-Admin-Key", KEY).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"admin31\",\"role\":\"TEAM\"}")).andExpect(status().isOk());

        mvc.perform(get("/api/v1/admin/audit")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/audit").header("X-Admin-Key", KEY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].action").value("권한 부여"))
                .andExpect(jsonPath("$[0].actor").value("홈서버(관리자 키)"))
                .andExpect(jsonPath("$[1].action").value("계정 생성"))
                .andExpect(content().string(not(containsString("never-logged-pass"))));

        mvc.perform(get("/api/v1/admin/system").header("X-Admin-Key", KEY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.links.repo").exists()).andExpect(jsonPath("$.accounts.users[0].tier").exists());
    }
}
