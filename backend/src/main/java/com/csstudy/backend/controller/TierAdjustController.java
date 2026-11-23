package com.csstudy.backend.controller;

import com.csstudy.backend.service.AdminAudit;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.TierAdjustService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// 관리자 페이지 "등급 조정": 계정 등급 조회와 최소 등급 바꾸기. ADMIN 계정 로그인 또는 관리자 키
@RestController
@RequestMapping("/api/v1/admin/tier")
@RequiredArgsConstructor
public class TierAdjustController {

    private final AdminAuth adminAuth;
    private final AuthService auth;
    private final TierAdjustService tiers;
    private final AdminAudit audit;

    @GetMapping
    public Map<String, Object> lookup(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                      @RequestParam String nickname, HttpServletRequest request) {
        adminAuth.require(key, request);
        return tiers.lookup(nickname);
    }

    @PostMapping
    public Map<String, Object> adjust(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                      @RequestBody Map<String, Object> body, HttpServletRequest request) {
        adminAuth.require(key, request);
        String nickname = body.get("nickname") instanceof String s ? s : "";
        String tier = body.get("tier") instanceof String s ? s : "";
        Integer division = body.get("division") instanceof Number n ? n.intValue() : null;
        Map<String, Object> result = tiers.adjust(nickname, tier, division);
        @SuppressWarnings("unchecked") Map<String, Object> before = (Map<String, Object>) result.get("before");
        String actor = auth.currentUser(request).map(u -> u.getNickname()).orElse(AdminAudit.KEY_ACTOR);
        audit.record(actor, "등급 조정", result.get("nickname") + " · " + before.get("tierName") + " → " + result.get("tierName"));
        return result;
    }
}
