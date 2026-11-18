package com.csstudy.backend;

import com.csstudy.backend.service.OAuthClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

// 네이버는 토큰 요청에 state가 필요하고, 사용자 정보가 response 안에 한 번 더 감싸져 온다
class NaverOAuthClientTest {

    private static final String REDIRECT = "https://mycookie.dev/auth/callback";

    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(http).build();
    private final OAuthClient client = new OAuthClient(http, new MockEnvironment()
            .withProperty("app.oauth.naver.client-id", "naver-id")
            .withProperty("app.oauth.naver.client-secret", "naver-secret"));

    @Test
    void naverIsEnabledWithKeysAndAuthorizeUrlHasNoScope() {
        assertThat(client.enabled("naver")).isTrue();
        String url = client.authorizeUrl("naver", REDIRECT, "st-1");
        assertThat(url).startsWith("https://nid.naver.com/oauth2.0/authorize?")
                .contains("client_id=naver-id", "state=st-1", "response_type=code")
                .doesNotContain("scope=");
    }

    @Test
    void tokenRequestCarriesStateAndProfileIsReadFromResponse() {
        server.expect(requestTo("https://nid.naver.com/oauth2.0/token"))
                .andExpect(content().formDataContains(java.util.Map.of(
                        "state", "st-1", "code", "c-1", "client_id", "naver-id", "client_secret", "naver-secret")))
                .andRespond(withSuccess("{\"access_token\":\"at-1\",\"token_type\":\"bearer\"}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://openapi.naver.com/v1/nid/me"))
                .andExpect(header("Authorization", "Bearer at-1"))
                .andRespond(withSuccess("{\"resultcode\":\"00\",\"message\":\"success\",\"response\":"
                        + "{\"id\":\"naver-123\",\"email\":\"a@naver.com\",\"nickname\":\"쿠키\"}}", MediaType.APPLICATION_JSON));

        OAuthClient.Profile profile = client.fetch("naver", "c-1", REDIRECT, "st-1");

        assertThat(profile).isEqualTo(new OAuthClient.Profile("naver", "naver-123", "a@naver.com", "쿠키"));
        server.verify();
    }
}
