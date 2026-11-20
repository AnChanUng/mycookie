package com.csstudy.backend.controller;

import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

// 관리자 계정 만들기와 권한 주기. 관리자 키로만 부를 수 있다(요청 필터와 여기서 두 번 확인).
// 홈서버에서 deploy/homeserver/account.sh로 부른다. 인터넷 쪽 화면에는 이 기능이 없다
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AccountAdminController {

    private final AdminAuth adminAuth;
    private final RoleService roles;

    @PostMapping("/accounts")
    public Map<String, Object> create(@RequestHeader(value = "X-Admin-Key", required = false) String key, @RequestBody Map<String, Object> body) {
        adminAuth.requireKey(key);
        User user = roles.createReservedAccount(str(body.get("nickname")), str(body.get("password")), parseRoles(body.get("roles")));
        return Map.of("nickname", user.getNickname(), "roles", roles.rolesOf(user));
    }

    @GetMapping("/roles")
    public List<Map<String, Object>> list(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.requireKey(key);
        return roles.list();
    }

    @PostMapping("/roles")
    public Map<String, Object> grant(@RequestHeader(value = "X-Admin-Key", required = false) String key, @RequestBody Map<String, Object> body) {
        adminAuth.requireKey(key);
        String nickname = str(body.get("nickname"));
        Role role = parseRole(body.get("role"));
        return Map.of("nickname", nickname, "roles", Boolean.FALSE.equals(body.get("grant")) ? roles.revoke(nickname, role) : roles.grant(nickname, role));
    }

    private static String str(Object v) { return v instanceof String s ? s.trim() : ""; }

    private static Role parseRole(Object v) {
        try { return Role.valueOf(str(v).toUpperCase(Locale.ROOT)); }
        catch (IllegalArgumentException e) { throw new CookieException(CookieErrorCode.INVALID_REQUEST, "권한은 ADMIN, OWNER, TEAM 중 하나예요."); }
    }

    private static Set<Role> parseRoles(Object v) {
        EnumSet<Role> out = EnumSet.noneOf(Role.class);
        if (v instanceof List<?> list) for (Object o : list) out.add(parseRole(o));
        else if (v instanceof String s) for (String part : s.split(",")) if (!part.isBlank()) out.add(parseRole(part));
        return out;
    }
}
