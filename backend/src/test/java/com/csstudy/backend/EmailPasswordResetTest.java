package com.csstudy.backend;

import com.csstudy.backend.entity.EmailToken;
import com.csstudy.backend.repository.EmailTokenRepository;
import com.csstudy.backend.service.MailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EmailPasswordResetTest {

    private static final Pattern TOKEN = Pattern.compile("token=([A-Za-z0-9_-]+)");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired EmailTokenRepository tokens;
    @MockitoBean MailService mail;

    private ResultActions postJson(String path, Map<String, ?> body, String token) throws Exception {
        var req = post("/api/v1/auth/" + path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }

    private String register(String nickname, String password) throws Exception {
        String body = postJson("register", Map.of("nickname", nickname, "password", password), null)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    // 가장 최근에 그 주소로 보낸 메일 본문에서 링크 토큰을 꺼낸다
    private String lastLinkTo(String email) {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mail, atLeastOnce()).send(eq(email), anyString(), body.capture());
        Matcher m = TOKEN.matcher(body.getValue());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    private String verifiedAccount(String nickname, String password, String email) throws Exception {
        String session = register(nickname, password);
        postJson("email", Map.of("email", email, "currentPassword", password), session).andExpect(status().isOk());
        postJson("email/verify", Map.of("token", lastLinkTo(email)), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.email").value(email));
        return session;
    }

    @Test
    void forgotPasswordSendsOneTimeLinkToVerifiedEmail() throws Exception {
        String session = verifiedAccount("mail-user", "old-password", "mail-user@example.com");
        mvc.perform(get("/api/v1/auth/email").header("Authorization", "Bearer " + session))
                .andExpect(jsonPath("$.email").value("mail-user@example.com"));

        postJson("password/forgot", Map.of("email", "MAIL-user@example.com "), null).andExpect(status().isOk());
        String link = lastLinkTo("mail-user@example.com");
        postJson("password/reset", Map.of("token", link, "password", "new-pw"), null).andExpect(status().isOk());

        // 로그인은 모두 끊기고, 옛 비밀번호는 거절, 새 비밀번호는 통과
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + session)).andExpect(status().isUnauthorized());
        postJson("login", Map.of("nickname", "mail-user", "password", "old-password"), null).andExpect(status().isBadRequest());
        postJson("login", Map.of("nickname", "mail-user", "password", "new-pw"), null).andExpect(status().isOk());
        // 같은 링크는 두 번 쓸 수 없다
        postJson("password/reset", Map.of("token", link, "password", "again"), null).andExpect(status().isBadRequest());
    }

    @Test
    void forgotPasswordDoesNotRevealWhetherAnAccountExists() throws Exception {
        register("no-mail-user", "password-for-tests");
        clearInvocations(mail);
        postJson("password/forgot", Map.of("email", "nobody@example.com"), null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.ok").value(true));
        verify(mail, never()).send(anyString(), anyString(), anyString());
        postJson("password/forgot", Map.of("email", "not-an-email"), null).andExpect(status().isBadRequest());
    }

    @Test
    void nicknameAloneCanNoLongerChangeAPassword() throws Exception {
        register("victim", "victim-pw");
        postJson("reset-password", Map.of("nickname", "victim", "password", "hacked"), null)
                .andExpect(result -> assertThat(result.getResponse().getStatus()).isGreaterThanOrEqualTo(400));
        postJson("password/reset", Map.of("token", "guess", "password", "hacked"), null).andExpect(status().isBadRequest());
        postJson("login", Map.of("nickname", "victim", "password", "victim-pw"), null).andExpect(status().isOk());
    }

    @Test
    void registeringAnEmailNeedsTheCurrentPasswordAndALinkClick() throws Exception {
        String session = register("email-guard", "guard-pw");
        postJson("email", Map.of("email", "guard@example.com"), session).andExpect(status().isBadRequest());
        postJson("email", Map.of("email", "guard@example.com", "currentPassword", "wrong"), session).andExpect(status().isBadRequest());
        postJson("email", Map.of("email", "guard@example.com"), null).andExpect(status().isUnauthorized());

        postJson("email", Map.of("email", "guard@example.com", "currentPassword", "guard-pw"), session).andExpect(status().isOk());
        // 링크를 누르기 전에는 등록되지 않아 재설정 메일도 가지 않는다
        mvc.perform(get("/api/v1/auth/email").header("Authorization", "Bearer " + session)).andExpect(jsonPath("$.email").value(""));
        clearInvocations(mail);
        postJson("password/forgot", Map.of("email", "guard@example.com"), null).andExpect(status().isOk());
        verify(mail, never()).send(anyString(), anyString(), anyString());
        // 1분 안에 다시 보내 달라고 하면 거절
        postJson("email", Map.of("email", "guard@example.com", "currentPassword", "guard-pw"), session).andExpect(status().isTooManyRequests());
    }

    @Test
    void verifiedEmailBelongsToOneAccountAndExpiredLinksFail() throws Exception {
        verifiedAccount("owner-a", "password-a", "shared@example.com");
        String other = register("owner-b", "password-b");
        postJson("email", Map.of("email", "shared@example.com", "currentPassword", "password-b"), other).andExpect(status().isBadRequest());

        postJson("password/forgot", Map.of("email", "shared@example.com"), null).andExpect(status().isOk());
        String link = lastLinkTo("shared@example.com");
        EmailToken saved = tokens.findAll().stream().filter(t -> t.getPurpose() == EmailToken.Purpose.RESET_PASSWORD
                && t.getEmail().equals("shared@example.com")).findFirst().orElseThrow();
        saved.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        tokens.saveAndFlush(saved);
        postJson("password/reset", Map.of("token", link, "password", "late"), null).andExpect(status().isBadRequest());
        postJson("login", Map.of("nickname", "owner-a", "password", "password-a"), null).andExpect(status().isOk());
    }

    @Test
    void tokensAreStoredOnlyAsHashes() throws Exception {
        verifiedAccount("hash-mail", "password-for-tests", "hash@example.com");
        postJson("password/forgot", Map.of("email", "hash@example.com"), null).andExpect(status().isOk());
        String link = lastLinkTo("hash@example.com");
        assertThat(tokens.findAll()).allSatisfy(t -> assertThat(t.getTokenHash()).hasSize(64).isNotEqualTo(link));
    }
}
