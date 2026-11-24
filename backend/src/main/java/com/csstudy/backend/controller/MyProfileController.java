package com.csstudy.backend.controller;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserProfile;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.service.MembershipService;
import com.csstudy.backend.repository.UserProfileRepository;
import com.csstudy.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

// 마이페이지 프로필 꾸미기. 로그인한 본인 것만 읽고 고친다
@RestController
@RequestMapping("/api/v1/me/profile")
@RequiredArgsConstructor
public class MyProfileController {

    // 고를 수 있는 대표 아이콘과 관심 분야. 화면(profileOptions.js)과 같은 목록이다
    static final List<String> AVATARS = List.of("🍪", "🧑‍💻", "🐱", "🐶", "🦊", "🐼", "🐧", "🦉", "🐻", "🐰", "🚀", "🔥", "🌱", "⭐", "🎯", "📚");
    static final List<String> INTERESTS = List.of("backend", "frontend", "ai", "data", "cloud", "security", "cs", "algo", "public", "finance");
    static final int MAX_INTERESTS = 5, MAX_TEXT = 60;
    // 카드 테마와 아이콘 테두리. 그 등급 이상이 되면 열린다(화면 profileOptions.js와 같은 목록)
    static final Map<String, UserTier> THEMES = Map.of(
            "basic", UserTier.BRONZE, "cookie", UserTier.BRONZE,
            "mint", UserTier.SILVER, "silver", UserTier.SILVER,
            "gold", UserTier.GOLD, "sunset", UserTier.GOLD,
            "diamond", UserTier.DIAMOND, "night", UserTier.DIAMOND,
            "ruby", UserTier.RUBY);
    static final Map<String, UserTier> FRAMES = Map.of(
            "none", UserTier.BRONZE, "silver", UserTier.SILVER, "gold", UserTier.GOLD,
            "diamond", UserTier.DIAMOND, "ruby", UserTier.RUBY);

    private final AuthService auth;
    private final UserProfileRepository profiles;
    private final MembershipService membership;

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> get(HttpServletRequest request) {
        User me = auth.requireUser(request);
        return view(profiles.findByUserId(me.getId()).orElse(null));
    }

    @PutMapping
    @Transactional
    public Map<String, Object> save(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User me = auth.requireUser(request);
        String avatar = body.get("avatar") instanceof String a && !a.isBlank() ? a : null;
        if (avatar != null && !AVATARS.contains(avatar)) throw bad("고를 수 없는 아이콘이에요.");
        List<String> interests = new ArrayList<>();
        if (body.get("interests") instanceof List<?> list) {
            for (Object o : list) {
                if (!(o instanceof String key) || !INTERESTS.contains(key)) throw bad("고를 수 없는 관심 분야예요.");
                if (!interests.contains(key)) interests.add(key);
            }
        }
        if (interests.size() > MAX_INTERESTS) throw bad("관심 분야는 " + MAX_INTERESTS + "개까지 고를 수 있어요.");
        UserTier tier = membership.membership(me).tier();
        String theme = unlocked(body.get("theme"), THEMES, tier, "테마");
        String frame = unlocked(body.get("frame"), FRAMES, tier, "테두리");
        UserProfile p = profiles.findByUserId(me.getId()).orElseGet(() -> { UserProfile n = new UserProfile(); n.setUserId(me.getId()); return n; });
        p.setAvatar(avatar);
        p.setBio(text(body.get("bio")));
        p.setGoal(text(body.get("goal")));
        p.setInterests(interests.isEmpty() ? null : String.join(",", interests));
        p.setTheme(theme);
        p.setFrame(frame);
        p.setUpdatedAt(Instant.now());
        return view(profiles.saveAndFlush(p));
    }

    private static Map<String, Object> view(UserProfile p) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("avatar", p == null ? null : p.getAvatar());
        out.put("bio", p == null ? null : p.getBio());
        out.put("goal", p == null ? null : p.getGoal());
        out.put("interests", p == null || p.getInterests() == null ? List.of() : List.of(p.getInterests().split(",")));
        out.put("theme", p == null ? null : p.getTheme());
        out.put("frame", p == null ? null : p.getFrame());
        return out;
    }

    // 고른 테마 · 테두리가 목록에 있고, 지금 등급으로 열려 있는지 확인한다. 비우면 기본값(null)
    private static String unlocked(Object v, Map<String, UserTier> options, UserTier tier, String what) {
        if (!(v instanceof String key) || key.isBlank()) return null;
        UserTier need = options.get(key);
        if (need == null) throw bad("고를 수 없는 " + what + "예요.");
        if (tier == null || tier.ordinal() < need.ordinal()) throw bad(need.label() + "부터 쓸 수 있는 " + what + "예요.");
        return key;
    }

    // 한 줄 글로 다듬는다(줄바꿈 · 제어 문자는 공백으로). 길면 거절한다
    private static String text(Object v) {
        if (!(v instanceof String s)) return null;
        String t = s.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) return null;
        if (t.codePointCount(0, t.length()) > MAX_TEXT) throw bad(MAX_TEXT + "자까지 적을 수 있어요.");
        return t;
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    // 화면이 error 문구를 그대로 보여 줄 수 있게 {error: "..."}로 돌려준다
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했어요." : e.getReason()));
    }
}
