package com.csstudy.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class ChatReactionAndFriendSearchTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    String register(String name) throws Exception {
        var result = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
            .andExpect(status().isOk()).andReturn();
        return "Bearer " + json.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
    JsonNode body(org.springframework.test.web.servlet.ResultActions r) throws Exception {
        return json.readTree(r.andReturn().getResponse().getContentAsString());
    }

    @Test void friendSearchMembersPreviewAndDirectReactions() throws Exception {
        String a = register("srch-alpha"), b = register("srch-beta");
        register("srch-gamma");
        mvc.perform(get("/api/v1/direct/search").param("q", "srch")).andExpect(status().isUnauthorized());
        // 본인은 빼고, 부분 일치로 찾는다
        mvc.perform(get("/api/v1/direct/search").param("q", "SRCH").header("Authorization", a))
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].nickname").value("srch-beta"))
            .andExpect(jsonPath("$[0].friendship").value("none"));
        mvc.perform(get("/api/v1/direct/search").param("q", "  ").header("Authorization", a)).andExpect(jsonPath("$.length()").value(0));
        // 접속자 가운데 계정만 돌려준다
        mvc.perform(post("/api/v1/direct/members").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nicknames\":[\"srch-beta\",\"익명손님\",\"srch-alpha\"]}"))
            .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].nickname").value("srch-beta"));

        long id = body(mvc.perform(post("/api/v1/direct").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"srch-beta\"}"))).get("id").asLong();
        mvc.perform(post("/api/v1/direct/" + id + "/friend").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
            .content("{\"action\":\"request\"}"));
        mvc.perform(get("/api/v1/direct/search").param("q", "beta").header("Authorization", a))
            .andExpect(jsonPath("$[0].friendship").value("sent")).andExpect(jsonPath("$[0].threadId").value(id));
        mvc.perform(get("/api/v1/direct/search").param("q", "alpha").header("Authorization", b))
            .andExpect(jsonPath("$[0].friendship").value("received"));

        mvc.perform(post("/api/v1/direct/" + id + "/messages").header("Authorization", a).contentType(MediaType.APPLICATION_JSON)
            .content("{\"text\":\"안녕하세요\",\"clientId\":\"react-1\"}")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/direct").header("Authorization", b))
            .andExpect(jsonPath("$[0].lastText").value("안녕하세요")).andExpect(jsonPath("$[0].lastMine").value(false));
        long messageId = body(mvc.perform(get("/api/v1/direct/" + id + "/messages").header("Authorization", b))).get(0).get("id").asLong();
        String react = "/api/v1/direct/" + id + "/messages/" + messageId + "/reactions";
        mvc.perform(post(react).header("Authorization", b).contentType(MediaType.APPLICATION_JSON).content("{\"emoji\":\"💩\"}"))
            .andExpect(status().isBadRequest());
        String c = register("srch-outsider");
        mvc.perform(post(react).header("Authorization", c).contentType(MediaType.APPLICATION_JSON).content("{\"emoji\":\"👍\"}"))
            .andExpect(status().isNotFound());
        mvc.perform(post(react).header("Authorization", b).contentType(MediaType.APPLICATION_JSON).content("{\"emoji\":\"👍\"}"))
            .andExpect(jsonPath("$[0].emoji").value("👍")).andExpect(jsonPath("$[0].count").value(1)).andExpect(jsonPath("$[0].mine").value(true));
        mvc.perform(get("/api/v1/direct/" + id + "/messages").header("Authorization", a))
            .andExpect(jsonPath("$[0].reactions[0].count").value(1)).andExpect(jsonPath("$[0].reactions[0].mine").value(false));
        // 같은 반응을 다시 누르면 뗀다
        mvc.perform(post(react).header("Authorization", b).contentType(MediaType.APPLICATION_JSON).content("{\"emoji\":\"👍\"}"))
            .andExpect(jsonPath("$.length()").value(0));
    }

    @Test void loungeReactionsToggleAndAppearInMessages() throws Exception {
        String visitor = "react-visitor-0001";
        var sent = body(mvc.perform(post("/api/v1/lounge/messages").contentType(MediaType.APPLICATION_JSON)
            .header("X-Forwarded-For", "10.9.8.7")
            .content(json.writeValueAsString(Map.of("visitorId", "react-author-0001", "nickname", "반응작성자", "text", "반응 달아 주세요")))));
        long id = sent.get("id").asLong();
        String path = "/api/v1/lounge/messages/" + id + "/reactions";
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"visitorId\":\"" + visitor + "\",\"emoji\":\"x\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/lounge/messages/999999999/reactions").contentType(MediaType.APPLICATION_JSON)
            .content("{\"visitorId\":\"" + visitor + "\",\"emoji\":\"🎉\"}")).andExpect(status().isNotFound());
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"visitorId\":\"" + visitor + "\",\"emoji\":\"🎉\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.reactions['🎉'][0]").value("react-vi"));
        JsonNode list = body(mvc.perform(get("/api/v1/lounge/messages")));
        boolean found = false;
        for (JsonNode m : list.get("messages")) if (m.get("id").asLong() == id) {
            found = true;
            org.junit.jupiter.api.Assertions.assertEquals(1, m.get("reactions").get("🎉").size());
        }
        org.junit.jupiter.api.Assertions.assertTrue(found);
        mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{\"visitorId\":\"" + visitor + "\",\"emoji\":\"🎉\"}"))
            .andExpect(jsonPath("$.reactions['🎉']").doesNotExist());
    }
}
