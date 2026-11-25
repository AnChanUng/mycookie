package com.csstudy.backend;

import com.csstudy.backend.controller.RankController;
import com.csstudy.backend.entity.NicknameClaim;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.entity.VisitorProfile;
import com.csstudy.backend.entity.VisitorSolved;
import com.csstudy.backend.repository.NicknameClaimRepository;
import com.csstudy.backend.repository.UserRepository;
import com.csstudy.backend.repository.VisitorProfileRepository;
import com.csstudy.backend.repository.VisitorSolvedRepository;
import com.csstudy.backend.service.NicknameService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

// 이슈 #297: 계정에 묶인 기기와, 같은 사람인데 풀이 보고가 계정에 묶이지 않은 기기가 순위에 두 줄로 나왔다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RankDuplicateDeviceTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired RankController rank;
    @Autowired UserRepository users;
    @Autowired VisitorSolvedRepository solved;
    @Autowired VisitorProfileRepository profiles;
    @Autowired NicknameClaimRepository claims;

    @Test
    void looseDeviceWithTheMembersNicknameIsMergedIntoOneRow() throws Exception {
        String name = "중복확인회원";
        User user = users.saveAndFlush(User.builder().nickname(name).password("x").baseTier(UserTier.BRONZE).build());
        claims.saveAndFlush(new NicknameClaim(NicknameService.key(name), "u:" + user.getId()));
        // 계정에 묶인 기기: 30문제
        solved.saveAndFlush(VisitorSolved.builder().visitorId("dup-linked").count(30).userId(user.getId()).updatedAt(Instant.now()).build());
        // 같은 사람의 다른 기기: 계정에 묶이지 않았지만 방문자 닉네임이 그 계정 이름 → 45문제
        solved.saveAndFlush(VisitorSolved.builder().visitorId("dup-loose").count(45).updatedAt(Instant.now()).build());
        profiles.saveAndFlush(VisitorProfile.builder().visitorId("dup-loose").nickname(name).updatedAt(Instant.now()).build());
        // 남의 기기(닉네임 주인이 다른 방문자)는 합치지 않는다
        solved.saveAndFlush(VisitorSolved.builder().visitorId("dup-other").count(12).updatedAt(Instant.now()).build());
        profiles.saveAndFlush(VisitorProfile.builder().visitorId("dup-other").nickname("다른방문자확인").updatedAt(Instant.now()).build());
        claims.saveAndFlush(new NicknameClaim(NicknameService.key("다른방문자확인"), "v:dup-other"));
        ReflectionTestUtils.setField(rank, "cached", null);

        JsonNode top = json.readTree(mvc.perform(get("/api/v1/rank/solved").param("all", "true").header("X-Visitor-Id", "dup-loose"))
                .andReturn().getResponse().getContentAsString());
        List<JsonNode> mine = new ArrayList<>();
        top.path("top").forEach(r -> { if (name.equals(r.path("nickname").asText())) mine.add(r); });

        assertThat(mine).hasSize(1);
        // 기기끼리는 기록을 맞추므로 더하지 않고 가장 큰 값을 쓴다
        assertThat(mine.get(0).path("count").asLong()).isEqualTo(45);
        // 합친 기기로 봐도 내 순위는 그 한 줄이다
        assertThat(top.path("me").path("nickname").asText()).isEqualTo(name);
        assertThat(top.toString()).contains("다른방문자확인");
    }
}
