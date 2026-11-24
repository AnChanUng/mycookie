package com.csstudy.backend.controller;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserProfile;
import com.csstudy.backend.repository.UserProfileRepository;
import com.csstudy.backend.repository.UserRepository;
import com.csstudy.backend.service.MembershipService;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

// 채팅 · 순위에서 다른 사람의 대표 아이콘과 테두리를 보여 주려고 닉네임 목록으로 묻는다.
// 꾸미기 중 남에게 보이는 두 가지(아이콘 · 테두리)만 돌려주고, 소개 · 목표 · 관심 분야는 내보내지 않는다.
// 아무것도 고르지 않은 사람은 결과에 넣지 않는다(화면은 지금 모습 그대로 그린다)
@RestController
@RequestMapping("/api/v1/profiles")
@RequiredArgsConstructor
public class PublicProfileController {
    static final int MAX_NICKNAMES = 100;

    private final UserRepository users;
    private final UserProfileRepository profiles;
    private final MembershipService membership;

    // 닉네임을 눌렀을 때 뜨는 작은 프로필 카드. 아이콘 · 테두리 · 테마 · 한 줄 소개 · 관심 분야 · 등급만 보여 주고
    // 목표는 본인만 보도록 내보내지 않는다. 계정이 아닌 닉네임(로그인하지 않은 방문자)은 404
    @GetMapping("/public/{nickname}")
    @Transactional(readOnly = true)
    public Map<String, Object> card(@PathVariable String nickname) {
        User user = users.findByNickname(nickname.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "계정이 아닌 닉네임이에요."));
        UserProfile p = profiles.findByUserId(user.getId()).orElse(null);
        MembershipService.Membership m = membership.membership(user);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nickname", user.getNickname());
        out.put("avatar", p == null ? null : p.getAvatar());
        out.put("frame", p == null || "none".equals(p.getFrame()) ? null : p.getFrame());
        out.put("theme", p == null ? null : p.getTheme());
        out.put("bio", p == null ? null : p.getBio());
        out.put("interests", p == null || p.getInterests() == null ? List.of() : List.of(p.getInterests().split(",")));
        out.put("tier", m.tier());
        out.put("tierName", m.tierName());
        out.put("division", m.division());
        out.put("solvedCount", m.solvedCount());
        return out;
    }

    @GetMapping("/public")
    @Transactional(readOnly = true)
    public Map<String, Map<String, String>> lookup(@RequestParam(name = "nicknames", required = false) List<String> nicknames) {
        if (nicknames == null || nicknames.isEmpty()) return Map.of();
        List<String> names = nicknames.stream().filter(Objects::nonNull).map(String::trim)
                .filter(n -> !n.isEmpty() && n.length() <= 40).distinct().limit(MAX_NICKNAMES).toList();
        if (names.isEmpty()) return Map.of();
        Map<Long, String> nameById = users.findByNicknameIn(names).stream()
                .collect(Collectors.toMap(User::getId, User::getNickname, (a, b) -> a));
        if (nameById.isEmpty()) return Map.of();
        Map<String, Map<String, String>> out = new LinkedHashMap<>();
        for (UserProfile p : profiles.findByUserIdIn(nameById.keySet())) {
            boolean avatar = p.getAvatar() != null, frame = p.getFrame() != null && !"none".equals(p.getFrame());
            if (!avatar && !frame) continue;
            Map<String, String> look = new LinkedHashMap<>();
            if (avatar) look.put("avatar", p.getAvatar());
            if (frame) look.put("frame", p.getFrame());
            out.put(nameById.get(p.getUserId()), look);
        }
        return out;
    }
}
