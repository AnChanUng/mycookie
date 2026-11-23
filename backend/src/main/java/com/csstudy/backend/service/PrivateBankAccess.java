package com.csstudy.backend.service;

import com.csstudy.backend.entity.PrivateBankGrant;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.repository.PrivateBankGrantRepository;
import com.csstudy.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

// 비공개 문제집(/private/banks)을 볼 수 있는 계정을 정한다. 찬웅(OWNER)은 항상 열리고(AuthController), 그 밖에는
//   1) 관리자 페이지에서 열어 준 계정(private_bank_grants 표. 홈서버 작업 없이 웹에서 주고 뺀다)
//   2) 서버 환경변수 PRIVATE_BANK_NICKNAMES(쉼표로 구분한 닉네임)에 적은 계정
// 만 열린다. 저장소에는 닉네임을 적지 않는다
@Component
public class PrivateBankAccess {

    private final Set<String> nicknames;
    private final PrivateBankGrantRepository grants;
    private final UserRepository users;

    public PrivateBankAccess(@Value("${app.private-bank.nicknames:}") String raw, PrivateBankGrantRepository grants, UserRepository users) {
        this.nicknames = raw == null ? Set.of() : Arrays.stream(raw.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).map(NicknameService::key).collect(Collectors.toUnmodifiableSet());
        this.grants = grants;
        this.users = users;
    }

    public boolean allows(User user) {
        if (user == null) return false;
        if (user.getNickname() != null && nicknames.contains(NicknameService.key(user.getNickname()))) return true;
        return user.getId() != null && grants.existsByUserId(user.getId());
    }

    /** 관리자 페이지에서 열어 준 계정 목록(최근 순). 닉네임은 지금 닉네임으로 보여 준다 */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> list() {
        List<PrivateBankGrant> all = grants.findAllByOrderByGrantedAtDesc();
        Map<Long, User> byId = users.findAllById(all.stream().map(PrivateBankGrant::getUserId).toList()).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
        List<Map<String, Object>> out = new ArrayList<>();
        for (PrivateBankGrant g : all) {
            User u = byId.get(g.getUserId());
            if (u == null) continue;
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("nickname", u.getNickname());
            row.put("grantedAt", g.getGrantedAt());
            out.add(row);
        }
        return out;
    }

    @Transactional
    public String grant(String nickname) {
        User user = find(nickname);
        if (!grants.existsByUserId(user.getId())) grants.save(new PrivateBankGrant(user.getId()));
        return user.getNickname();
    }

    @Transactional
    public String revoke(String nickname) {
        User user = find(nickname);
        grants.findByUserId(user.getId()).ifPresent(grants::delete);
        return user.getNickname();
    }

    private User find(String nickname) {
        String name = nickname == null ? "" : nickname.trim();
        if (name.isEmpty()) throw new CookieException(CookieErrorCode.INVALID_REQUEST, "닉네임을 입력해 주세요.");
        return users.findByNickname(name).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND, "그 닉네임의 계정이 없어요."));
    }
}
