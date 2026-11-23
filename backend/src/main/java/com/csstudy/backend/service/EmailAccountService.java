package com.csstudy.backend.service;

import com.csstudy.backend.entity.EmailToken;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.EmailTokenRepository;
import com.csstudy.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.regex.Pattern;

// 이메일 인증과 비밀번호 재설정(메일 링크 방식).
// 1) 로그인한 사용자가 현재 비밀번호를 확인하고 이메일을 등록하면 인증 링크를 보낸다. 링크를 눌러야 등록된다
// 2) 비밀번호를 잊으면 인증된 이메일로 재설정 링크(30분, 1회용)를 보낸다. 가입 여부는 응답으로 드러내지 않는다
// 3) 링크의 토큰으로 새 비밀번호를 정하면 모든 기기의 로그인을 끊는다
@Service
@RequiredArgsConstructor
public class EmailAccountService {

    static final Duration VERIFY_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofMinutes(30);
    static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]{1,64}@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final EmailTokenRepository tokens;
    private final AuthService authService;
    private final CredentialService credentials;
    private final MailService mail;
    private final Clock clock = Clock.systemDefaultZone();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Value("${app.base-url:http://localhost:3000}")
    private String baseUrl;

    @Transactional
    public void requestVerification(User session, String rawEmail, String currentPassword) {
        String email = normalize(rawEmail);
        User user = users.findForUpdate(session.getId()).orElseThrow(this::unauthorized);
        // 로그인 토큰만 훔친 사람이 이메일을 바꿔 계정을 가져가지 못하게 현재 비밀번호를 확인한다
        if (user.hasOwnPassword()) {
            if (currentPassword == null || currentPassword.isBlank()) throw bad("현재 비밀번호를 입력해주세요.");
            credentials.authenticate(user.getNickname(), currentPassword.trim());
        }
        if (email.equals(user.getEmail())) throw bad("이미 인증된 이메일입니다.");
        if (users.existsByEmail(email)) throw bad("다른 계정에서 사용 중인 이메일입니다.");
        cooldown(user, EmailToken.Purpose.VERIFY_EMAIL);
        String token = issue(user, EmailToken.Purpose.VERIFY_EMAIL, email, VERIFY_TTL);
        mail.send(email, "[나의쿠키] 이메일 인증",
                user.getNickname() + "님, 아래 링크를 눌러 이메일 인증을 마쳐 주세요. 24시간 동안 유효합니다.\n\n"
                        + link("/auth/verify-email", token)
                        + "\n\n직접 요청하지 않았다면 이 메일을 무시하세요.");
    }

    @Transactional
    public String verify(String token) {
        EmailToken saved = consume(token, EmailToken.Purpose.VERIFY_EMAIL, "인증 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.");
        User user = users.findForUpdate(saved.getUser().getId()).orElseThrow(this::unauthorized);
        users.findByEmail(saved.getEmail()).filter(other -> !other.getId().equals(user.getId())).ifPresent(other -> {
            throw bad("다른 계정에서 사용 중인 이메일입니다.");
        });
        user.setEmail(saved.getEmail());
        users.saveAndFlush(user);
        return saved.getEmail();
    }

    // 가입 여부와 상관없이 같은 응답을 돌려준다. 메일은 인증된 주소가 있을 때만 간다
    @Transactional
    public void requestReset(String rawEmail) {
        String email = normalize(rawEmail);
        users.findByEmail(email).flatMap(found -> users.findForUpdate(found.getId())).ifPresent(user -> {
            if (recentlySent(user, EmailToken.Purpose.RESET_PASSWORD)) return;
            String token = issue(user, EmailToken.Purpose.RESET_PASSWORD, email, RESET_TTL);
            mail.send(email, "[나의쿠키] 비밀번호 재설정",
                    user.getNickname() + "님, 아래 링크에서 새 비밀번호를 정해 주세요. 30분 동안 한 번만 쓸 수 있습니다.\n\n"
                            + link("/auth/reset-password", token)
                            + "\n\n직접 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 바뀌지 않습니다.");
        });
    }

    @Transactional
    public void reset(String token, String rawPassword) {
        String password = rawPassword == null ? "" : rawPassword.trim();
        if (password.isEmpty()) throw bad("새 비밀번호를 입력해주세요.");
        // 규칙에 안 맞으면 링크를 쓰지 않은 채로 돌려보내 다시 입력할 수 있게 한다
        CredentialService.requireStrong(password);
        EmailToken saved = consume(token, EmailToken.Purpose.RESET_PASSWORD, "재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.");
        User user = users.findForUpdate(saved.getUser().getId()).orElseThrow(this::unauthorized);
        // 메일을 보낸 뒤 이메일이 바뀌었다면 옛 주소로 간 링크는 쓰지 못한다
        if (!saved.getEmail().equals(user.getEmail())) throw bad("재설정 링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.");
        user.setPassword(passwordEncoder.encode(password));
        user.setPasswordSet(true);
        users.saveAndFlush(user);
        authService.revokeAll(user);
    }

    @Scheduled(cron = "0 17 4 * * *")
    @Transactional
    public void purgeExpired() {
        tokens.deleteExpired(LocalDateTime.now(clock));
    }

    private EmailToken consume(String token, EmailToken.Purpose purpose, String message) {
        if (token == null || token.isBlank() || token.length() > 128) throw bad(message);
        EmailToken saved = tokens.findForUpdate(hash(token.trim())).orElseThrow(() -> bad(message));
        if (saved.getPurpose() != purpose) throw bad(message);
        // 쓰거나 만료된 토큰은 지운다. 같은 목적의 다른 링크도 함께 무효로 한다
        tokens.deleteFor(saved.getUser().getId(), purpose);
        if (saved.getExpiresAt().isBefore(LocalDateTime.now(clock))) throw bad(message);
        return saved;
    }

    private String issue(User user, EmailToken.Purpose purpose, String email, Duration ttl) {
        tokens.deleteFor(user.getId(), purpose);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.saveAndFlush(EmailToken.builder().tokenHash(hash(token)).user(user).purpose(purpose)
                .email(email).expiresAt(LocalDateTime.now(clock).plus(ttl)).build());
        return token;
    }

    private boolean recentlySent(User user, EmailToken.Purpose purpose) {
        return tokens.findTopByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(), purpose)
                .map(t -> t.getCreatedAt() != null && t.getCreatedAt().isAfter(LocalDateTime.now(clock).minus(RESEND_COOLDOWN)))
                .orElse(false);
    }

    private void cooldown(User user, EmailToken.Purpose purpose) {
        if (recentlySent(user, purpose)) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "메일을 방금 보냈습니다. 1분 뒤에 다시 시도해 주세요.");
    }

    private String link(String path, String token) {
        return baseUrl.replaceAll("/+$", "") + path + "?token=" + token;
    }

    static String normalize(String raw) {
        String email = raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 254 || !EMAIL.matcher(email).matches()) throw bad("올바른 이메일 주소를 입력해주세요.");
        return email;
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
    }
}
