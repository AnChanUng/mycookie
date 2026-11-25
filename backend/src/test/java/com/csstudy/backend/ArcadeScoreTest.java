package com.csstudy.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.admin-key=test-admin-key", "app.security.trust-forwarded-for=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ArcadeScoreTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    // 순위판마다 IP당 등록 수 제한이 있어서, 테스트끼리 서로 다른 순위판과 IP를 쓴다
    private ResultActions submit(String game, String visitor, String nickname, Object score, String ip) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("game", game);
        body.put("visitorId", visitor);
        body.put("nickname", nickname);
        body.put("score", score);
        return mvc.perform(post("/api/v1/arcade/scores").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", ip)
                .content(json.writeValueAsString(body)));
    }

    @Test
    void nonsenseIsRejected() throws Exception {
        submit("no-such-game", "visitor-a0", "철수", 100, "10.0.0.1").andExpect(status().isBadRequest());
        submit("snake", "visitor-a0", "   ", 100, "10.0.0.1").andExpect(status().isBadRequest());        // 닉네임 없음
        submit("snake", "visitor-a0", "철수", 99_999_999, "10.0.0.1").andExpect(status().isBadRequest());  // 말이 안 되는 점수
        submit("reaction", "visitor-a0", "철수", 5, "10.0.0.1").andExpect(status().isBadRequest());       // 사람이 낼 수 없는 반응속도
        mvc.perform(get("/api/v1/arcade/scores").param("game", "no-such-game")).andExpect(status().isNotFound());
    }

    @Test
    void higherScoresClimbTheBoardAndOnlyThreeAreShown() throws Exception {
        submit("flappy", "visitor-b1", "하나", 10, "10.0.1.1").andExpect(jsonPath("$.saved").value(true));
        submit("flappy", "visitor-b2", "둘", 30, "10.0.1.2").andExpect(jsonPath("$.saved").value(true));
        submit("flappy", "visitor-b3", "셋", 20, "10.0.1.3").andExpect(jsonPath("$.saved").value(true));

        // 3등보다 낮으면 올라가지 않는다
        submit("flappy", "visitor-b4", "넷", 5, "10.0.1.4")
                .andExpect(jsonPath("$.saved").value(false))
                .andExpect(jsonPath("$.top.length()").value(3));

        // 1등을 넘으면 맨 위로 가고 꼴찌가 밀려난다
        submit("flappy", "visitor-b4", "넷", 40, "10.0.1.4")
                .andExpect(jsonPath("$.saved").value(true))
                .andExpect(jsonPath("$.top[0].nickname").value("넷"))
                .andExpect(jsonPath("$.top[1].nickname").value("둘"))
                .andExpect(jsonPath("$.top[2].nickname").value("셋"));

        // 같은 사람이 더 낮은 점수를 보내도 기록은 그대로다. 더 높으면 같은 줄이 고쳐지고 닉네임도 바뀐다
        submit("flappy", "visitor-b2", "둘", 1, "10.0.1.2").andExpect(jsonPath("$.saved").value(false));
        submit("flappy", "visitor-b2", "둘째", 50, "10.0.1.2")
                .andExpect(jsonPath("$.top[0].nickname").value("둘째"))
                .andExpect(jsonPath("$.top[0].score").value(50))
                .andExpect(jsonPath("$.top.length()").value(3));

        mvc.perform(get("/api/v1/arcade/scores").param("game", "flappy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.flappy[0].score").value(50))
                .andExpect(jsonPath("$.flappy[0].visitor").value("visitor-"));
    }

    @Test
    void timeBoardsRankTheSmallestFirst() throws Exception {
        submit("mines-easy", "visitor-c1", "느림", 90, "10.0.2.1").andExpect(jsonPath("$.saved").value(true));
        submit("mines-easy", "visitor-c2", "빠름", 35, "10.0.2.2")
                .andExpect(jsonPath("$.top[0].nickname").value("빠름"))
                .andExpect(jsonPath("$.top[1].nickname").value("느림"));
        // 같은 사람은 더 짧은 시간일 때만 고쳐진다
        submit("mines-easy", "visitor-c1", "느림", 120, "10.0.2.1").andExpect(jsonPath("$.saved").value(false));
        submit("mines-easy", "visitor-c1", "느림", 20, "10.0.2.1").andExpect(jsonPath("$.top[0].nickname").value("느림"));
    }

    @Test
    void nicknamesAreCleanedAndOneNetworkCannotFillABoard() throws Exception {
        submit("memory-4", "visitor-d0", "  <b>긴   닉네임입니다아아</b>  ", 30, "10.0.3.9")
                .andExpect(jsonPath("$.top[0].nickname").value("b긴 닉네임입니다아"));

        for (int i = 1; i <= 5; i++) {
            submit("memory-6", "visitor-e" + i, "도배" + i, 100 - i, "10.0.3.1").andExpect(status().isOk());
        }
        submit("memory-6", "visitor-e6", "도배6", 20, "10.0.3.1").andExpect(status().isBadRequest());
        // 이미 올라간 사람이 기록을 고치는 것은 막지 않는다
        submit("memory-6", "visitor-e5", "도배5", 19, "10.0.3.1").andExpect(jsonPath("$.saved").value(true));
    }

    @Test
    void adminCanListAndDeleteScores() throws Exception {
        submit("breakout", "visitor-f1", "지울사람", 777, "10.0.4.1").andExpect(jsonPath("$.saved").value(true));
        mvc.perform(get("/api/v1/admin/arcade/scores")).andExpect(status().isUnauthorized());

        String listed = mvc.perform(get("/api/v1/admin/arcade/scores").header("X-Admin-Key", "test-admin-key"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long id = 0;
        for (var row : json.readTree(listed)) if ("breakout".equals(row.get("game").asText()) && row.get("score").asLong() == 777) id = row.get("id").asLong();

        mvc.perform(delete("/api/v1/admin/arcade/scores/" + id).header("X-Admin-Key", "test-admin-key"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/arcade/scores").param("game", "breakout"))
                .andExpect(jsonPath("$.breakout.length()").value(0));
    }

    // X-Forwarded-For 앞쪽은 누구나 지어 넣을 수 있다. 프록시가 붙인 맨 뒤 주소로 세므로 앞값을 바꿔도 IP당 등록 제한을 넘지 못한다
    @Test
    void forgedForwardedForDoesNotBypassThePerNetworkLimit() throws Exception {
        for (int i = 1; i <= 5; i++) {
            submit("2048", "visitor-x" + i, "위조" + i, i * 100, "203.0.113." + i + ", 10.7.7.7")
                    .andExpect(jsonPath("$.saved").value(true));
        }
        submit("2048", "visitor-x6", "위조6", 600, "203.0.113.6, 10.7.7.7")
                .andExpect(status().isBadRequest());
    }
}
