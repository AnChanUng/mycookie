package com.csstudy.backend;

import com.csstudy.backend.entity.NicknameClaim;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.entity.VisitorProfile;
import com.csstudy.backend.repository.NicknameClaimRepository;
import com.csstudy.backend.repository.UserRepository;
import com.csstudy.backend.repository.VisitorProfileRepository;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.NicknameService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 이슈 #299의 POST /lounge/presence → 409: 로그인 전 다른 기기가 같은 이름을 먼저 잡아 둔 회원이
// 로그인한 기기로 채팅에 들어가면 "이미 사용 중인 닉네임"으로 막혔다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoungePresenceNicknameTest {

    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired VisitorProfileRepository profiles;
    @Autowired NicknameClaimRepository claims;
    @Autowired AuthService auth;

    @Test
    void memberCanJoinChatWithOwnNicknameEvenIfAnOldDeviceHeldIt() throws Exception {
        String name = "채팅입장회원";
        User user = users.saveAndFlush(User.builder().nickname(name).password("x").baseTier(UserTier.BRONZE).build());
        // 로그인 전에 쓰던 기기가 같은 이름을 방문자로 잡아 두었다(계정과 연결되지 않음)
        profiles.saveAndFlush(VisitorProfile.builder().visitorId("chat-old-device").nickname(name).updatedAt(Instant.now()).build());
        claims.saveAndFlush(new NicknameClaim(NicknameService.key(name), "v:chat-old-device"));

        mvc.perform(post("/api/v1/lounge/presence").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + auth.issueToken(user))
                        .content("{\"visitorId\":\"chat-new-device\"}"))
                .andExpect(status().isOk());
        assertThat(claims.findById(NicknameService.key(name))).get().extracting(NicknameClaim::getOwner).isEqualTo("u:" + user.getId());
    }

    @Test
    void visitorStillCannotTakeAMembersNickname() throws Exception {
        String name = "다른사람이름회원";
        User owner = users.saveAndFlush(User.builder().nickname(name).password("x").baseTier(UserTier.BRONZE).build());
        claims.saveAndFlush(new NicknameClaim(NicknameService.key(name), "u:" + owner.getId()));

        // 로그인하지 않은 방문자가 남의 계정 이름을 쓰려 하면 여전히 막는다(이름은 바뀌지 않고 익명으로 들어간다면 200일 수도 있으니 주인만 확인)
        mvc.perform(post("/api/v1/lounge/presence").contentType(MediaType.APPLICATION_JSON)
                .content("{\"visitorId\":\"chat-stranger\",\"nickname\":\"" + name + "\"}"));
        assertThat(claims.findById(NicknameService.key(name))).get().extracting(NicknameClaim::getOwner).isEqualTo("u:" + owner.getId());
    }
}
