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

// 개발 서버(SWAGGER_ENABLED=true)에서는 비밀번호 없이 API 문서가 열린다
@SpringBootTest(properties = "SWAGGER_ENABLED=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SwaggerDocsTest {
    @Autowired MockMvc mvc;

    @Test
    void docsOpenWithoutPasswordOnDevServer() throws Exception {
        mvc.perform(get("/api/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("나의쿠키 API"))
                .andExpect(jsonPath("$.paths['/api/v1/direct']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.adminKey.name").value("X-Admin-Key"))
                .andExpect(jsonPath("$.servers[0].url").value("/"));
        mvc.perform(get("/api/docs")).andExpect(status().is3xxRedirection())
                .andExpect(header().string("Location", containsString("/api/swagger-ui/index.html")));
        mvc.perform(get("/api/swagger-ui/index.html")).andExpect(status().isOk());
    }
}
