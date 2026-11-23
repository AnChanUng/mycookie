package com.csstudy.backend.controller;

import com.csstudy.backend.service.AdminAudit;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.PrivateBankAccess;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// 비공개 문제집 열람 권한 주기 · 빼기. 관리자 페이지(ADMIN 계정 로그인) 또는 관리자 키로 부른다.
// 관리자 · 주인 권한 부여(AccountAdminController)는 계속 홈서버 키로만 하고, 여기서는 문제집 열람 하나만 연다
@RestController
@RequestMapping("/api/v1/admin/private-bank")
@RequiredArgsConstructor
public class PrivateBankAdminController {

    private final AdminAuth adminAuth;
    private final AuthService auth;
    private final PrivateBankAccess access;
    private final AdminAudit audit;

    @GetMapping
    public List<Map<String, Object>> list(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        return access.list();
    }

    @PostMapping
    public Map<String, Object> change(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                      @RequestBody Map<String, Object> body, HttpServletRequest request) {
        adminAuth.require(key, request);
        String nickname = body.get("nickname") instanceof String s ? s : "";
        boolean revoke = Boolean.FALSE.equals(body.get("grant"));
        String name = revoke ? access.revoke(nickname) : access.grant(nickname);
        String actor = auth.currentUser(request).map(u -> u.getNickname()).orElse(AdminAudit.KEY_ACTOR);
        audit.record(actor, revoke ? "비공개 문제집 회수" : "비공개 문제집 부여", name);
        return Map.of("nickname", name, "granted", !revoke, "grants", access.list());
    }
}
