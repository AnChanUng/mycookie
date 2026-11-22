package com.csstudy.backend.service;

import com.csstudy.backend.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

// 비공개 문제집(/private/banks)을 볼 수 있는 계정을 정한다. 찬웅(OWNER)은 항상 열리고, 그 밖에는 서버 환경변수
// PRIVATE_BANK_NICKNAMES(쉼표로 구분한 닉네임)에 적은 계정만 열린다. 저장소에는 닉네임을 적지 않고 홈서버 .env에만 둔다
@Component
public class PrivateBankAccess {

    private final Set<String> nicknames;

    public PrivateBankAccess(@Value("${app.private-bank.nicknames:}") String raw) {
        this.nicknames = raw == null ? Set.of() : Arrays.stream(raw.split(","))
                .map(String::trim).filter(s -> !s.isEmpty()).map(NicknameService::key).collect(Collectors.toUnmodifiableSet());
    }

    public boolean allows(User user) {
        return user != null && user.getNickname() != null && nicknames.contains(NicknameService.key(user.getNickname()));
    }
}
