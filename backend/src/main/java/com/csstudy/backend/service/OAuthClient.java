package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

// 제공자(구글 · 네이버 · 카카오 · 깃허브)마다 다른 주소와 응답 모양을 한곳에 모은다.
// 키는 환경변수(OAUTH_<제공자>_CLIENT_ID · _SECRET)로만 받고, 키가 없는 제공자는 버튼도 숨긴다
@Component
@RequiredArgsConstructor
public class OAuthClient {

    public record Profile(String provider, String subject, String email, String name) {}

    record Spec(String authorizeUrl, String tokenUrl, String userUrl, String scope) {}

    static final Map<String, Spec> SPECS = Map.of(
            "google", new Spec("https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token",
                    "https://openidconnect.googleapis.com/v1/userinfo", "openid email profile"),
            "kakao", new Spec("https://kauth.kakao.com/oauth/authorize", "https://kauth.kakao.com/oauth/token",
                    "https://kapi.kakao.com/v2/user/me", "profile_nickname"),
            "github", new Spec("https://github.com/login/oauth/authorize", "https://github.com/login/oauth/access_token",
                    "https://api.github.com/user", "read:user user:email"),
            // 네이버는 받을 정보(이메일 · 별명)를 개발자센터 앱 설정에서 고르므로 scope를 쓰지 않는다
            "naver", new Spec("https://nid.naver.com/oauth2.0/authorize", "https://nid.naver.com/oauth2.0/token",
                    "https://openapi.naver.com/v1/nid/me", ""));
    public static final List<String> ORDER = List.of("google", "naver", "kakao", "github");

    private final RestTemplate http;
    private final Environment env;

    private String clientId(String provider) { return env.getProperty("app.oauth." + provider + ".client-id", ""); }
    private String clientSecret(String provider) { return env.getProperty("app.oauth." + provider + ".client-secret", ""); }

    public boolean enabled(String provider) {
        return SPECS.containsKey(provider) && !clientId(provider).isBlank();
    }

    public String authorizeUrl(String provider, String redirectUri, String state) {
        Spec spec = SPECS.get(provider);
        return UriComponentsBuilder.fromUriString(spec.authorizeUrl())
                .queryParam("client_id", clientId(provider))
                .queryParam("redirect_uri", redirectUri)
                .queryParam("response_type", "code")
                .queryParamIfPresent("scope", java.util.Optional.of(spec.scope()).filter(s -> !s.isBlank()))
                .queryParam("state", state)
                .encode().build().toUriString();
    }

    /** 인가 코드를 토큰으로 바꾸고 사용자 정보를 읽는다. */
    public Profile fetch(String provider, String code, String redirectUri, String state) {
        Spec spec = SPECS.get(provider);
        try {
            var form = new LinkedMultiValueMap<String, String>();
            form.add("grant_type", "authorization_code");
            form.add("code", code);
            form.add("redirect_uri", redirectUri);
            form.add("client_id", clientId(provider));
            if (!clientSecret(provider).isBlank()) form.add("client_secret", clientSecret(provider));
            // 네이버는 토큰을 받을 때도 state를 함께 보내야 한다
            if ("naver".equals(provider)) form.add("state", state);
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
            headers.setAccept(List.of(MediaType.APPLICATION_JSON));
            JsonNode token = http.postForObject(spec.tokenUrl(), new HttpEntity<>(form, headers), JsonNode.class);
            String accessToken = token == null ? "" : token.path("access_token").asText("");
            if (accessToken.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "로그인 제공자에게서 인증을 받지 못했습니다. 다시 시도해 주세요.");

            HttpHeaders auth = new HttpHeaders();
            auth.setBearerAuth(accessToken);
            auth.setAccept(List.of(MediaType.APPLICATION_JSON));
            JsonNode user = http.exchange(spec.userUrl(), HttpMethod.GET, new HttpEntity<>(auth), JsonNode.class).getBody();
            if (user == null) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "사용자 정보를 읽지 못했습니다.");
            return switch (provider) {
                case "google" -> new Profile(provider, user.path("sub").asText(), text(user, "email"), text(user, "name"));
                case "kakao" -> new Profile(provider, user.path("id").asText(),
                        text(user.path("kakao_account"), "email"), text(user.path("kakao_account").path("profile"), "nickname"));
                case "naver" -> {
                    JsonNode r = user.path("response");
                    String name = text(r, "nickname");
                    yield new Profile(provider, r.path("id").asText(""), text(r, "email"), name != null ? name : text(r, "name"));
                }
                default -> new Profile(provider, user.path("id").asText(), text(user, "email"),
                        text(user, "login"));
            };
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "로그인 제공자와 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return v.isTextual() && !v.asText().isBlank() ? v.asText() : null;
    }
}
