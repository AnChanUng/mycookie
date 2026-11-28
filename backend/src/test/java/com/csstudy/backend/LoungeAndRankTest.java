package com.csstudy.backend;

import com.csstudy.backend.entity.UsageEvent;
import com.csstudy.backend.repository.UsageEventRepository;
import com.csstudy.backend.repository.VisitorSolvedRepository;
import com.csstudy.backend.service.VisitorProfileService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.admin-key=test-admin-key", "app.security.trust-forwarded-for=true"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoungeAndRankTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UsageEventRepository usageEventRepository;
    @Autowired VisitorSolvedRepository solvedRepository;

    // 한 사람이 연달아 보내면 막히므로, 테스트끼리 서로 다른 방문자와 IP를 쓴다
    private ResultActions say(String visitor, String nickname, String text, String ip) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("visitorId", visitor);
        body.put("nickname", nickname);
        body.put("text", text);
        return mvc.perform(post("/api/v1/lounge/messages").contentType(MediaType.APPLICATION_JSON)
                .header("X-Forwarded-For", ip)
                .content(json.writeValueAsString(body)));
    }

    private JsonNode messages(Long after) throws Exception {
        var request = get("/api/v1/lounge/messages");
        if (after != null) request = request.param("after", String.valueOf(after));
        return json.readTree(mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    // 접속자 수 자체는 UsageTrackingTest가 확인한다. 여기서는 채팅 조회에 그 숫자가 함께 오는지만 본다
    @Test
    void chatResponseCarriesTheOnlineCount() throws Exception {
        mvc.perform(get("/api/v1/lounge/messages")).andExpect(jsonPath("$.online").isNumber());
    }

    @Test
    void streamPushesNewMessagesWithoutAnotherPoll() throws Exception {
        var connection = mvc.perform(get("/api/v1/lounge/stream"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.request().asyncStarted())
                .andReturn();
        say("stream-visitor-1", "스트림", "sse-live-delivery", "10.8.0.1").andExpect(status().isOk());
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(3);
        while (!connection.getResponse().getContentAsString().contains("sse-live-delivery") && System.nanoTime() < deadline) {
            Thread.sleep(10);
        }
        String events = connection.getResponse().getContentAsString();
        org.junit.jupiter.api.Assertions.assertTrue(events.contains("event:messages"));   // 처음 연결 때 전체 목록
        org.junit.jupiter.api.Assertions.assertTrue(events.contains("event:message\n"));   // 새 글은 그 글 하나만
        org.junit.jupiter.api.Assertions.assertTrue(events.contains("sse-live-delivery"));
    }

    @Test
    void messagesAreSharedAndNewOnesComeAfterTheLastSeenId() throws Exception {
        say("lounge-visitor-a1", "하나", "  안녕하세요\n반갑습니다  ", "10.1.0.1")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("안녕하세요 반갑습니다"))   // 한 줄로 다듬는다
                .andExpect(jsonPath("$.visitor").value("lounge-v"));          // 방문자 ID는 앞 8자만 나간다
        JsonNode all = messages(null);
        long lastId = all.get("messages").get(all.get("messages").size() - 1).get("id").asLong();

        say("lounge-visitor-a2", "둘", "오늘 기업은행 풀어 보신 분?", "10.1.0.2").andExpect(status().isOk());

        JsonNode fresh = messages(lastId);
        org.junit.jupiter.api.Assertions.assertEquals(1, fresh.get("messages").size());
        org.junit.jupiter.api.Assertions.assertEquals("둘", fresh.get("messages").get(0).get("nickname").asText());
        org.junit.jupiter.api.Assertions.assertEquals(all.get("epoch").asLong(), fresh.get("epoch").asLong());
    }

    @Test
    void emptyTooLongAndTooFastMessagesAreRejected() throws Exception {
        say("lounge-visitor-b1", "하나검증", "   ", "10.1.1.1").andExpect(status().isBadRequest());
        say("lounge-visitor-b1", "  ", "내용", "10.1.1.1").andExpect(status().isBadRequest());
        say("lounge-visitor-b1", "하나검증", "가".repeat(201), "10.1.1.1").andExpect(status().isBadRequest());

        say("lounge-visitor-b1", "하나검증", "첫 번째", "10.1.1.1").andExpect(status().isOk());
        say("lounge-visitor-b1", "하나검증", "바로 또 보냄", "10.1.1.1").andExpect(status().isTooManyRequests());
    }

    @Test
    void adminCanDeleteAMessageAndOpenScreensAreToldToReload() throws Exception {
        String sent = say("lounge-visitor-c1", "도배", "지워질 글", "10.1.2.1")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        long id = json.readTree(sent).get("id").asLong();
        long epoch = messages(null).get("epoch").asLong();

        mvc.perform(delete("/api/v1/admin/lounge/messages/" + id)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/lounge/messages")).andExpect(status().isUnauthorized());
        mvc.perform(delete("/api/v1/admin/lounge/messages/" + id).header("X-Admin-Key", "test-admin-key"))
                .andExpect(status().isOk());
        mvc.perform(delete("/api/v1/admin/lounge/messages/" + id).header("X-Admin-Key", "test-admin-key"))
                .andExpect(status().isNotFound());

        JsonNode after = messages(null);
        org.junit.jupiter.api.Assertions.assertNotEquals(epoch, after.get("epoch").asLong());
        for (JsonNode m : after.get("messages")) {
            org.junit.jupiter.api.Assertions.assertNotEquals(id, m.get("id").asLong());
        }
    }

    private void solved(String visitor, LocalDate day, String path, String detail, Integer total) {
        usageEventRepository.save(UsageEvent.builder()
                .visitorId(visitor).type("exam").path(path).detail(detail).total(total)
                .score(total == null ? null : 0).day(day).createdAt(Instant.now()).build());
    }

    // 순위는 잠깐 캐시되므로 기록을 모두 넣은 뒤 한 번에 확인한다.
    // 다른 테스트가 오늘 풀이 수를 세므로 넣은 기록은 끝나고 지운다
    @Test
    void solvedRankAddsUpEveryQuestionSolvedSoFar() throws Exception {
        try {
            checkSolvedRank();
        } finally {
            usageEventRepository.deleteAll(usageEventRepository.findAll().stream()
                    .filter(e -> e.getVisitorId().startsWith("rank-visitor-")).toList());
            solvedRepository.deleteAll(solvedRepository.findAll().stream()
                    .filter(v -> v.getVisitorId().startsWith("rank-visitor-")).toList());
        }
    }

    private void checkSolvedRank() throws Exception {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        // 세트 수가 아니라 푼 문제 수를 더한다. 오래전에 푼 것도 모두 센다
        solved("rank-visitor-eight", today, "/exam/ibk", "exam", 5);
        solved("rank-visitor-eight", today, "/exam/hf", "exam", 3);
        // 같은 문제집을 다시 풀거나 오답만 다시 푼 것은 더하지 않는다
        solved("rank-visitor-eight", today, "/exam/ibk", "exam", 5);
        solved("rank-visitor-eight", today, "/exam/ibk", "wrong", 2);
        // 코딩 문제는 테스트 케이스가 몇 개든 한 문제다. 문제 수가 없는 기록은 세지 않는다
        for (int i = 0; i < 6; i++) solved("rank-visitor-six", today.minusDays(200 + i), "/cospro/" + i, "cospro", 10);
        solved("rank-visitor-six", today.minusDays(300), "/cospro/0", "cospro", 10);
        solved("rank-visitor-six", today, "/exam/ibk", "exam", null);
        solved("rank-visitor-none", today, "/exam/ibk", "exam", null);

        mvc.perform(put("/api/v1/profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"rank-visitor-eight\",\"nickname\":\" 많이<b>푸는</b>사람 \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("많이b푸는/b사람"));
        mvc.perform(put("/api/v1/profile").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"rank-visitor-eight\",\"nickname\":\"  \"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(get("/api/v1/rank/solved").header("X-Visitor-Id", "rank-visitor-six"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.top[0].count").value(8))
                .andExpect(jsonPath("$.top[0].nickname").value("많이b푸는/b사람"))
                .andExpect(jsonPath("$.top[0].me").value(false))
                .andExpect(jsonPath("$.top[1].count").value(6))
                .andExpect(jsonPath("$.top[1].me").value(true))
                // 닉네임을 정하지 않았으면 익명 닉네임이 붙는다
                .andExpect(jsonPath("$.top[1].nickname").value(VisitorProfileService.anonymous("rank-visitor-six")))
                .andExpect(jsonPath("$.nickname").doesNotExist())
                .andExpect(jsonPath("$.me.rank").value(2))
                .andExpect(jsonPath("$.me.count").value(6));

        mvc.perform(get("/api/v1/rank/solved").header("X-Visitor-Id", "rank-visitor-none"))
                .andExpect(jsonPath("$.me").doesNotExist());

        // 브라우저가 푼 문제 수를 알려 주면 그 값이 기록으로 어림한 값을 대신하고, 순위에 바로 반영된다
        mvc.perform(put("/api/v1/rank/solved").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"rank-visitor-six\",\"count\":120}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/rank/solved").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"rank-visitor-six\",\"count\":999999}"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/rank/solved").header("X-Visitor-Id", "rank-visitor-six"))
                .andExpect(jsonPath("$.top[0].count").value(120))
                .andExpect(jsonPath("$.top[0].me").value(true))
                .andExpect(jsonPath("$.top[1].count").value(8));
        mvc.perform(get("/api/v1/rank/solved")).andExpect(status().isOk()).andExpect(jsonPath("$.me").doesNotExist());

        // 같은 계정으로 로그인한 폰과 PC는 한 줄로 합쳐지고, 더 큰 쪽 숫자와 계정 닉네임이 나간다
        String token = json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"rank-account\",\"password\":\"pw123456\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("token").asText();
        mvc.perform(put("/api/v1/rank/solved").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content("{\"visitorId\":\"rank-visitor-pc\",\"count\":300}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/rank/solved").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"visitorId\":\"rank-visitor-phone\",\"count\":250}"))
                .andExpect(status().isOk());
        // 문제 수를 알릴 때 계정을 함께 보내지 못한 기기는 아직 따로 나온다
        mvc.perform(get("/api/v1/rank/solved").header("X-Visitor-Id", "rank-visitor-phone"))
                .andExpect(jsonPath("$.top[1].count").value(250))
                .andExpect(jsonPath("$.account").value(false));
        // 순위를 보기만 해서는 묶이지 않는다. 로그인한 채 문제 수를 알릴 때 계정에 묶인다
        mvc.perform(get("/api/v1/rank/solved").header("X-Visitor-Id", "rank-visitor-phone").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.top[1].count").value(250));
        mvc.perform(put("/api/v1/rank/solved").contentType(MediaType.APPLICATION_JSON)
                        .header("Authorization", "Bearer " + token)
                        .content("{\"visitorId\":\"rank-visitor-phone\",\"count\":250}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/rank/solved").header("X-Visitor-Id", "rank-visitor-phone").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.top[0].count").value(300))
                .andExpect(jsonPath("$.top[0].nickname").value("rank-account"))
                .andExpect(jsonPath("$.top[0].me").value(true))
                .andExpect(jsonPath("$.top[1].count").value(120))
                .andExpect(jsonPath("$.account").value(true))
                .andExpect(jsonPath("$.me.rank").value(1));
        // Totals include everyone, with linked phone/PC counted once. Default stays top five.
        for (int i = 1; i <= 4; i++) {
            mvc.perform(put("/api/v1/rank/solved").contentType(MediaType.APPLICATION_JSON)
                    .content("{\"visitorId\":\"rank-visitor-extra-" + i + "\",\"count\":" + i + "}"))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/rank/solved"))
                .andExpect(jsonPath("$.top.length()").value(5))
                .andExpect(jsonPath("$.totalSolvers").value(7))
                .andExpect(jsonPath("$.totalSolved").value(438));
        mvc.perform(get("/api/v1/rank/solved").param("all", "true"))
                .andExpect(jsonPath("$.top.length()").value(7))
                .andExpect(jsonPath("$.top[6].count").value(1))
                .andExpect(jsonPath("$.totalSolved").value(438));
    }
}
