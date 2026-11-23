package com.csstudy.backend;

import com.csstudy.backend.entity.*;
import com.csstudy.backend.repository.*;
import com.csstudy.backend.service.*;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class PromotionExamTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired PromotionAttemptRepository attempts;
    @Autowired TierAwardRepository awards;
    @Autowired VisitorTierGrantRepository grants;
    @Autowired UserRepository users;
    private JsonNode start(String visitor) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/promotion-exams").header("X-Visitor-Id",visitor))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(jsonPath("$.questions[0].a").doesNotExist())
                .andExpect(jsonPath("$.questions[0].e").doesNotExist())
                .andReturn().getResponse().getContentAsString());
    }
    private Map<String,Integer> answers(String id,int right) throws Exception {
        var questions=json.readTree(attempts.findById(id).orElseThrow().getQuestions());
        Map<String,Integer> answers=new HashMap<>(); int index=0;
        for(var q:questions) answers.put(q.path("id").asText(),index++<right?q.path("a").asInt():(q.path("a").asInt()+1)%q.path("o").size());
        return answers;
    }
    private JsonNode submit(String visitor,String id,Map<String,Integer> answers) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/promotion-exams/"+id+"/submit").header("X-Visitor-Id",visitor)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("answers",answers,"score",100))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    @Test void balancedRandomPaperIsPrivateAndResumable() throws Exception {
        var paper=start("exam-owner"); var questions=paper.path("questions");
        assertEquals(30,questions.size());
        Map<String,Integer> counts=new HashMap<>();Set<String> ids=new HashSet<>();
        questions.forEach(q->{counts.merge(q.path("group").asText(),1,Integer::sum);ids.add(q.path("id").asText());});
        assertEquals(30,ids.size());
        assertEquals(Map.of("os",6,"net",6,"db",6,"arch",6,"c",2,"java",2,"python",2),counts);
        var second=start("exam-owner");assertNotEquals(paper.path("questions"),second.path("questions"));
        String url="/api/v1/promotion-exams/"+paper.path("id").asText();
        mvc.perform(get(url).header("X-Visitor-Id","exam-owner")).andExpect(status().isOk())
                .andExpect(jsonPath("$.questions[0].a").doesNotExist());
        mvc.perform(get(url).header("X-Visitor-Id","exam-other")).andExpect(status().isNotFound());
        mvc.perform(post(url+"/submit").header("X-Visitor-Id","exam-other").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("answers",answers(paper.path("id").asText(),30)))))
                .andExpect(status().isNotFound());
    }
    @Test void serverGrades95PercentBoundaryAndSubmissionRetryDoesNotPromoteTwice() throws Exception {
        // 예전 기본 금 쿠키(grant)는 등급을 올리지 않는다: 0문제면 동 쿠키 Ⅴ에서 시험으로 한 단계씩 오른다
        grants.saveAndFlush(new VisitorTierGrant("exam-gold",UserTier.GOLD));
        String failed=start("exam-gold").path("id").asText();
        var fail=submit("exam-gold",failed,answers(failed,28));
        assertEquals(93.3,fail.path("score").asDouble());assertFalse(fail.path("passed").asBoolean());
        assertEquals(-1,awards.findById("visitor:exam-gold").orElseThrow().getTierLevel());
        String passed=start("exam-gold").path("id").asText();
        var result=submit("exam-gold",passed,answers(passed,29));
        assertEquals(96.7,result.path("score").asDouble());assertTrue(result.path("promoted").asBoolean());
        assertEquals("동 쿠키 Ⅳ",result.path("tierName").asText());
        assertEquals(1,awards.findById("visitor:exam-gold").orElseThrow().getTierLevel());
        assertEquals(result,submit("exam-gold",passed,answers(passed,0)));
        assertEquals(1,awards.findById("visitor:exam-gold").orElseThrow().getTierLevel());
        mvc.perform(get("/api/v1/membership").header("X-Visitor-Id","exam-gold"))
                .andExpect(jsonPath("$.tier").value("BRONZE")).andExpect(jsonPath("$.division").value(4))
                .andExpect(jsonPath("$.solvedCount").value(0));
        String next=start("exam-gold").path("id").asText();
        assertEquals("동 쿠키 Ⅲ",submit("exam-gold",next,answers(next,30)).path("tierName").asText());
    }
    @Test void incompleteOrInvalidAnswersCannotEarnPromotionAndHighestTierIsCapped() throws Exception {
        String id=start("exam-cap").path("id").asText();
        mvc.perform(post("/api/v1/promotion-exams/"+id+"/submit").header("X-Visitor-Id","exam-cap")
                .contentType(MediaType.APPLICATION_JSON).content("{\"answers\":{},\"score\":100}"))
                .andExpect(status().isBadRequest());
        assertNull(attempts.findById(id).orElseThrow().getResult());
        var invalid=answers(id,30);invalid.replaceAll((k,v)->999);
        mvc.perform(post("/api/v1/promotion-exams/"+id+"/submit").header("X-Visitor-Id","exam-cap")
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("answers",invalid))))
                .andExpect(status().isBadRequest());
        awards.findById("visitor:exam-cap").orElseThrow().setTierLevel(24);awards.flush();
        var result=submit("exam-cap",id,answers(id,30));
        assertTrue(result.path("passed").asBoolean());assertFalse(result.path("promoted").asBoolean());
        assertEquals("루비 쿠키 Ⅰ",result.path("tierName").asText());
    }
    @Test void guestAwardSurvivesRegistrationAndCannotBeSubmittedAsAnotherAccount() throws Exception {
        String id=start("exam-guest").path("id").asText();submit("exam-guest",id,answers(id,30));
        var registered=json.readTree(mvc.perform(post("/api/v1/auth/register").header("X-Visitor-Id","exam-guest")
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"exam-registered\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String token="Bearer "+registered.path("token").asText();
        mvc.perform(get("/api/v1/membership").header("Authorization",token))
                .andExpect(jsonPath("$.division").value(4));
        mvc.perform(get("/api/v1/promotion-exams/"+id).header("Authorization",token))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/promotion-exams").header("Authorization","Bearer invalid"))
                .andExpect(status().isUnauthorized());
    }
}
