package com.csstudy.backend.service;

import com.csstudy.backend.entity.AccountRole.Role;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

// 관리자 확인. 관리자 API는 "관리자 키(X-Admin-Key)" 또는 "ADMIN 권한 계정으로 로그인"이면 통과한다.
// 관리자 계정 생성과 권한 부여처럼 인터넷에서 열면 안 되는 일은 requireKey로 키만 받는다(홈서버 스크립트 전용)
@Component
public class AdminAuth {

    @Value("${app.admin-key:}")
    private String adminKey;
    @Value("${app.security.min-admin-key-length:32}")
    private int minimumKeyLength = 32;

    private final ObjectProvider<AuthService> auth;
    private final ObjectProvider<RoleService> roles;

    public AdminAuth(ObjectProvider<AuthService> auth, ObjectProvider<RoleService> roles) {
        this.auth = auth;
        this.roles = roles;
    }

    // 지금 처리 중인 요청으로 확인한다(컨트롤러에서 부를 때)
    public void require(String key) {
        var attrs = RequestContextHolder.getRequestAttributes();
        require(key, attrs instanceof ServletRequestAttributes s ? s.getRequest() : null);
    }

    public void require(String key, HttpServletRequest request) {
        if (keyMatches(key)) return;
        if (request != null && isAdmin(request)) return;
        // 키가 없거나 짧으면 503(관리자 API가 닫혀 있음), 키를 보냈는데 틀렸으면 401로 그 이유를 알려 준다
        if ((key != null && !key.isBlank()) || adminKey == null || adminKey.isBlank() || adminKey.length() < minimumKeyLength) requireKey(key);
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자만 볼 수 있어요. 관리자 계정으로 로그인해 주세요.");
    }

    public boolean isAdmin(HttpServletRequest request) {
        return roles.getObject().has(auth.getObject().currentUser(request), Role.ADMIN);
    }

    // An unset key closes key-only administrator APIs. There is no public fallback credential.
    public void requireKey(String key) {
        if (adminKey == null || adminKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ADMIN_KEY가 설정되지 않았습니다.");
        }
        if (adminKey.length() < minimumKeyLength) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "ADMIN_KEY를 32자 이상의 무작위 값으로 설정해 주세요.");
        }
        if (!keyMatches(key)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "관리자 키가 올바르지 않습니다.");
        }
    }

    private boolean keyMatches(String key) {
        return adminKey != null && !adminKey.isBlank() && adminKey.length() >= minimumKeyLength && key != null && !key.isBlank()
                && MessageDigest.isEqual(key.getBytes(StandardCharsets.UTF_8), adminKey.getBytes(StandardCharsets.UTF_8));
    }
}
