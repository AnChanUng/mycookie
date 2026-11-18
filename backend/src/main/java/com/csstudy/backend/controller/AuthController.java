package com.csstudy.backend.controller;

import com.csstudy.backend.dto.UserResponse;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.UserRepository;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.CredentialService;
import com.csstudy.backend.service.MembershipService;
import com.csstudy.backend.service.NicknameService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final MembershipService membershipService;
    private final NicknameService nicknames;
    private final CredentialService credentials;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body, HttpServletRequest request) {
        final String nickname = body.getOrDefault("nickname", "").trim();
        final String password = body.getOrDefault("password", "").trim();

        if (nickname.isEmpty() || password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "닉네임과 비밀번호를 입력해주세요."));
        }

        if (userRepository.existsByNickname(nickname)) {
            return ResponseEntity.badRequest().body(Map.of("error", "이미 사용 중인 닉네임입니다."));
        }

        User user = nicknames.register(nickname,passwordEncoder.encode(password),
                membershipService.visitorBase(request.getHeader("X-Visitor-Id")),request.getHeader("X-Visitor-Id"));
        return ResponseEntity.ok(UserResponse.from(user, authService.issueToken(user), membershipService.membership(user)));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        User user = credentials.authenticate(body.getOrDefault("nickname", "").trim(), body.getOrDefault("password", "").trim());
        return ResponseEntity.ok(UserResponse.from(user, authService.issueToken(user), membershipService.membership(user)));
    }

    // 비밀번호 변경: 로그인한 본인만, 현재 비밀번호를 확인한 뒤에 바꾼다.
    // 소셜 가입 계정은 처음 한 번만 현재 비밀번호 없이 정할 수 있다(사용자가 모르는 임의 비밀번호라서)
    @PostMapping("/change-password")
    @Transactional
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User session = authService.requireUser(request);
        String current = Objects.toString(body.get("currentPassword"), "").trim();
        String password = Objects.toString(body.get("newPassword"), "").trim();
        if (password.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "새 비밀번호를 입력해주세요."));
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return ResponseEntity.badRequest().body(Map.of("error", "새 비밀번호는 UTF-8 기준 72바이트 이하여야 합니다."));
        }
        User user = userRepository.findByNicknameForUpdate(session.getNickname())
                .filter(found -> found.getId().equals(session.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다."));
        if (user.hasOwnPassword()) {
            if (current.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "현재 비밀번호를 입력해주세요."));
            }
            credentials.authenticate(user.getNickname(), current);
        }
        user.setPassword(passwordEncoder.encode(password));
        user.setPasswordSet(true);
        authService.revokeAll(user);
        return ResponseEntity.ok(UserResponse.from(user, authService.issueToken(user), membershipService.membership(user)));
    }

    @GetMapping("/password")
    public Map<String, Object> passwordStatus(HttpServletRequest request) {
        return Map.of("hasPassword", authService.requireUser(request).hasOwnPassword());
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest request) {
        User user = authService.requireUser(request);
        return ResponseEntity.ok(Map.of("id", user.getId(), "nickname", user.getNickname(),
                "membership", membershipService.membership(user)));
    }

    @PutMapping("/nickname")
    public ResponseEntity<?> nickname(@RequestBody Map<String,String> body,HttpServletRequest request) {
        User user=nicknames.rename(authService.requireUser(request),body.get("nickname"),request.getHeader("X-Visitor-Id"));
        return ResponseEntity.ok(Map.of("nickname",user.getNickname()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        authService.revoke(request);
        return ResponseEntity.ok(Map.of("ok", true));
    }
}
