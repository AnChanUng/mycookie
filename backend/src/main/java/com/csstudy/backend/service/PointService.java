package com.csstudy.backend.service;

import com.csstudy.backend.entity.PointAccount;
import com.csstudy.backend.entity.PointHistory;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserItem;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.repository.PointAccountRepository;
import com.csstudy.backend.repository.PointHistoryRepository;
import com.csstudy.backend.repository.UserItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

// 포인트: 출석 · 문제 풀이 · 승급으로 모으고, 상점에서 꾸미기 아이템을 산다.
// 지급은 "어디까지 줬는지"(PointAccount)를 기준으로 늘어난 만큼만 준다. 그래서 이미 많이 풀었거나 승급한 계정은
// 처음 포인트를 열어 볼 때 지금까지의 풀이 · 승급 몫을 한 번에 받는다
@Service
@RequiredArgsConstructor
public class PointService {

    static final ZoneId KST = ZoneId.of("Asia/Seoul");

    // 지급 기준(화면 PointShopPage의 안내와 같은 값)
    public static final long SOLVED_POINT = 1;          // 새로 푼 문제 1개
    public static final long ATTEND_POINT = 10;         // 하루 출석
    public static final long STREAK_BONUS = 50;         // 7일 연속 출석마다
    public static final int STREAK_DAYS = 7;
    // 등급 단계(Ⅴ→Ⅰ) 하나 오를 때, 그리고 새 등급(Ⅴ)에 들어설 때 더 주는 몫. 순서는 동 · 은 · 금 · 다이아 · 루비
    public static final long[] STEP_POINT = {10, 30, 60, 100, 200};
    public static final long[] TIER_BONUS = {0, 100, 200, 400, 800};

    // 상점 품목과 가격. 화면(data/profileOptions.js)과 같은 목록이다
    public static final Map<String, Long> SHOP;
    static {
        Map<String, Long> m = new LinkedHashMap<>();
        for (String a : List.of("🦄", "🐲", "👑", "🍩", "🧠", "💎")) m.put("avatar:" + a, 300L);
        m.put("theme:sakura", 800L);
        m.put("theme:ocean", 800L);
        m.put("theme:forest", 800L);
        m.put("theme:grape", 1200L);
        m.put("theme:ink", 1200L);
        m.put("frame:flame", 1800L);
        m.put("frame:rainbow", 2500L);
        SHOP = Collections.unmodifiableMap(m);
    }

    public record Item(String key, long price) {}
    public record Entry(long amount, String reason, String memo, Instant at) {}
    public record Summary(long balance, int streak, boolean attendedToday, List<String> owned,
                          List<Entry> history, List<Item> shop) {}
    public record Attend(long earned, int streak, long balance) {}

    private final PointAccountRepository accounts;
    private final PointHistoryRepository history;
    private final UserItemRepository items;
    private final MembershipService memberships;

    // 등급 단계 0(동 쿠키 Ⅴ) ~ 24(루비 쿠키 Ⅰ)
    static int level(MembershipService.Membership m) { return m.tier().ordinal() * 5 + 5 - m.division(); }

    // 단계 하나에 주는 포인트(단계 1부터). 새 등급의 Ⅴ에 올라서면 등급 보너스를 더한다
    public static long levelReward(int level) {
        if (level <= 0 || level > 24) return 0;
        int tier = level / 5;
        return STEP_POINT[tier] + (level % 5 == 0 ? TIER_BONUS[tier] : 0);
    }

    static LocalDate today() { return LocalDate.now(KST); }

    @Transactional
    public Summary summary(User user) {
        return view(user.getId(), settle(user));
    }

    @Transactional
    public Attend attend(User user) {
        PointAccount account = settle(user);
        LocalDate today = today();
        if (today.equals(account.getLastAttendDate())) throw new CookieException(CookieErrorCode.POINT_ALREADY_ATTENDED);
        int streak = today.minusDays(1).equals(account.getLastAttendDate()) ? account.getAttendStreak() + 1 : 1;
        long earned = ATTEND_POINT;
        String memo = "출석 " + streak + "일째";
        if (streak % STREAK_DAYS == 0) { earned += STREAK_BONUS; memo += " · 연속 출석 보너스"; }
        account.setLastAttendDate(today);
        account.setAttendStreak(streak);
        credit(account, earned, PointHistory.Reason.ATTEND, memo);
        return new Attend(earned, streak, account.getBalance());
    }

    @Transactional
    public Summary buy(User user, String itemKey) {
        Long price = itemKey == null ? null : SHOP.get(itemKey);
        if (price == null) throw new CookieException(CookieErrorCode.POINT_ITEM_UNKNOWN);
        PointAccount account = settle(user);
        if (items.existsByUserIdAndItemKey(user.getId(), itemKey)) throw new CookieException(CookieErrorCode.POINT_ITEM_OWNED);
        if (account.getBalance() < price) throw new CookieException(CookieErrorCode.POINT_NOT_ENOUGH);
        items.save(UserItem.builder().userId(user.getId()).itemKey(itemKey).price(price).createdAt(Instant.now()).build());
        credit(account, -price, PointHistory.Reason.PURCHASE, "상점 구매");
        return view(user.getId(), account);
    }

    @Transactional(readOnly = true)
    public Set<String> owned(Long userId) {
        Set<String> out = new TreeSet<>();
        items.findByUserId(userId).forEach(i -> out.add(i.getItemKey()));
        return out;
    }

    // 계정 줄을 잠그고, 지난번 지급 뒤로 늘어난 풀이 수와 등급 단계만큼 포인트를 준다. 풀이 수가 줄어도 이미 준 포인트는 그대로 둔다
    PointAccount settle(User user) {
        PointAccount account = lock(user.getId());
        MembershipService.Membership m = memberships.membership(user);
        long solved = m.solvedCount();
        if (solved > account.getSolvedCredited()) {
            long gained = solved - account.getSolvedCredited();
            account.setSolvedCredited(solved);
            credit(account, gained * SOLVED_POINT, PointHistory.Reason.SOLVED, "문제 풀이 " + gained + "개");
        }
        int level = level(m);
        if (level > account.getLevelCredited()) {
            long sum = 0;
            for (int l = account.getLevelCredited() + 1; l <= level; l++) sum += levelReward(l);
            account.setLevelCredited(level);
            credit(account, sum, PointHistory.Reason.TIER_UP, "승급 · " + (m.tierName() == null ? m.tier().label() : m.tierName()));
        }
        return account;
    }

    private PointAccount lock(Long userId) {
        Optional<PointAccount> found = accounts.findForUpdate(userId);
        if (found.isPresent()) return found.get();
        try {
            PointAccount created = new PointAccount();
            created.setUserId(userId);
            created.setUpdatedAt(Instant.now());
            accounts.saveAndFlush(created);
        } catch (DataIntegrityViolationException raced) { /* 다른 요청이 먼저 만들었다. 아래에서 그 줄을 잠그고 쓴다 */ }
        return accounts.findForUpdate(userId).orElseThrow(() -> new CookieException(CookieErrorCode.CONFLICT));
    }

    private void credit(PointAccount account, long amount, PointHistory.Reason reason, String memo) {
        if (amount == 0) return;
        account.setBalance(account.getBalance() + amount);
        account.setUpdatedAt(Instant.now());
        accounts.save(account);
        history.save(PointHistory.builder().userId(account.getUserId()).amount(amount).reason(reason).memo(memo).createdAt(Instant.now()).build());
    }

    private Summary view(Long userId, PointAccount account) {
        List<Entry> recent = history.findTop30ByUserIdOrderByIdDesc(userId).stream()
                .map(h -> new Entry(h.getAmount(), h.getReason().name(), h.getMemo(), h.getCreatedAt())).toList();
        List<Item> shop = SHOP.entrySet().stream().map(e -> new Item(e.getKey(), e.getValue())).toList();
        return new Summary(account.getBalance(), account.getAttendStreak(), today().equals(account.getLastAttendDate()),
                List.copyOf(owned(userId)), recent, shop);
    }
}
