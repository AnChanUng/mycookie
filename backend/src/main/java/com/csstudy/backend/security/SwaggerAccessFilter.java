package com.csstudy.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

// API 문서(Swagger UI · OpenAPI JSON)는 아이디 · 비밀번호(HTTP Basic)를 아는 팀원만 연다.
// 비밀번호(SWAGGER_PASSWORD)를 정하지 않은 서버에서는 문서가 없는 것처럼 404를 돌려준다.
// 요청 제한(SecurityRequestFilter, -100) 다음에 돌아 비밀번호를 마구 넣어 보는 요청도 제한된다
@Component
@Order(-90)
public class SwaggerAccessFilter extends OncePerRequestFilter {
    private final String user;
    private final String password;

    public SwaggerAccessFilter(@Value("${app.swagger.user:mycookie}") String user,
                               @Value("${app.swagger.password:}") String password) {
        this.user = user;
        this.password = password;
    }

    static boolean isDocs(String path) {
        return path.equals("/api/docs") || path.startsWith("/api/docs/")
                || path.startsWith("/api/swagger-ui") || path.startsWith("/api/v3/api-docs");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        if (path.isEmpty()) path = request.getRequestURI();
        return !isDocs(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (password.isBlank()) { response.sendError(HttpServletResponse.SC_NOT_FOUND); return; }
        if (!authorized(request.getHeader("Authorization"))) {
            response.setHeader("WWW-Authenticate", "Basic realm=\"mycookie-api-docs\", charset=\"UTF-8\"");
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        response.setHeader("Cache-Control", "no-store");
        chain.doFilter(request, response);
    }

    private boolean authorized(String header) {
        if (header == null || !header.regionMatches(true, 0, "Basic ", 0, 6)) return false;
        String decoded;
        try { decoded = new String(Base64.getDecoder().decode(header.substring(6).trim()), StandardCharsets.UTF_8); }
        catch (IllegalArgumentException e) { return false; }
        int colon = decoded.indexOf(':');
        if (colon < 0) return false;
        // 길이로 맞는지 알 수 없게 고정 시간으로 비교한다
        boolean userOk = MessageDigest.isEqual(decoded.substring(0, colon).getBytes(StandardCharsets.UTF_8), user.getBytes(StandardCharsets.UTF_8));
        boolean passOk = MessageDigest.isEqual(decoded.substring(colon + 1).getBytes(StandardCharsets.UTF_8), password.getBytes(StandardCharsets.UTF_8));
        return userOk & passOk;
    }
}
