package com.csstudy.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 기본값(운영)에서는 API 문서를 열지 않는다
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class SwaggerClosedTest {
    @Autowired MockMvc mvc;

    @Test
    void docsAreOffByDefault() throws Exception {
        mvc.perform(get("/api/v3/api-docs")).andExpect(status().isNotFound());
        mvc.perform(get("/api/docs")).andExpect(status().isNotFound());
        mvc.perform(get("/api/swagger-ui/index.html")).andExpect(status().isNotFound());
    }
}
