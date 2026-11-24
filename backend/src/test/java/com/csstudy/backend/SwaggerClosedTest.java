package com.csstudy.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 비밀번호를 정하지 않은 서버(기본값)에서는 문서를 열지 않는다
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class SwaggerClosedTest {
    @Autowired MockMvc mvc;

    static String basic(String user, String password) {
        return "Basic " + java.util.Base64.getEncoder().encodeToString((user + ":" + password).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void docsStayClosedWithoutPassword() throws Exception {
        mvc.perform(get("/api/v3/api-docs")).andExpect(status().isNotFound());
        mvc.perform(get("/api/docs").header("Authorization", basic("mycookie", ""))).andExpect(status().isNotFound());
        mvc.perform(get("/api/swagger-ui/index.html")).andExpect(status().isNotFound());
    }
}
