package com.csstudy.backend;

import com.csstudy.backend.entity.*;
import com.csstudy.backend.repository.*;
import com.csstudy.backend.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test") @Transactional
class ExistingUsersGoldRolloutTest {
    @Autowired ExistingUsersGoldRolloutService service;
    @Autowired MembershipRolloutRepository rollout;
    @Autowired UserRepository users;
    @Autowired VisitorTierGrantRepository grants;
    @Autowired VisitorSolvedRepository solved;
    @Autowired UsageEventRepository usage;
    @Autowired QuestionReportRepository reports;
    @Autowired DonationRepository donations;
    @Autowired TierAwardRepository awards;
    @Autowired CohortMembershipRepository cohorts;
    @Autowired CohortService cohortService;
    @Autowired MembershipService membership;
    @Autowired MockMvc mvc;

    private User user(String name,UserTier tier) {
        return users.saveAndFlush(User.builder().nickname(name).password("fixture-only").baseTier(tier).build());
    }
    private void visit(String id) {
        usage.saveAndFlush(UsageEvent.builder().visitorId(id).type("view").path("/")
                .day(LocalDate.now(ZoneId.of("Asia/Seoul"))).createdAt(Instant.now()).build());
    }
    @Test void enrollsVisitOnlyGuestsAndAllExistingAccountsPreservingGoldHigherTiersAndBadges() throws Exception {
        rollout.deleteById(ExistingUsersGoldRolloutService.ROLLOUT_ID);
        User bronze=user("rollout-bronze",UserTier.BRONZE),silver=user("rollout-silver",UserTier.SILVER);
        User gold=user("rollout-gold",UserTier.GOLD),diamond=user("rollout-diamond",UserTier.DIAMOND);
        cohortService.captureUser(gold.getId());cohorts.flush();
        Instant captured=cohorts.findById("user:"+gold.getId()).orElseThrow().getCapturedAt();
        visit("visit-only-no-nickname");
        reports.saveAndFlush(QuestionReport.builder().visitorId("report-only").path("/").questionId("fixture")
                .kind("typo").day(LocalDate.now()).createdAt(Instant.now()).build());
        donations.saveAndFlush(Donation.builder().visitorId("donation-only").kind("major").label("fixture")
                .filename("fixture.txt").size(1).data(new byte[]{1}).day(LocalDate.now()).createdAt(Instant.now()).build());
        grants.saveAndFlush(new VisitorTierGrant("already-gold",UserTier.GOLD));
        grants.saveAndFlush(new VisitorTierGrant("already-ruby",UserTier.RUBY));
        solved.saveAndFlush(VisitorSolved.builder().visitorId("linked-high-solver").userId(silver.getId())
                .count(1000).updatedAt(Instant.now()).build());
        awards.saveAndFlush(new TierAward("visitor:exam-only",16));
        service.run(null);cohorts.flush();
        assertEquals(UserTier.GOLD,users.findById(bronze.getId()).orElseThrow().getBaseTier());
        assertEquals(UserTier.GOLD,users.findById(silver.getId()).orElseThrow().getBaseTier());
        assertEquals(UserTier.GOLD,users.findById(gold.getId()).orElseThrow().getBaseTier());
        assertEquals(UserTier.DIAMOND,users.findById(diamond.getId()).orElseThrow().getBaseTier());
        assertEquals(UserTier.RUBY,membership.membership(silver).tier());
        assertEquals(UserTier.RUBY,grants.findById("already-ruby").orElseThrow().getTier());
        assertEquals(UserTier.GOLD,grants.findById("visit-only-no-nickname").orElseThrow().getTier());
        assertEquals(UserTier.GOLD,grants.findById("exam-only").orElseThrow().getTier());
        assertEquals(UserTier.GOLD,grants.findById("report-only").orElseThrow().getTier());
        assertEquals(UserTier.GOLD,grants.findById("donation-only").orElseThrow().getTier());
        assertEquals(16,awards.findById("visitor:exam-only").orElseThrow().getTierLevel());
        assertEquals(captured,cohorts.findById("user:"+gold.getId()).orElseThrow().getCapturedAt());
        for(User user:List.of(bronze,silver,gold,diamond)) {
            var badge=cohorts.findById("user:"+user.getId()).orElseThrow();
            assertEquals("SSAFY",badge.getProgram());assertEquals(16,badge.getGeneration());
            assertEquals("대전",badge.getCampus());assertEquals(4,badge.getClassNumber());
        }
        assertEquals(silver.getId(),cohorts.findById("visitor:linked-high-solver").orElseThrow().getUserId());
        // 저장된 금 쿠키 기록은 남지만, 등급은 푼 문제 수로 정한다(0문제 → 동 쿠키)
        mvc.perform(get("/api/v1/membership").header("X-Visitor-Id","visit-only-no-nickname"))
                .andExpect(jsonPath("$.tier").value("BRONZE")).andExpect(jsonPath("$.campus").doesNotExist());
        mvc.perform(get("/api/v1/profile/badges").header("X-Visitor-Id","visit-only-no-nickname"))
                .andExpect(jsonPath("$[0].name").value("16기 대전 4반"));
        mvc.perform(get("/api/v1/profile/badges").header("X-Visitor-Id","unrelated-guest"))
                .andExpect(content().json("[]"));
        long cohortCount=cohorts.count();
        User future=user("future-after-snapshot",UserTier.BRONZE);visit("future-guest");
        service.run(null);
        assertEquals(UserTier.BRONZE,users.findById(future.getId()).orElseThrow().getBaseTier());
        assertFalse(grants.existsById("future-guest"));assertEquals(cohortCount,cohorts.count());
    }
}
