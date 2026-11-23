package com.csstudy.backend.controller;

import com.csstudy.backend.dto.UserResponse;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.service.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

// 소셜(구글 · 카카오) · 깃허브 로그인. 흐름은 OAuthService 주석 참고
@RestController
@RequestMapping("/api/v1/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OAuthService oauth;
    private final AuthService authService;
    private final CredentialService credentials;
    private final MembershipService membershipService;
    private final NicknameService nicknames;

    @GetMapping("/providers")
    public Map<String, Object> providers() {
        return Map.of("providers", oauth.providers());
    }

    @GetMapping("/{provider}/authorize")
    public Map<String, String> authorize(@PathVariable String provider, @RequestParam String redirectUri) {
        return oauth.authorize(provider, redirectUri);
    }

    @PostMapping("/{provider}/callback")
    public ResponseEntity<?> callback(@PathVariable String provider, @RequestBody Map<String, String> body) {
        OAuthService.Result result = oauth.callback(provider, body.get("code"), body.get("state"), body.get("redirectUri"));
        if (result.user() != null) {
            User user = result.user();
            return ResponseEntity.ok(Map.of("status", "ok",
                    "user", UserResponse.from(user, authService.issueToken(user), membershipService.membership(user))));
        }
        var response = new LinkedHashMap<String, Object>();
        response.put("status", "link");
        response.put("provider", provider);
        response.put("ticket", result.ticket());
        if (result.profile().name() != null) response.put("suggestedNickname", result.profile().name());
        return ResponseEntity.ok(response);
    }

    /** 처음 들어온 소셜 계정을 기존 닉네임 계정에 연결한다. 로그인 중이면 그 계정에, 아니면 닉네임(또는 이메일) · 비밀번호로 확인한다. */
    @PostMapping("/link")
    @Transactional
    public ResponseEntity<?> link(@RequestBody Map<String, String> body, HttpServletRequest request) {
        OAuthService.Ticket ticket = oauth.readTicket(body.get("ticket"));
        User user = authService.currentUser(request).orElseGet(() -> credentials.authenticateLogin(
                Objects.toString(body.get("nickname"), "").trim(), Objects.toString(body.get("password"), "").trim()));
        oauth.link(user, ticket);
        return ResponseEntity.ok(UserResponse.from(user, authService.issueToken(user), membershipService.membership(user)));
    }

    /** 처음 들어온 소셜 계정으로 새 닉네임 계정을 만든다. 비밀번호는 무작위로 두고, 필요하면 나중에 재설정한다. */
    @PostMapping("/signup")
    @Transactional
    public ResponseEntity<?> signup(@RequestBody Map<String, String> body, HttpServletRequest request) {
        OAuthService.Ticket ticket = oauth.readTicket(body.get("ticket"));
        byte[] random = new byte[24];
        RANDOM.nextBytes(random);
        String visitor = request.getHeader("X-Visitor-Id");
        User user = nicknames.register(Objects.toString(body.get("nickname"), "").trim(),
                credentials.encode(Base64.getUrlEncoder().encodeToString(random)),
                membershipService.visitorBase(visitor), visitor);
        user.setPasswordSet(false);
        oauth.link(user, ticket);
        return ResponseEntity.ok(UserResponse.from(user, authService.issueToken(user), membershipService.membership(user)));
    }

    @GetMapping("/linked")
    public Map<String, Object> linked(HttpServletRequest request) {
        return Map.of("providers", oauth.linkedProviders(authService.requireUser(request)));
    }
}
