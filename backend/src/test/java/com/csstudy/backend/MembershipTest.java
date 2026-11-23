package com.csstudy.backend;

import com.csstudy.backend.entity.*;
import com.csstudy.backend.repository.*;
import com.csstudy.backend.service.MembershipService;
import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class MembershipTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired ExamProgressRepository progress;
    @Autowired VisitorTierGrantRepository grants;
    @Autowired MembershipService membership;

    private JsonNode register(String name) throws Exception {
        return json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("nickname",name,"password","test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private void save(User user,int count) throws Exception {
        var root=json.createObjectNode();var stats=root.putObject("stats");
        for(int i=0;i<count;i++)stats.putObject("q"+i).put("c",3).put("w",2);
        stats.putObject("empty").put("c",0).put("w",0);
        var record=progress.findByUserIdAndCompany(user.getId(),"ibkit").orElseGet(()->ExamProgress.builder().user(user).company("ibkit").build());
        record.setData(json.writeValueAsString(root));progress.saveAndFlush(record);
    }
    // 등급은 푼 문제 수로만 정한다: 은 50 · 금 150 · 다이아 300 · 루비 1,000. 예전 기본 금 쿠키(base GOLD)는 등급을 올리지 않는다
    @Test void tierBoundariesUseSolvedCountOnly() {
        assertEquals(UserTier.BRONZE,MembershipService.describe(UserTier.BRONZE,49).tier());
        assertEquals(UserTier.SILVER,MembershipService.describe(UserTier.BRONZE,50).tier());
        assertEquals(UserTier.SILVER,MembershipService.describe(UserTier.BRONZE,149).tier());
        assertEquals(UserTier.GOLD,MembershipService.describe(UserTier.BRONZE,150).tier());
        assertEquals(UserTier.GOLD,MembershipService.describe(UserTier.BRONZE,299).tier());
        assertEquals(UserTier.DIAMOND,MembershipService.describe(UserTier.BRONZE,300).tier());
        assertEquals(UserTier.DIAMOND,MembershipService.describe(UserTier.GOLD,999).tier());
        assertEquals(UserTier.RUBY,MembershipService.describe(UserTier.GOLD,1000).tier());
        assertEquals(UserTier.BRONZE,MembershipService.describe(UserTier.GOLD,0).tier());
        assertEquals(UserTier.SILVER,MembershipService.describe(UserTier.GOLD,149).tier());
        assertEquals(UserTier.GOLD,MembershipService.describe(UserTier.GOLD,150).tier());
        // 저장된 값은 그대로 읽는다(데이터 보존). 계산에만 쓰지 않는다
        assertEquals(UserTier.GOLD,MembershipService.baseTier(User.builder().build()));
        // 시험 · 결제로 얻은 최소 등급(floor)은 계속 지킨다: 14 = 금 쿠키 Ⅰ
        assertEquals(UserTier.GOLD,MembershipService.describe(UserTier.BRONZE,0,14).tier());
    }
    @Test void accountTierCountsUniqueQuestionsNotAttempts() throws Exception {
        var registered=register("tier-boundary");
        assertEquals("BRONZE",registered.path("membership").path("tier").asText());
        User user=users.findByNickname("tier-boundary").orElseThrow();
        for(int count:new int[]{49,50,149,150,299,300,999,1000}) {
            save(user,count);
            var current=membership.membership(user);
            assertEquals(count,current.solvedCount());
            assertEquals(count>=1000?UserTier.RUBY:count>=300?UserTier.DIAMOND:count>=150?UserTier.GOLD:count>=50?UserTier.SILVER:UserTier.BRONZE,current.tier());
        }
        mvc.perform(get("/api/v1/auth/me").header("Authorization","Bearer "+registered.path("token").asText()))
                .andExpect(jsonPath("$.membership.tier").value("RUBY"));
    }
    @Test void theoryPdfIsUnavailableForGuestsAndEveryTier() throws Exception {
        String[] files = {"ipe-written-summary.pdf", "ipe-written-review.pdf", "ipe-silgi-theory.pdf",
                "sqld-concepts.pdf", "bigdata-analyst-summary.pdf", "adsp-summary.pdf"};
        for (String file : files) {
            mvc.perform(get("/api/v1/theory/notes/" + file))
                    .andExpect(status().isGone()).andExpect(header().string("Cache-Control", "no-store"))
                    .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.code").value("THEORY_NOTES_UNAVAILABLE"));
            assertFalse(new org.springframework.core.io.ClassPathResource("private-notes/" + file).exists());
        }
        for (UserTier tier : UserTier.values()) {
            String visitor = "theory-" + tier.name();
            grants.saveAndFlush(new VisitorTierGrant(visitor, tier));
            mvc.perform(get("/api/v1/theory/notes/sqld-concepts.pdf").header("X-Visitor-Id", visitor))
                    .andExpect(status().isGone());
        }
        mvc.perform(get("/api/v1/theory/notes/not-allowed.pdf"))
                .andExpect(status().isNotFound());
    }
    @Test void renamePreservesTokenTierAndRecordsAndRejectsDuplicate() throws Exception {
        var a=register("rename-first");register("rename-second");
        User user=users.findByNickname("rename-first").orElseThrow();save(user,300);
        String token="Bearer "+a.path("token").asText();
        mvc.perform(put("/api/v1/auth/nickname").header("Authorization",token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"renamed-first\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nickname").value("renamed-first"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization",token))
                .andExpect(jsonPath("$.id").value(user.getId())).andExpect(jsonPath("$.membership.tier").value("DIAMOND"))
                .andExpect(jsonPath("$.membership.nickname").value("renamed-first"))
                .andExpect(jsonPath("$.membership.solvedCount").value(300));
        mvc.perform(put("/api/v1/auth/nickname").header("Authorization",token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"RENAME-SECOND\"}"))
                .andExpect(status().isConflict());
    }
    @Test void guestCannotUseAccountNicknameAndAccountCannotTakeGuestNickname() throws Exception {
        register("unique-account");
        mvc.perform(put("/api/v1/profile").contentType(MediaType.APPLICATION_JSON)
                .content("{\"visitorId\":\"guest-unique-a\",\"nickname\":\"Unique-Account\"}"))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/v1/profile").contentType(MediaType.APPLICATION_JSON)
                .content("{\"visitorId\":\"guest-unique-a\",\"nickname\":\"guest-name\"}"))
                .andExpect(status().isOk());
        mvc.perform(put("/api/v1/profile").contentType(MediaType.APPLICATION_JSON)
                .content("{\"visitorId\":\"guest-unique-b\",\"nickname\":\"GUEST-NAME\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"guest-name\",\"password\":\"password\"}"))
                .andExpect(status().isConflict());
    }
    @Autowired com.csstudy.backend.service.CohortService cohorts;
    @Autowired CohortMembershipRepository cohortRows;

    @Test void progressiveDivisionBoundariesAndNextTargets() {
        for (UserTier tier : UserTier.values()) {
            long[] goals = tier.thresholds();
            long previousGap = 0;
            for (int i = 0; i < goals.length; i++) {
                var current = MembershipService.describe(tier, goals[i]);
                assertEquals(tier, current.tier());
                assertEquals(5 - i, current.division());
                assertEquals(goals[i], current.currentThreshold());
                if (i > 0) {
                    assertEquals(6 - i, MembershipService.describe(tier, goals[i] - 1).division());
                    assertTrue(goals[i] - goals[i-1] >= previousGap);
                    previousGap = goals[i] - goals[i-1];
                }
                if (i < 4) {
                    assertEquals(tier, current.nextTier());
                    assertEquals(4 - i, current.nextDivision());
                    assertEquals(goals[i+1], current.nextThreshold());
                    assertEquals(goals[i+1] - goals[i], current.remaining());
                }
            }
        }
        var silver = MembershipService.describe(UserTier.BRONZE, 125);
        assertEquals("은 쿠키 Ⅰ", silver.tierName());
        assertEquals("금 쿠키 Ⅴ", silver.nextTierName());
        assertEquals(150, silver.nextThreshold());
        assertEquals(25, silver.remaining());
        var gold = MembershipService.describe(UserTier.BRONZE, 210);
        assertEquals("금 쿠키 Ⅲ", gold.tierName());
        assertEquals(230, gold.nextThreshold());
        assertEquals(300, MembershipService.describe(UserTier.BRONZE, 299).nextThreshold());
        assertEquals("다이아 쿠키 Ⅴ", MembershipService.describe(UserTier.BRONZE, 299).nextTierName());
        var top = MembershipService.describe(UserTier.GOLD, 2300);
        assertNull(top.nextTier()); assertNull(top.nextDivision()); assertNull(top.nextThreshold());
        assertEquals(0, top.remaining());
        assertEquals(0, MembershipService.describe(UserTier.BRONZE, -1).solvedCount());
    }

    @Test void goldDivisionsStartAt150Solved() {
        long[] totals = {150, 169, 170, 199, 200, 229, 230, 259, 260, 299};
        int[] divisions = {5, 5, 4, 4, 3, 3, 2, 2, 1, 1};
        for (int i = 0; i < totals.length; i++) {
            var tier = MembershipService.describe(UserTier.BRONZE, totals[i]);
            assertEquals(UserTier.GOLD, tier.tier());
            assertEquals(divisions[i], tier.division(), "lifetime total=" + totals[i]);
        }
        var fresh = MembershipService.describe(UserTier.BRONZE, 150);
        assertEquals(170, fresh.nextThreshold()); assertEquals(20, fresh.remaining());
        assertEquals(UserTier.DIAMOND, MembershipService.describe(UserTier.BRONZE, 300).tier());
        assertEquals(1, MembershipService.describe(UserTier.BRONZE, 0, 14).division());
    }

    @Test void cohortBadgePersistsAndOnlyOwnPersonalEndpointRevealsIt() throws Exception {
        var owner = register("badge-owner"); var other = register("badge-other");
        var user = users.findByNickname("badge-owner").orElseThrow();
        cohorts.captureUser(user.getId()); cohorts.captureUser(user.getId());
        cohortRows.flush();
        var stored = cohortRows.findById("user:" + user.getId()).orElseThrow();
        assertEquals("SSAFY", stored.getProgram()); assertEquals(16, stored.getGeneration());
        assertEquals("대전", stored.getCampus()); assertEquals(4, stored.getClassNumber());
        assertNotNull(stored.getCapturedAt());
        String token = "Bearer " + owner.path("token").asText();
        mvc.perform(get("/api/v1/profile/badges").header("Authorization", token))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].name").value("16기 대전 4반"))
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/v1/profile/badges").param("userId", user.getId().toString())
                .header("Authorization", "Bearer " + other.path("token").asText()))
                .andExpect(content().json("[]"));
        mvc.perform(get("/api/v1/profile/badges").header("Authorization", "Bearer invalid"))
                .andExpect(status().isUnauthorized());
        for (String endpoint : new String[]{"/api/v1/membership", "/api/v1/auth/me", "/api/v1/rank/solved"}) {
            String response = mvc.perform(get(endpoint).header("Authorization", token)).andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            assertFalse(response.contains("대전")); assertFalse(response.contains("classNumber"));
            assertFalse(response.contains("capturedAt"));
        }
        save(user, 1000);
        mvc.perform(put("/api/v1/auth/nickname").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nickname\":\"badge-renamed\"}" )).andExpect(status().isOk());
        mvc.perform(get("/api/v1/profile/badges").header("Authorization", token))
                .andExpect(jsonPath("$[0].name").value("16기 대전 4반"));
        assertTrue(cohortRows.findByUserId(users.findByNickname("badge-other").orElseThrow().getId()).isEmpty());
    }

    @Test void anonymousBadgeTransfersOnRegistrationWithoutExposingItToAnotherAccount() throws Exception {
        String id = "cohort-guest";
        cohorts.captureVisitor(id, null); cohortRows.flush();
        mvc.perform(get("/api/v1/profile/badges").header("X-Visitor-Id", id))
                .andExpect(jsonPath("$[0].name").value("16기 대전 4반"));
        mvc.perform(get("/api/v1/profile/badges").header("X-Visitor-Id", "other-guest"))
                .andExpect(content().json("[]"));
        var registration = json.readTree(mvc.perform(post("/api/v1/auth/register").header("X-Visitor-Id", id)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"cohort-registered\",\"password\":\"test-password\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(get("/api/v1/profile/badges").header("Authorization", "Bearer " + registration.path("token").asText()))
                .andExpect(jsonPath("$[0].name").value("16기 대전 4반"));
        mvc.perform(get("/api/v1/profile/badges").header("X-Visitor-Id", id)).andExpect(content().json("[]"));
        cohorts.attachVisitorAccount(id, -1L);
        assertNotEquals(-1L, cohortRows.findById("visitor:" + id).orElseThrow().getUserId());
    }

}
