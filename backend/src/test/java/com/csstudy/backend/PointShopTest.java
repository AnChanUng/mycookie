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

import java.util.ArrayList;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 포인트: 풀이 · 승급 몫을 한 번만 주되 새 풀이는 하루 100문제까지만 인정하고(나머지는 다음 날), 자동 출석은 하루 한 번, 상점에서 산 아이템만 프로필에 쓴다
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PointShopTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.csstudy.backend.repository.PointAccountRepository accounts;
    @Autowired com.csstudy.backend.repository.UserRepository users;

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
    void firstShopVisitCanOverlapAutomaticAttendance() throws Exception {
        String token = register("동시상점테스터");
        int requests = 6;
        var pool = Executors.newFixedThreadPool(requests);
        var ready = new CountDownLatch(requests);
        var start = new CountDownLatch(1);
        try {
            var results = new ArrayList<Future<Integer>>();
            for (int i = 0; i < requests; i++) {
                var request = i % 2 == 0 ? get("/api/v1/points") : post("/api/v1/points/attend");
                results.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    return mvc.perform(request.header("Authorization", token)).andReturn().getResponse().getStatus();
                }));
            }
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            for (var result : results) assertThat(result.get(15, TimeUnit.SECONDS)).isEqualTo(200);
            mvc.perform(get("/api/v1/points").header("Authorization", token))
                    .andExpect(jsonPath("$.balance").value(10)).andExpect(jsonPath("$.shop").isNotEmpty())
                    .andExpect(jsonPath("$.history.length()").value(1));
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void levelRewardsFollowTheRules() {
        assertThat(PointService.levelReward(0)).isZero();
        assertThat(PointService.levelReward(1)).isEqualTo(20);   // 동 쿠키 Ⅳ
        assertThat(PointService.levelReward(5)).isEqualTo(250);  // 은 쿠키 Ⅴ: 단계 50 + 등급 보너스 200
        assertThat(PointService.levelReward(10)).isEqualTo(500); // 금 쿠키 Ⅴ: 100 + 400
        assertThat(PointService.levelReward(24)).isEqualTo(300); // 루비 쿠키 Ⅰ
        assertThat(PointService.levelReward(25)).isZero();
    }

    @Test
    void backfillsOnceThenAttendsAndBuys() throws Exception {
        mvc.perform(get("/api/v1/points")).andExpect(status().isUnauthorized());
        String t = register("포인트테스터");
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(0));

        // 오늘 처음 연 뒤 160문제를 풀었다고 알려 왔다. 풀이 수는 브라우저가 보내는 값이라 하루 100문제까지만 인정한다.
        // 풀이 100 + 승급은 인정한 100문제(은 쿠키 Ⅱ)까지(동 Ⅳ~Ⅰ 80, 은 Ⅴ 250, 은 Ⅳ~Ⅱ 150) + 오늘의 퀘스트(20 + 40 + 80) = 720
        solved(t, "point-device-1", 160);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(720))
                .andExpect(jsonPath("$.todaySolved").value(100)).andExpect(jsonPath("$.quests[2].done").value(true))
                .andExpect(jsonPath("$.pendingSolved").value(60)).andExpect(jsonPath("$.dailySolvedCap").value(100));
        // 다시 열어도 두 번 주지 않는다
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(720))
                .andExpect(jsonPath("$.attendedToday").value(false));

        mvc.perform(post("/api/v1/points/attend").header("Authorization", t)).andExpect(status().isOk())
                .andExpect(jsonPath("$.earned").value(10)).andExpect(jsonPath("$.streak").value(1)).andExpect(jsonPath("$.balance").value(730));
        // 자동 출석이 여러 번 불려도 하루 한 번만 준다
        mvc.perform(post("/api/v1/points/attend").header("Authorization", t)).andExpect(status().isOk())
                .andExpect(jsonPath("$.earned").value(0)).andExpect(jsonPath("$.already").value(true)).andExpect(jsonPath("$.balance").value(730));

        buy(t, "frame:rainbow").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("POINT_NOT_ENOUGH"));
        buy(t, "theme:hacked").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("POINT_ITEM_UNKNOWN"));
        buy(t, "avatar:🍩").andExpect(status().isOk()).andExpect(jsonPath("$.balance").value(430))
                .andExpect(jsonPath("$.owned", hasItem("avatar:🍩")));
        buy(t, "avatar:🍩").andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("POINT_ITEM_OWNED"));

        // 산 아이콘은 프로필에 쓸 수 있고, 사지 않은 상점 테마는 못 쓴다
        var profile = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile").header("Authorization", t)
                .contentType(MediaType.APPLICATION_JSON);
        mvc.perform(profile.content(json.writeValueAsString(Map.of("avatar", "🍩")))).andExpect(status().isOk())
                .andExpect(jsonPath("$.avatar").value("🍩")).andExpect(jsonPath("$.owned", hasItem("avatar:🍩")));
        mvc.perform(profile.content(json.writeValueAsString(Map.of("theme", "sakura")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_ITEM_LOCKED"));
        // 레어 · 전설 테마와 아이콘도 산 사람만 쓴다
        mvc.perform(profile.content(json.writeValueAsString(Map.of("theme", "nebula")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_ITEM_LOCKED"));
        mvc.perform(profile.content(json.writeValueAsString(Map.of("avatar", "🐉")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_ITEM_LOCKED"));
        // 상점에서 내린 아이콘은 더 살 수 없고, 기본 목록에서 뺀 아이콘은 새로 고를 수 없다
        buy(t, "avatar:🧠").andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("POINT_ITEM_UNKNOWN"));
        mvc.perform(profile.content(json.writeValueAsString(Map.of("avatar", "🔥")))).andExpect(status().isBadRequest());

        // 오늘 인정 수를 다 썼으므로 더 알려 와도 오늘은 그대로이고, 다음 날로 넘어간다
        solved(t, "point-device-1", 161);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(430))
                .andExpect(jsonPath("$.pendingSolved").value(61));

        // 다음 날: 넘어간 61문제 + 승급(은 Ⅰ 50, 금 Ⅴ 500)을 받는다. 지난 풀이는 오늘의 퀘스트에 넣지 않는다
        yesterday("포인트테스터");
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(1041))
                .andExpect(jsonPath("$.pendingSolved").value(0)).andExpect(jsonPath("$.todaySolved").value(0))
                .andExpect(jsonPath("$.quests[0].done").value(false));
    }

    @Test
    void questsCountOnlyTodaysNewSolves() throws Exception {
        String t = register("퀘스트테스터");
        // 처음 기록이 들어올 때가 오늘의 출발점: 지난 160문제는 소급 지급만 하고(오늘은 100문제 몫) 퀘스트에는 넣지 않는다
        solved(t, "quest-device-1", 160);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(580))
                .andExpect(jsonPath("$.todaySolved").value(0)).andExpect(jsonPath("$.quests[0].done").value(false));
        // 오늘 6문제를 더 풀면 5문제 퀘스트 20. 풀이 몫은 오늘 인정 수를 다 써서 다음 날로 넘어간다. 순위 기록만 보내도 바로 들어온다
        solved(t, "quest-device-1", 166);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(600))
                .andExpect(jsonPath("$.todaySolved").value(6)).andExpect(jsonPath("$.quests[0].done").value(true))
                .andExpect(jsonPath("$.quests[1].done").value(false));
    }

    // 말이 안 되는 풀이 수(3000)를 알려 와도 하루에 받는 포인트는 100문제 몫과 그만큼의 승급 보상까지다
    @Test
    void forgedHugeCountIsLimitedPerDay() throws Exception {
        String t = register("포인트위조");
        solved(t, "forge-device-1", 3000);
        mvc.perform(get("/api/v1/points").header("Authorization", t)).andExpect(jsonPath("$.balance").value(580))
                .andExpect(jsonPath("$.pendingSolved").value(2900)).andExpect(jsonPath("$.quests[0].done").value(false));
    }

    // 날짜가 바뀐 것처럼 오늘의 출발점을 어제로 돌린다
    private void yesterday(String nickname) {
        Long id = users.findByNickname(nickname).orElseThrow().getId();
        var account = accounts.findById(id).orElseThrow();
        account.setQuestDate(account.getQuestDate().minusDays(1));
        accounts.save(account);
    }

    @Test
    void otherAccountsCannotUseItemsTheyDidNotBuy() throws Exception {
        String t = register("포인트남");
        var profile = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/me/profile").header("Authorization", t)
                .contentType(MediaType.APPLICATION_JSON);
        mvc.perform(profile.content(json.writeValueAsString(Map.of("avatar", "🍩")))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("PROFILE_ITEM_LOCKED"));
        mvc.perform(profile.content(json.writeValueAsString(Map.of("frame", "rainbow")))).andExpect(status().isBadRequest());
    }
}
