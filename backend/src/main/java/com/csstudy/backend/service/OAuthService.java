package com.csstudy.backend.service;

import com.csstudy.backend.entity.SocialAccount;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.SocialAccountRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.*;

// 소셜 · 깃허브 로그인 흐름.
//   1) authorize: 제공자 로그인 주소와 서명한 state를 준다
//   2) callback : 코드를 사용자 정보로 바꾼다. 이미 연결된 계정이면 바로 로그인하고,
//                 처음이면 서명한 연결권(ticket)을 준다
//   3) link     : 연결권 + 기존 닉네임 · 비밀번호(또는 지금 로그인한 계정)로 기존 계정에 연결한다
//      signup   : 연결권 + 새 닉네임으로 새 계정을 만든다
// state · ticket은 서버에 저장하지 않고 HMAC으로 서명해 위조를 막는다(서버를 옮겨도 DB 테이블이 늘지 않는다)
@Service
public class OAuthService {

    private static final long STATE_TTL_MS = 10 * 60 * 1000L;
    private static final long TICKET_TTL_MS = 15 * 60 * 1000L;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OAuthClient client;
    private final SocialAccountRepository socials;
    private final ObjectMapper json;
    private final byte[] secret;
    private final List<String> allowedOrigins;

    public OAuthService(OAuthClient client, SocialAccountRepository socials, ObjectMapper json,
                        @Value("${app.oauth.state-secret:}") String secret,
                        @Value("${app.oauth.allowed-origins:http://localhost:3000,http://localhost:5173,https://mycookie.dev,https://www.mycookie.dev}") String origins) {
        this.client = client;
        this.socials = socials;
        this.json = json;
        if (secret.isBlank()) {
            // 키를 정하지 않으면 실행할 때마다 새로 만든다. 서버가 다시 켜지면 진행 중이던 로그인만 다시 하면 된다
            byte[] random = new byte[32];
            RANDOM.nextBytes(random);
            this.secret = random;
        } else {
            this.secret = secret.getBytes(StandardCharsets.UTF_8);
        }
        this.allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }

    public record Ticket(String provider, String subject, String email, String name, String ageRange) {}

    public List<String> providers() {
        return OAuthClient.ORDER.stream().filter(client::enabled).toList();
    }

    public Map<String, String> authorize(String provider, String redirectUri) {
        requireProvider(provider);
        requireRedirect(redirectUri);
        ObjectNode payload = json.createObjectNode()
                .put("t", "state").put("p", provider).put("r", redirectUri)
                .put("n", UUID.randomUUID().toString()).put("e", System.currentTimeMillis() + STATE_TTL_MS);
        String state = sign(payload);
        return Map.of("url", client.authorizeUrl(provider, redirectUri, state), "state", state);
    }

    /** 이미 연결된 계정이면 그 사용자, 아니면 비어 있고 ticket을 채운다. */
    public Result callback(String provider, String code, String state, String redirectUri) {
        requireProvider(provider);
        JsonNode s = verify(state, "state");
        if (!provider.equals(s.path("p").asText()) || !Objects.equals(redirectUri, s.path("r").asText())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 요청이 올바르지 않습니다. 처음부터 다시 시도해 주세요.");
        }
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인이 취소되었습니다.");
        }
        OAuthClient.Profile profile = client.fetch(provider, code, redirectUri, state);
        if (profile.subject() == null || profile.subject().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "사용자 정보를 읽지 못했습니다.");
        }
        Optional<SocialAccount> linked = socials.findByProviderAndProviderUserId(provider, profile.subject());
        if (linked.isPresent()) {
            SocialAccount account = linked.get();
            if (profile.ageRange() != null && !profile.ageRange().equals(account.getAgeRange())) {
                account.setAgeRange(profile.ageRange());
                socials.save(account);
            }
            return new Result(account.getUser(), null, profile);
        }
        ObjectNode payload = json.createObjectNode()
                .put("t", "ticket").put("p", provider).put("s", profile.subject())
                .put("e", System.currentTimeMillis() + TICKET_TTL_MS);
        if (profile.email() != null) payload.put("m", profile.email());
        if (profile.name() != null) payload.put("a", profile.name());
        if (profile.ageRange() != null) payload.put("g", profile.ageRange());
        return new Result(null, sign(payload), profile);
    }

    public record Result(User user, String ticket, OAuthClient.Profile profile) {}

    public Ticket readTicket(String ticket) {
        JsonNode t = verify(ticket, "ticket");
        return new Ticket(t.path("p").asText(), t.path("s").asText(),
                t.hasNonNull("m") ? t.get("m").asText() : null, t.hasNonNull("a") ? t.get("a").asText() : null,
                t.hasNonNull("g") ? t.get("g").asText() : null);
    }

    @Transactional
    public void link(User user, Ticket ticket) {
        Optional<SocialAccount> existing = socials.findByProviderAndProviderUserId(ticket.provider(), ticket.subject());
        if (existing.isPresent()) {
            if (existing.get().getUser().getId().equals(user.getId())) return;
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이 " + label(ticket.provider()) + " 계정은 이미 다른 닉네임에 연결되어 있습니다.");
        }
        if (socials.existsByUserIdAndProvider(user.getId(), ticket.provider())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이 닉네임에는 이미 다른 " + label(ticket.provider()) + " 계정이 연결되어 있습니다.");
        }
        socials.saveAndFlush(SocialAccount.builder().provider(ticket.provider()).providerUserId(ticket.subject())
                .email(ticket.email()).ageRange(ticket.ageRange()).user(user).build());
    }

    public List<String> linkedProviders(User user) {
        return socials.findByUserId(user.getId()).stream().map(SocialAccount::getProvider).sorted().toList();
    }

    public static String label(String provider) {
        return switch (provider) { case "google" -> "구글"; case "naver" -> "네이버"; case "kakao" -> "카카오"; case "github" -> "깃허브"; default -> provider; };
    }

    private void requireProvider(String provider) {
        if (!client.enabled(provider)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "아직 준비되지 않은 로그인 방식입니다.");
        }
    }

    private void requireRedirect(String redirectUri) {
        try {
            URI uri = URI.create(redirectUri);
            String origin = uri.getScheme() + "://" + uri.getRawAuthority();
            if (allowedOrigins.contains(origin) && "/auth/callback".equals(uri.getRawPath()) && uri.getRawQuery() == null && uri.getRawFragment() == null) return;
        } catch (IllegalArgumentException | NullPointerException ignored) { /* 아래에서 거절한다 */ }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "허용되지 않은 주소입니다.");
    }

    private String sign(ObjectNode payload) {
        try {
            String body = Base64.getUrlEncoder().withoutPadding().encodeToString(json.writeValueAsBytes(payload));
            return body + "." + mac(body);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private JsonNode verify(String value, String type) {
        ResponseStatusException invalid = new ResponseStatusException(HttpStatus.BAD_REQUEST, "로그인 시간이 지났거나 올바르지 않습니다. 처음부터 다시 시도해 주세요.");
        if (value == null) throw invalid;
        int dot = value.lastIndexOf('.');
        if (dot <= 0) throw invalid;
        String body = value.substring(0, dot);
        if (!MessageDigest.isEqual(mac(body).getBytes(StandardCharsets.US_ASCII), value.substring(dot + 1).getBytes(StandardCharsets.US_ASCII))) throw invalid;
        try {
            JsonNode node = json.readTree(Base64.getUrlDecoder().decode(body));
            if (!type.equals(node.path("t").asText()) || node.path("e").asLong() < System.currentTimeMillis()) throw invalid;
            return node;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw invalid;
        }
    }

    private String mac(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.US_ASCII)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
