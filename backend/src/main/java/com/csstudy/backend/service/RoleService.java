package com.csstudy.backend.service;

import com.csstudy.backend.entity.AccountRole;
import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.repository.AccountRoleRepository;
import com.csstudy.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

// 계정 권한(ADMIN, OWNER, TEAM) 확인과 부여. 부여와 관리자 계정 생성은 관리자 키로만 부르는 API에서만 쓴다
@Service
@RequiredArgsConstructor
public class RoleService {

    private final AccountRoleRepository roles;
    private final UserRepository users;
    private final AuthService auth;
    private final NicknameService nicknames;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public Set<Role> rolesOf(User user) {
        if (user == null) return Set.of();
        EnumSet<Role> out = EnumSet.noneOf(Role.class);
        roles.findByUserId(user.getId()).forEach(r -> out.add(r.getRole()));
        return out;
    }

    public boolean has(Optional<User> user, Role role) {
        return user.map(u -> roles.existsByUserIdAndRole(u.getId(), role)).orElse(false);
    }

    /** 로그인하지 않았으면 401, 권한이 없으면 403. 통과하면 그 계정을 돌려준다 */
    public User require(HttpServletRequest request, Role role) {
        User user = auth.currentUser(request).orElseThrow(() -> new CookieException(CookieErrorCode.UNAUTHORIZED));
        if (!roles.existsByUserIdAndRole(user.getId(), role)) throw new CookieException(CookieErrorCode.ROLE_REQUIRED);
        return user;
    }

    @Transactional
    public Set<Role> grant(String nickname, Role role) {
        User user = users.findByNickname(nickname).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND, "그 닉네임의 계정이 없어요."));
        if (!roles.existsByUserIdAndRole(user.getId(), role)) roles.save(new AccountRole(user.getId(), role));
        return rolesOf(user);
    }

    @Transactional
    public Set<Role> revoke(String nickname, Role role) {
        User user = users.findByNickname(nickname).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND, "그 닉네임의 계정이 없어요."));
        roles.findByUserIdAndRole(user.getId(), role).ifPresent(roles::delete);
        return rolesOf(user);
    }

    /** 예약된 이름(admin…)으로 관리자 계정을 만든다. 비밀번호는 12자 이상이고 아이디를 포함하면 안 된다 */
    @Transactional
    public User createReservedAccount(String nickname, String password, Collection<Role> grant) {
        String name = NicknameService.validate(nickname);
        if (!NicknameService.isReserved(name)) throw new CookieException(CookieErrorCode.INVALID_REQUEST, "관리자 계정 이름은 admin으로 시작해야 해요.");
        if (password == null || password.length() < 12 || password.toLowerCase(Locale.ROOT).contains(name.toLowerCase(Locale.ROOT)))
            throw new CookieException(CookieErrorCode.WEAK_ADMIN_PASSWORD);
        if (users.existsByNickname(name)) throw new CookieException(CookieErrorCode.NICKNAME_DUPLICATED);
        User user = nicknames.registerReserved(name, encoder.encode(password));
        grant.forEach(role -> roles.save(new AccountRole(user.getId(), role)));
        return user;
    }

    public List<Map<String, Object>> list() {
        Map<Long, List<String>> byUser = new TreeMap<>();
        roles.findAll().forEach(r -> byUser.computeIfAbsent(r.getUserId(), k -> new ArrayList<>()).add(r.getRole().name()));
        List<Map<String, Object>> out = new ArrayList<>();
        byUser.forEach((id, list) -> out.add(Map.of("nickname", users.findById(id).map(User::getNickname).orElse("(삭제된 계정)"), "roles", list)));
        return out;
    }
}
