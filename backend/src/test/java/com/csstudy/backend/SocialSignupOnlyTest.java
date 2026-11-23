package com.csstudy.backend;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 운영 설정(가입 닫힘): 닉네임 · 비밀번호로 새로 가입할 수 없고, 이미 있는 계정은 그대로 로그인한다
@SpringBootTest(properties = "app.auth.password-signup-enabled=false")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SocialSignupOnlyTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;

    @Test
    void passwordSignupIsClosedButExistingAccountsStillLogIn() throws Exception {
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"new-member\",\"password\":\"long-enough-pw\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error").exists());

        User existing = new User();
        existing.setNickname("existing-member");
        existing.setPassword(new BCryptPasswordEncoder().encode("short"));
        users.saveAndFlush(existing);
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"existing-member\",\"password\":\"short\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nickname").value("existing-member"));
    }
}
