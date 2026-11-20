package com.csstudy.backend.service;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.repository.ExamProgressRepository;
import com.csstudy.backend.repository.VisitorSolvedRepository;
import com.csstudy.backend.repository.VisitorTierGrantRepository;
import com.csstudy.backend.repository.UsageEventRepository;
import com.csstudy.backend.repository.VisitorProfileRepository;
import jakarta.servlet.http.HttpServletRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MembershipService {
    private final ExamProgressRepository progressRepository;
    private final VisitorSolvedRepository solvedRepository;
    private final ObjectMapper json;
    private final VisitorTierGrantRepository grants;
    private final UsageEventRepository usage;
    private final AuthService auth;
    private final VisitorProfileRepository profiles;
    private final com.csstudy.backend.repository.TierAwardRepository awards;

    public record Membership(UserTier tier, String tierName, long solvedCount,
                             UserTier nextTier, Long nextThreshold, long remaining, String nickname,
                             int division, Integer nextDivision, String nextTierName, long currentThreshold) {
        public Membership withNickname(String name) {
            return new Membership(tier, tierName, solvedCount, nextTier, nextThreshold, remaining, name, division, nextDivision, nextTierName, currentThreshold);
        }
    }

    public Membership current(HttpServletRequest request) {
        var user = auth.currentUser(request);
        if (user.isPresent()) return membership(user.get());
        return visitor(request.getHeader("X-Visitor-Id"));
    }

    public UserTier visitorBase(String id) {
        if (id == null || id.isBlank() || id.length() > 40) return UserTier.BRONZE;
        return grants.findById(id).map(g -> g.getTier()).orElse(UserTier.BRONZE);
    }

    public Membership visitor(String id) {
        UserTier base = visitorBase(id);
        long count = 0;
        if (id != null && id.length() <= 40) {
            var record = solvedRepository.findByVisitorId(id);
            if (record.isPresent()) count = record.get().getCount();
            else count = usage.solvedCounts().stream().filter(r -> id.equals(r[0])).mapToLong(r -> ((Number)r[2]).longValue()).sum();
        }
        String nickname = id == null || id.isBlank() || id.length() > 40 ? "방문자"
                : profiles.findByVisitorId(id).map(p -> p.getNickname()).orElseGet(() -> VisitorProfileService.anonymous(id));
        return describe(base, count, "visitor:" + id).withNickname(nickname);
    }

    // Existing rows have no base_tier; this preserves GOLD for every pre-existing account.
    // Registration explicitly saves BRONZE, so future restarts cannot turn new users into GOLD.
    public static UserTier baseTier(User user) {
        return user.getBaseTier() == null ? UserTier.GOLD : user.getBaseTier();
    }

    public Membership membership(User user) {
        // 문제집마다 저장해 둔 푼 문제 수를 DB에서 더한다. 값이 없는 예전 행만 JSON을 읽어 계산한다
        long saved = progressRepository.sumSolvedCount(user.getId())
                + progressRepository.findByUserIdAndSolvedCountIsNull(user.getId()).stream().mapToLong(p -> solvedIn(p.getData())).sum();
        // Reuse the existing rank count for historical/coding progress; devices are merged by max, not sum.
        long reported = solvedRepository.findByUserId(user.getId()).stream().mapToLong(v -> v.getCount()).max().orElse(0);
        UserTier fixed = NicknameService.testTier(user.getNickname());
        if (fixed != null) return new Membership(fixed, fixed.displayName(5), Math.max(saved, reported),
                null, null, 0, user.getNickname(), 5, null, null, fixed.thresholds()[0]);
        return describe(baseTier(user), Math.max(saved, reported), "user:" + user.getId()).withNickname(user.getNickname());
    }

    public Membership describe(UserTier base, long solved, String subjectKey) {
        int floor=awards.findById(subjectKey).map(a->a.getTierLevel()).orElse(-1);
        return describe(base, solved, floor);
    }

    public static Membership describe(UserTier base, long solved) { return describe(base, solved, -1); }

    public static Membership describe(UserTier base, long solved, int floor) {
        long count = Math.max(0, solved);
        UserTier tier = UserTier.calculate(base, count);
        int division = tier.division(count);
        int natural=tier.ordinal()*5+5-division;
        if (floor > natural && floor <= 24) {
            tier=UserTier.values()[floor/5]; division=5-floor%5;
        }
        UserTier next;
        Integer nextDivision;
        Long threshold;
        if (division > 1) {
            next = tier;
            nextDivision = division - 1;
            threshold = tier.thresholds()[6 - division];
        } else {
            next = switch (tier) {
                case BRONZE -> UserTier.SILVER;
                case SILVER, GOLD -> UserTier.DIAMOND;
                case DIAMOND -> UserTier.RUBY;
                case RUBY -> null;
            };
            nextDivision = next == null ? null : Integer.valueOf(5);
            threshold = null;
            if (next == UserTier.SILVER) threshold = 50L;
            else if (next == UserTier.DIAMOND) threshold = 300L;
            else if (next == UserTier.RUBY) threshold = 1000L;
        }
        return new Membership(tier, tier.displayName(division), count, next, threshold,
                threshold == null ? 0 : Math.max(0, threshold - count), null, division, nextDivision,
                next == null ? null : next.displayName(nextDivision), tier.thresholds()[5 - division]);
    }

    public Map<Long, Long> savedCounts() {
        Map<Long, Long> counts = new HashMap<>();
        progressRepository.dataByUser().forEach(row -> counts.merge((Long) row[0], solvedIn((String) row[1]), Long::sum));
        return counts;
    }

    // 문제집 기록(JSON)에서 한 번이라도 푼 문제 수
    public long solvedIn(String data) {
        try {
            var stats = json.readTree(data).path("stats");
            if (!stats.isObject()) return 0;
            long count = 0;
            for (var stat : stats) {
                if (stat.path("c").asLong() > 0 || stat.path("w").asLong() > 0) count++;
            }
            return count;
        } catch (Exception error) { return 0; } // Legacy/corrupt records cannot grant an accidental promotion.
    }
}
