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
    private final org.springframework.context.ApplicationEventPublisher events;
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
        events.publishEvent(new NicknameService.Changed(user.getId()));
        return rolesOf(user);
    }

    @Transactional
    public Set<Role> revoke(String nickname, Role role) {
        User user = users.findByNickname(nickname).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND, "그 닉네임의 계정이 없어요."));
        roles.findByUserIdAndRole(user.getId(), role).ifPresent(roles::delete);
        events.publishEvent(new NicknameService.Changed(user.getId()));
        return rolesOf(user);
    }

    /** 예약된 이름(admin…)으로 관리자 계정을 만든다. 비밀번호는 비어 있지 않고 아이디를 포함하면 안 된다(길이 제한은 두지 않는다) */
    @Transactional
    public User createReservedAccount(String nickname, String password, Collection<Role> grant) {
        String name = NicknameService.validate(nickname);
        if (!NicknameService.isReserved(name)) throw new CookieException(CookieErrorCode.INVALID_REQUEST, "관리자 계정 이름은 admin으로 시작해야 해요.");
        if (password == null || password.isBlank() || password.toLowerCase(Locale.ROOT).contains(name.toLowerCase(Locale.ROOT)))
            throw new CookieException(CookieErrorCode.WEAK_ADMIN_PASSWORD);
        if (users.existsByNickname(name)) throw new CookieException(CookieErrorCode.NICKNAME_DUPLICATED);
        User user = nicknames.registerReserved(name, encoder.encode(password));
        grant.forEach(role -> roles.save(new AccountRole(user.getId(), role)));
        return user;
    }

    public List<Map<String, Object>> list() {
        Map<Long, List<String>> byUser = new TreeMap<>();
        roles.findAll().forEach(r -> byUser.computeIfAbsent(r.getUserId(), k -> new ArrayList<>()).add(r.getRole().name()));
        users.findAll().stream().filter(u -> NicknameService.isReserved(u.getNickname()))
                .forEach(u -> byUser.computeIfAbsent(u.getId(), k -> new ArrayList<>()));
        List<Map<String, Object>> out = new ArrayList<>();
        byUser.forEach((id, list) -> users.findById(id).ifPresent(u -> out.add(Map.of("nickname", u.getNickname(), "roles", list, "tier", u.getBaseTier()))));
        return out;
    }

    @Transactional
    public User createTestAccount(String nickname, String password) {
        var tiers = com.csstudy.backend.entity.UserTier.values();
        int index = List.of("admin1", "admin2", "admin3", "admin4", "admin5").indexOf(nickname);
        if (index < 0) throw new CookieException(CookieErrorCode.INVALID_REQUEST, "테스트 계정은 admin1~admin5 중 하나예요.");
        User user = createReservedAccount(nickname, password, index < 2 ? List.of(Role.ADMIN, Role.TEAM) : List.of());
        user.setBaseTier(tiers[index]);
        return users.save(user);
    }

    @Transactional
    public User applyTestProfile(String nickname) {
        int index = List.of("admin1", "admin2", "admin3", "admin4", "admin5").indexOf(nickname);
        if (index < 0) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        User user = users.findByNickname(nickname).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND));
        var wanted = index < 2 ? Set.of(Role.ADMIN, Role.TEAM) : Set.<Role>of();
        for (var existing : roles.findByUserId(user.getId())) if (!wanted.contains(existing.getRole())) roles.delete(existing);
        for (var role : wanted) if (!roles.existsByUserIdAndRole(user.getId(), role)) roles.save(new AccountRole(user.getId(), role));
        user.setBaseTier(com.csstudy.backend.entity.UserTier.values()[index]);
        events.publishEvent(new NicknameService.Changed(user.getId()));
        return users.save(user);
    }
}
