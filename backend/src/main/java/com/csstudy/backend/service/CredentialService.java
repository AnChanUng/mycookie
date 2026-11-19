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
