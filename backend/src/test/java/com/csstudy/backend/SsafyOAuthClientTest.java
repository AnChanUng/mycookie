package com.csstudy.backend;

import com.csstudy.backend.service.OAuthClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class SsafyOAuthClientTest {

    private static final String REDIRECT = "http://localhost:5173/auth/callback";
    private final RestTemplate http = new RestTemplate();
    private final MockEnvironment env = new MockEnvironment();
    private final OAuthClient client = new OAuthClient(http, env);

    @Test
    void requiresBothCredentialsAndRequestsReadUserScope() {
        assertThat(client.enabled("ssafy")).isFalse();
        env.setProperty("app.oauth.ssafy.client-id", "ssafy-id");
        assertThat(client.enabled("ssafy")).isFalse();
        env.setProperty("app.oauth.ssafy.client-secret", "ssafy-secret");
        assertThat(client.enabled("ssafy")).isTrue();

        assertThat(client.authorizeUrl("ssafy", REDIRECT, "st-1"))
                .startsWith("https://lab.ssafy.com/oauth/authorize?")
                .contains("client_id=ssafy-id", "redirect_uri=" + REDIRECT,
                        "response_type=code", "scope=read_user", "state=st-1")
                .doesNotContain("ssafy-secret");
    }

    @Test
    void exchangesCodeAndReadsNumericIdAndUsernameFromGitLab() {
        env.setProperty("app.oauth.ssafy.client-id", "ssafy-id");
        env.setProperty("app.oauth.ssafy.client-secret", "ssafy-secret");
        MockRestServiceServer server = MockRestServiceServer.bindTo(http).build();
        server.expect(requestTo("https://lab.ssafy.com/oauth/token"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().formDataContains(Map.of(
                        "grant_type", "authorization_code", "code", "c-1", "redirect_uri", REDIRECT,
                        "client_id", "ssafy-id", "client_secret", "ssafy-secret")))
                .andExpect(content().string(not(containsString("state="))))
                .andRespond(withSuccess("{\"access_token\":\"at-1\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://lab.ssafy.com/api/v4/user"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("Authorization", "Bearer at-1"))
                .andRespond(withSuccess("""
                        {"id":123,"username":"cookie","name":"Cookie","public_email":"cookie@example.com"}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.fetch("ssafy", "c-1", REDIRECT, "st-1"))
                .isEqualTo(new OAuthClient.Profile("ssafy", "123", null, "cookie"));
        server.verify();
    }
}
