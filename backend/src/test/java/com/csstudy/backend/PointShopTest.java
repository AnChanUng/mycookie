package com.csstudy.backend;

import com.csstudy.backend.service.PointService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 포인트: 지금까지의 풀이 · 승급 몫을 한 번만 주고, 자동 출석은 하루 한 번, 상점에서 산 아이템만 프로필에 쓴다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PointShopTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String register(String name) throws Exception {
        return "Bearer " + json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    private void solved(String token, String device, int count) throws Exception {
        mvc.perform(put("/api/v1/rank/solved").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("visitorId", device, "count", count)))).andExpect(status().isOk());
    }

    private ResultActions buy(String token, String item) throws Exception {
        return mvc.perform(post("/api/v1/points/shop").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("item", item))));
    }

    @Test
    void levelRewardsFollowTheRules() {
        assertThat(PointService.levelReward(0)).isZero();
        assertThat(PointService.levelReward(1)).isEqualTo(10);   // 동 쿠키 Ⅳ
        assertThat(PointService.levelReward(5)).isEqualTo(130);  // 은 쿠키 Ⅴ: 단계 30 + 등급 보너스 100
        assertThat(PointService.levelReward(10)).isEqualTo(260); // 금 쿠키 Ⅴ: 60 + 200
        assertThat(PointService.levelReward(24)).isEqualTo(200); // 루비 쿠키 Ⅰ
        assertThat(PointService.levelReward(25)).isZero();
    }

    @Test
    void backfillsOnceThenAttendsAndBuys() throws Exception {
        mvc.perform(get("/api/v1/points")).andExpect(status().isUnauthorized());
        String t = register("포인트테스터");
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(0));

        // 오늘 처음 연 뒤 160문제(금 쿠키 Ⅴ)를 풀었다. 풀이 160 + 승급(동 Ⅳ~Ⅰ 40, 은 Ⅴ 130, 은 Ⅳ~Ⅰ 120, 금 Ⅴ 260)
        // + 오늘의 퀘스트(5 · 15 · 30문제: 20 + 40 + 80) = 850
        solved(t, "point-device-1", 160);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(850))
                .andExpect(jsonPath("$.todaySolved").value(160)).andExpect(jsonPath("$.quests[2].done").value(true));
        // 다시 열어도 두 번 주지 않는다
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(850))
                .andExpect(jsonPath("$.attendedToday").value(false));

        mvc.perform(post("/api/v1/points/attend").header("Authorization", t)).andExpect(status().isOk())
                .andExpect(jsonPath("$.earned").value(10)).andExpect(jsonPath("$.streak").value(1)).andExpect(jsonPath("$.balance").value(860));
        // 자동 출석이 여러 번 불려도 하루 한 번만 준다
        mvc.perform(post("/api/v1/points/attend").header("Authorization", t)).andExpect(status().isOk())
                .andExpect(jsonPath("$.earned").value(0)).andExpect(jsonPath("$.already").value(true)).andExpect(jsonPath("$.balance").value(860));

        buy(t, "frame:rainbow").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("POINT_NOT_ENOUGH"));
        buy(t, "theme:hacked").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("POINT_ITEM_UNKNOWN"));
        buy(t, "avatar:🦄").andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(560))
                .andExpect(jsonPath("$.owned", hasItem("avatar:🦄")));
        buy(t, "avatar:🦄").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("POINT_ITEM_OWNED"));

        // 산 아이콘은 프로필에 쓸 수 있고, 사지 않은 상점 테마는 못 쓴다
        var profile = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile").header("Authorization", t)
                .contentType(MediaType.APPLICATION_JSON);
        mvc.perform(profile.content(json.writeValueAsString(Map.of("avatar", "🦄")))).andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").value("🦄")).andExpect(jsonPath("$.owned", hasItem("avatar:🦄")));
        mvc.perform(profile.content(json.writeValueAsString(Map.of("theme", "sakura")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_ITEM_LOCKED"));

        // 더 풀면 늘어난 만큼만 준다(161번째 문제 1점)
        solved(t, "point-device-1", 161);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(561));
    }

    @Test
    void questsCountOnlyTodaysNewSolves() throws Exception {
        String t = register("퀘스트테스터");
        // 처음 기록이 들어올 때가 오늘의 출발점: 지난 160문제는 소급 지급만 하고 퀘스트에는 넣지 않는다
        solved(t, "quest-device-1", 160);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(710))
                .andExpect(jsonPath("$.todaySolved").value(0)).andExpect(jsonPath("$.quests[0].done").value(false));
        // 오늘 6문제를 더 풀면 풀이 6 + 5문제 퀘스트 20. 순위 기록만 보내도 바로 들어온다
        solved(t, "quest-device-1", 166);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(736))
                .andExpect(jsonPath("$.todaySolved").value(6)).andExpect(jsonPath("$.quests[0].done").value(true))
                .andExpect(jsonPath("$.quests[1].done").value(false));
    }

    @Test
    void otherAccountsCannotUseItemsTheyDidNotBuy() throws Exception {
        String t = register("포인트남");
        var profile = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile").header("Authorization", t)
                .contentType(MediaType.APPLICATION_JSON);
        mvc.perform(profile.content(json.writeValueAsString(Map.of("avatar", "🦄")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_ITEM_LOCKED"));
        mvc.perform(profile.content(json.writeValueAsString(Map.of("frame", "rainbow")))).andExpect(status().isBadRequest());
    }
}
