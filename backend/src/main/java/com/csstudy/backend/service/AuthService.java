package com.csstudy.backend.service;

import com.csstudy.backend.entity.AuthToken;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.AuthTokenRepository;
import jakarta.servlet.http.HttpServletRequest;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String BEARER = "Bearer ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final AuthTokenRepository authTokenRepository;

    // 로그인 토큰 유효 기간(일). 토큰이 새어 나가도 이 기간이 지나면 쓸 수 없다. 0 이하면 만료하지 않는다
    @Value("${app.security.token-max-age-days:90}")
    private long tokenMaxAgeDays = 90;

    @Transactional
    public String issueToken(User user) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        authTokenRepository.save(AuthToken.builder().tokenHash(hash(token)).user(user).build());
        return token;
    }

    @Transactional
    public void revoke(HttpServletRequest request) {
        extractToken(request).ifPresent(token -> authTokenRepository.deleteByTokenHash(hash(token)));
    }

    @Transactional
    public void revokeAll(User user) {
        authTokenRepository.deleteAllForUser(user.getId());
    }

    /** 로그인하지 않은 요청이면 비어 있다. */
    public Optional<User> currentUser(HttpServletRequest request) {
        return extractToken(request)
                .flatMap(token -> authTokenRepository.findByTokenHash(hash(token)))
                .filter(this::notExpired)
                .map(AuthToken::getUser);
    }

    public User requireUser(HttpServletRequest request) {
        return currentUser(request)
                .orElseThrow(() -> new CookieException(CookieErrorCode.UNAUTHORIZED));
    }

    // 발급 시각이 없는 예전 토큰은 그대로 둔다(다음 로그인부터 기간이 적용된다)
    private boolean notExpired(AuthToken token) {
        if (tokenMaxAgeDays <= 0 || token.getCreatedAt() == null) return true;
        return token.getCreatedAt().isAfter(LocalDateTime.now().minusDays(tokenMaxAgeDays));
    }

    private Optional<String> extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith(BEARER)) {
            return Optional.empty();
        }
        String token = header.substring(BEARER.length()).trim();
        return token.isEmpty() ? Optional.empty() : Optional.of(token);
    }

    private static String hash(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
