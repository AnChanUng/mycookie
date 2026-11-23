package com.csstudy.backend.service;

import com.csstudy.backend.entity.TierAward;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.repository.TierAwardRepository;
import com.csstudy.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

// 관리자 페이지 "등급 조정". 계정의 최소 등급(tier_awards: 승급 시험 · 구매로 생기는 "이 아래로 안 내려가는 등급")을
// 원하는 등급으로 덮어쓰거나 지운다. 올리는 것뿐 아니라 내리는 것도 된다.
//   - 등급을 고르면: 최소 등급을 그 등급 · 단계로 바꾸고, 계정의 기본 등급(base_tier)은 동 쿠키로 둔다
//   - "문제 수대로": 최소 등급을 지우고 기본 등급을 동 쿠키로 둔다(푼 문제 수로만 계산)
// 최소 등급이라서, 푼 문제 수가 더 높은 등급에 해당하면 그 등급으로 보인다
@Service
@RequiredArgsConstructor
public class TierAdjustService {

    private final UserRepository users;
    private final TierAwardRepository awards;
    private final MembershipService membership;
    private final org.springframework.context.ApplicationEventPublisher events;

    public static int level(UserTier tier, int division) { return tier.ordinal() * 5 + (5 - division); }

    @Transactional(readOnly = true)
    public Map<String, Object> lookup(String nickname) {
        User user = find(nickname);
        return describe(user);
    }

    /** tier가 "AUTO"면 최소 등급을 지운다. 돌려주는 값의 before는 바꾸기 전 상태(작업 기록용) */
    @Transactional
    public Map<String, Object> adjust(String nickname, String tierName, Integer division) {
        User user = find(nickname);
        Map<String, Object> before = describe(user);
        String key = "user:" + user.getId();
        String choice = tierName == null ? "" : tierName.trim().toUpperCase(Locale.ROOT);
        if (choice.equals("AUTO")) {
            awards.findForUpdate(key).ifPresent(awards::delete);
        } else {
            UserTier tier;
            try { tier = UserTier.valueOf(choice); }
            catch (IllegalArgumentException e) { throw new CookieException(CookieErrorCode.INVALID_REQUEST, "등급은 BRONZE, SILVER, GOLD, DIAMOND, RUBY 또는 AUTO예요."); }
            int d = division == null ? 5 : division;
            if (d < 1 || d > 5) throw new CookieException(CookieErrorCode.INVALID_REQUEST, "단계는 1(Ⅰ)~5(Ⅴ)예요.");
            TierAward award = awards.findForUpdate(key).orElseGet(() -> new TierAward(key, -1));
            award.setTierLevel(level(tier, d));
            awards.save(award);
        }
        user.setBaseTier(UserTier.BRONZE);
        users.saveAndFlush(user);
        awards.flush();
        // 순위 화면이 들고 있는 등급을 새로 계산하게 알린다
        events.publishEvent(new NicknameService.Changed(user.getId()));
        Map<String, Object> out = describe(user);
        out.put("before", before);
        return out;
    }

    private Map<String, Object> describe(User user) {
        var m = membership.membership(user);
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("nickname", user.getNickname());
        row.put("solvedCount", m.solvedCount());
        row.put("tier", m.tier());
        row.put("division", m.division());
        row.put("tierName", m.tierName());
        row.put("baseTier", user.getBaseTier());
        int floor = awards.findById("user:" + user.getId()).map(TierAward::getTierLevel).orElse(-1);
        row.put("floor", floor < 0 ? null : UserTier.values()[Math.min(24, floor) / 5].displayName(5 - Math.min(24, floor) % 5));
        return row;
    }

    private User find(String nickname) {
        String name = nickname == null ? "" : nickname.trim();
        if (name.isEmpty()) throw new CookieException(CookieErrorCode.INVALID_REQUEST, "닉네임을 입력해 주세요.");
        return users.findByNickname(name).orElseThrow(() -> new CookieException(CookieErrorCode.NOT_FOUND, "그 닉네임의 계정이 없어요."));
    }
}
