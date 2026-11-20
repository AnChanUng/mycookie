package com.csstudy.backend;

import com.csstudy.backend.repository.SocialAccountRepository;
import com.csstudy.backend.service.OAuthClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class OAuthLoginTest {
    private static final String REDIRECT = "http://localhost:5173/auth/callback";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired SocialAccountRepository socials;
    @MockitoBean OAuthClient client;

    @BeforeEach void providers() {
        when(client.enabled(anyString())).thenAnswer(i -> !"kakao".equals(i.getArgument(0)));
        when(client.authorizeUrl(anyString(), anyString(), anyString())).thenReturn("https://provider.example/authorize");
    }

    private ResultActions postJson(String path, Map<String, ?> body, String token) throws Exception {
        var req = post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (token != null) req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }
    private JsonNode read(ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }
    private JsonNode register(String name) throws Exception {
        return read(postJson("/api/v1/auth/register", Map.of("nickname", name, "password", "pw-123456"), null).andExpect(status().isOk()));
    }
    private String state(String provider) throws Exception {
        return read(mvc.perform(get("/api/v1/auth/oauth/" + provider + "/authorize").param("redirectUri", REDIRECT))
                .andExpect(status().isOk())).path("state").asText();
    }
    private JsonNode callback(String provider, String subject) throws Exception {
        when(client.fetch(eq(provider), eq("code-" + subject), eq(REDIRECT), anyString()))
                .thenReturn(new OAuthClient.Profile(provider, subject, subject + "@example.com", "깃허브-" + subject));
        return read(postJson("/api/v1/auth/oauth/" + provider + "/callback",
                Map.of("code", "code-" + subject, "state", state(provider), "redirectUri", REDIRECT), null).andExpect(status().isOk()));
    }

    @Test void onlyConfiguredProvidersAreOffered() throws Exception {
        mvc.perform(get("/api/v1/auth/oauth/providers")).andExpect(status().isOk())
                .andExpect(jsonPath("$.providers[0]").value("google")).andExpect(jsonPath("$.providers[1]").value("naver")).andExpect(jsonPath("$.providers[2]").value("github"))
                .andExpect(jsonPath("$.providers[3]").value("ssafy"))
                .andExpect(jsonPath("$.providers.length()").value(4));
        mvc.perform(get("/api/v1/auth/oauth/kakao/authorize").param("redirectUri", REDIRECT)).andExpect(status().isNotFound());
    }

    @Test void foreignRedirectAndForgedStateAreRejected() throws Exception {
        mvc.perform(get("/api/v1/auth/oauth/github/authorize").param("redirectUri", "https://evil.example/auth/callback"))
                .andExpect(status().isBadRequest());
        String state = state("github");
        String forged = state.substring(0, state.length() - 2) + (state.endsWith("A") ? "BB" : "AA");
        postJson("/api/v1/auth/oauth/github/callback", Map.of("code", "c", "state", forged, "redirectUri", REDIRECT), null)
                .andExpect(status().isBadRequest());
        // google용 state로 github 콜백을 쓸 수 없다
        postJson("/api/v1/auth/oauth/github/callback", Map.of("code", "c", "state", state("google"), "redirectUri", REDIRECT), null)
                .andExpect(status().isBadRequest());
    }

    @Test void firstSocialLoginLinksToExistingAccountWithPassword() throws Exception {
        long id = register("기존회원").path("id").asLong();
        JsonNode first = callback("github", "1001");
        assertEquals("link", first.path("status").asText());
        String ticket = first.path("ticket").asText();

        postJson("/api/v1/auth/oauth/link", Map.of("ticket", ticket, "nickname", "기존회원", "password", "wrong"), null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("비밀번호가 틀렸습니다."));
        JsonNode linked = read(postJson("/api/v1/auth/oauth/link", Map.of("ticket", ticket, "nickname", "기존회원", "password", "pw-123456"), null)
                .andExpect(status().isOk()));
        assertEquals(id, linked.path("id").asLong());
        assertFalse(linked.path("token").asText().isBlank());

        // 다음부터는 깃허브만으로 같은 계정에 들어온다
        JsonNode again = callback("github", "1001");
        assertEquals("ok", again.path("status").asText());
        assertEquals(id, again.path("user").path("id").asLong());

        // 같은 깃허브 계정을 다른 닉네임에 또 연결할 수 없다
        register("다른회원");
        postJson("/api/v1/auth/oauth/link", Map.of("ticket", ticket, "nickname", "다른회원", "password", "pw-123456"), null)
                .andExpect(status().isConflict());
        // 한 닉네임에는 제공자마다 계정 하나만 연결한다
        String other = callback("github", "2002").path("ticket").asText();
        postJson("/api/v1/auth/oauth/link", Map.of("ticket", other, "nickname", "기존회원", "password", "pw-123456"), null)
                .andExpect(status().isConflict());
    }

    @Test void loggedInUserCanLinkWithoutPassword() throws Exception {
        JsonNode user = register("로그인중");
        String ticket = callback("google", "g-1").path("ticket").asText();
        postJson("/api/v1/auth/oauth/link", Map.of("ticket", ticket), user.path("token").asText()).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/oauth/linked").header("Authorization", "Bearer " + user.path("token").asText()))
                .andExpect(jsonPath("$.providers[0]").value("google"));
    }

    @Test void naverAndSsafyCanLogIntoTheSameAccount() throws Exception {
        String naverTicket = callback("naver", "123").path("ticket").asText();
        JsonNode user = read(postJson("/api/v1/auth/oauth/signup",
                Map.of("ticket", naverTicket, "nickname", "두서비스회원"), null).andExpect(status().isOk()));
        JsonNode ssafy = callback("ssafy", "123");
        assertEquals("link", ssafy.path("status").asText());
        postJson("/api/v1/auth/oauth/link", Map.of("ticket", ssafy.path("ticket").asText()),
                user.path("token").asText()).andExpect(status().isOk());

        JsonNode naverLogin = callback("naver", "123");
        JsonNode ssafyLogin = callback("ssafy", "123");
        assertEquals("ok", naverLogin.path("status").asText());
        assertEquals("ok", ssafyLogin.path("status").asText());
        assertEquals(user.path("id"), naverLogin.path("user").path("id"));
        assertEquals(user.path("id"), ssafyLogin.path("user").path("id"));
    }

    @Test void newSocialUserCanCreateAccount() throws Exception {
        JsonNode first = callback("google", "g-9");
        assertEquals("깃허브-g-9", first.path("suggestedNickname").asText());
        JsonNode created = read(postJson("/api/v1/auth/oauth/signup", Map.of("ticket", first.path("ticket").asText(), "nickname", "새회원"), null)
                .andExpect(status().isOk()));
        assertEquals("새회원", created.path("nickname").asText());
        assertTrue(socials.findByProviderAndProviderUserId("google", "g-9").isPresent());
        postJson("/api/v1/auth/oauth/signup", Map.of("ticket", "nope.nope", "nickname", "x"), null).andExpect(status().isBadRequest());

        // 소셜 가입 계정은 비밀번호를 모르므로 처음 한 번은 현재 비밀번호 없이 정하고, 그다음부터는 확인한다
        String token = created.path("token").asText();
        mvc.perform(get("/api/v1/auth/password").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.hasPassword").value(false));
        token = read(postJson("/api/v1/auth/change-password", Map.of("currentPassword", "", "newPassword", "my-pass"), token)
                .andExpect(status().isOk())).path("token").asText();
        mvc.perform(get("/api/v1/auth/password").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.hasPassword").value(true));
        postJson("/api/v1/auth/change-password", Map.of("currentPassword", "", "newPassword", "again"), token).andExpect(status().isBadRequest());
        postJson("/api/v1/auth/login", Map.of("nickname", "새회원", "password", "my-pass"), null).andExpect(status().isOk());
    }

    // 네이버 연령대는 가입할 때 저장되고, 다음 로그인에서 바뀌면 새 값으로 바뀐다
    @Test void naverAgeRangeIsSavedAndRefreshed() throws Exception {
        when(client.fetch(eq("naver"), eq("code-n-1"), eq(REDIRECT), anyString()))
                .thenReturn(new OAuthClient.Profile("naver", "n-1", null, "쿠키", "20-29"));
        JsonNode first = read(postJson("/api/v1/auth/oauth/naver/callback",
                Map.of("code", "code-n-1", "state", state("naver"), "redirectUri", REDIRECT), null).andExpect(status().isOk()));
        postJson("/api/v1/auth/oauth/signup", Map.of("ticket", first.path("ticket").asText(), "nickname", "네이버회원"), null)
                .andExpect(status().isOk());
        assertEquals("20-29", socials.findByProviderAndProviderUserId("naver", "n-1").orElseThrow().getAgeRange());

        when(client.fetch(eq("naver"), eq("code-n-2"), eq(REDIRECT), anyString()))
                .thenReturn(new OAuthClient.Profile("naver", "n-1", null, "쿠키", "30-39"));
        postJson("/api/v1/auth/oauth/naver/callback", Map.of("code", "code-n-2", "state", state("naver"), "redirectUri", REDIRECT), null)
                .andExpect(status().isOk());
        assertEquals("30-39", socials.findByProviderAndProviderUserId("naver", "n-1").orElseThrow().getAgeRange());
    }

    @Test void plainLoginStillWorks() throws Exception {
        register("일반회원");
        postJson("/api/v1/auth/login", Map.of("nickname", "일반회원", "password", "pw-123456"), null).andExpect(status().isOk());
        postJson("/api/v1/auth/login", Map.of("nickname", "없는회원", "password", "x"), null)
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("존재하지 않는 닉네임입니다."));
    }
}
