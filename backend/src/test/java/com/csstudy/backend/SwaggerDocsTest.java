package com.csstudy.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"app.swagger.user=docs", "app.swagger.password=docs-test-pass"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SwaggerDocsTest {
    @Autowired MockMvc mvc;

    static String basic(String user, String password) {
        return "Basic " + java.util.Base64.getEncoder().encodeToString((user + ":" + password).getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    @Test
    void docsNeedTheTeamPassword() throws Exception {
        mvc.perform(get("/api/v3/api-docs")).andExpect(status().isUnauthorized())
                .andExpect(header().string("WWW-Authenticate", containsString("Basic")));
        mvc.perform(get("/api/v3/api-docs").header("Authorization", basic("docs", "wrong"))).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v3/api-docs").header("Authorization", basic("docs", "docs-test-pass")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("나의쿠키 API"))
                .andExpect(jsonPath("$.paths['/api/v1/direct']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.adminKey.name").value("X-Admin-Key"))
                .andExpect(jsonPath("$.servers[0].url").value("/"));
        mvc.perform(get("/api/docs").header("Authorization", basic("docs", "docs-test-pass"))).andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", containsString("/api/swagger-ui/index.html")));
        mvc.perform(get("/api/swagger-ui/index.html").header("Authorization", basic("docs", "docs-test-pass"))).andExpect(status().isOk());
        mvc.perform(get("/api/swagger-ui/index.html")).andExpect(status().isUnauthorized());
        // 문서 밖의 API는 그대로 열린다
        mvc.perform(get("/api/v1/lounge/messages")).andExpect(status().isOk());
    }
}
