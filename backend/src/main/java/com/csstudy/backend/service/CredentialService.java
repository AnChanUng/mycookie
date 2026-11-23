package com.csstudy.backend.service;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

// 닉네임 + 비밀번호 확인. 일반 로그인과 소셜 계정 연결이 같은 규칙을 쓴다
@Service
@RequiredArgsConstructor
public class CredentialService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public String encode(String password) {
        return passwordEncoder.encode(password);
    }

    /** 비밀번호 규칙: 8자 이상, UTF-8 72바이트 이하(bcrypt 한계). 새로 정하거나 바꿀 때만 확인하고, 기존 비밀번호 로그인은 막지 않는다 */
    public static void requireStrong(String password) {
        if (password == null || password.length() < 8 || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new com.csstudy.backend.exception.CookieException(com.csstudy.backend.exception.CookieErrorCode.INVALID_REQUEST,
                    "비밀번호는 8자 이상, UTF-8 기준 72바이트 이하로 입력해 주세요.");
        }
    }

    /** 로그인: 닉네임 또는 인증을 마친 이메일 + 비밀번호. @가 있고 그런 닉네임이 없으면 이메일로 찾는다 */
    @Transactional
    public User authenticateLogin(String identifier, String password) {
        String id = identifier == null ? "" : identifier.trim();
        if (id.isEmpty() || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임(또는 이메일)과 비밀번호를 입력해주세요.");
        }
        if (id.contains("@") && !userRepository.existsByNickname(id)) {
            User byEmail = userRepository.findByEmail(id.toLowerCase(java.util.Locale.ROOT))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록된 이메일이 아닙니다. 닉네임으로 로그인하거나 이메일을 확인해 주세요."));
            return authenticate(byEmail.getNickname(), password);
        }
        return authenticate(id, password);
    }

    @Transactional
    public User authenticate(String nickname, String password) {
        if (nickname.isEmpty() || password.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임과 비밀번호를 입력해주세요.");
        }
        User user = userRepository.findByNicknameForUpdate(nickname)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "존재하지 않는 닉네임입니다."));
        if (isHashed(user.getPassword())) {
            if (!passwordEncoder.matches(password, user.getPassword())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 틀렸습니다.");
            }
        } else {
            // 암호화 도입 전에 가입한 계정: 평문 비교 후 해시로 교체
            if (!user.getPassword().equals(password)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호가 틀렸습니다.");
            }
            user.setPassword(passwordEncoder.encode(password));
            userRepository.save(user);
        }
        return user;
    }

    private static boolean isHashed(String stored) {
        return stored != null && stored.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
    }
}
