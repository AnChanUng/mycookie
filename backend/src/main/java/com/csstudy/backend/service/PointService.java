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
    // 오늘의 퀘스트: 오늘 새로 푼 문제 수가 기준에 닿으면 자동으로 준다(문제 수, 포인트)
    public static final long[][] QUESTS = {{5, 20}, {15, 40}, {30, 80}};
    // 풀이 수는 브라우저가 알려 주는 값이라 서버가 하나하나 확인할 수 없다. 그래서 하루에 포인트로 인정하는 새 풀이 수를 정해 두고,
    // 넘는 몫은 버리지 않고 다음 날로 넘긴다(예전 기록이 많은 계정도 며칠에 걸쳐 모두 받는다). 승급 보상과 퀘스트도 인정한 풀이 수를 넘지 않는다
    public static final long DAILY_SOLVED_CAP = 100;

    // 상점 품목과 가격. 화면(data/profileOptions.js)과 같은 목록이다
    public static final Map<String, Long> SHOP;
    static {
        Map<String, Long> m = new LinkedHashMap<>();
        for (String a : List.of("🦄", "🐲", "👑", "🍩", "🧠", "💎", "🎀", "🌸", "🦋", "🍓", "🧸", "🐹")) m.put("avatar:" + a, 300L);
        m.put("avatar:🌷", 10L); // 처음 모은 포인트로 바로 살 수 있는 맛보기 아이템
        m.put("theme:sakura", 800L);
        m.put("theme:ocean", 800L);
        m.put("theme:forest", 800L);
        m.put("theme:grape", 1200L);
        m.put("theme:ink", 1200L);
        m.put("theme:peach", 800L);
        m.put("theme:lavender", 800L);
        m.put("theme:rose", 1200L);
        m.put("frame:flame", 1800L);
        m.put("frame:rainbow", 2500L);
        m.put("frame:pastel", 1800L);
        m.put("frame:ribbon", 2000L);
        m.put("frame:heart", 2500L);
        SHOP = Collections.unmodifiableMap(m);
    }

    public record Item(String key, long price) {}
    public record Entry(long amount, String reason, String memo, Instant at) {}
    public record Quest(long count, long point, boolean done) {}
    // pendingSolved: 하루 인정 수를 넘어 다음 날로 넘어간 풀이 수. dailySolvedCap: 하루에 포인트로 인정하는 새 풀이 수
    public record Summary(long balance, int streak, boolean attendedToday, List<String> owned,
                          List<Entry> history, List<Item> shop, long todaySolved, List<Quest> quests,
                          long pendingSolved, long dailySolvedCap) {}
    // 정산 결과. 오늘 퀘스트에 센 풀이 수와 다음 날로 넘어간 풀이 수를 화면에 함께 보여 준다
    record Settled(PointAccount account, long todaySolved, long pendingSolved) {}
    // earned가 0이면 오늘 이미 출석한 것이다(화면이 접속할 때마다 불러도 하루 한 번만 준다)
    public record Attend(long earned, int streak, long balance, boolean already) {}

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
        PointAccount account = settle(user).account();
        LocalDate today = today();
        if (today.equals(account.getLastAttendDate())) return new Attend(0, account.getAttendStreak(), account.getBalance(), true);
        int streak = today.minusDays(1).equals(account.getLastAttendDate()) ? account.getAttendStreak() + 1 : 1;
        long earned = ATTEND_POINT;
        String memo = "출석 " + streak + "일째";
        if (streak % STREAK_DAYS == 0) { earned += STREAK_BONUS; memo += " · 연속 출석 보너스"; }
        account.setLastAttendDate(today);
        account.setAttendStreak(streak);
        credit(account, earned, PointHistory.Reason.ATTEND, memo);
        return new Attend(earned, streak, account.getBalance(), false);
    }

    @Transactional
    public Summary buy(User user, String itemKey) {
        Long price = itemKey == null ? null : SHOP.get(itemKey);
        if (price == null) throw new CookieException(CookieErrorCode.POINT_ITEM_UNKNOWN);
        Settled settled = settle(user);
        PointAccount account = settled.account();
        if (items.existsByUserIdAndItemKey(user.getId(), itemKey)) throw new CookieException(CookieErrorCode.POINT_ITEM_OWNED);
        if (account.getBalance() < price) throw new CookieException(CookieErrorCode.POINT_NOT_ENOUGH);
        items.save(UserItem.builder().userId(user.getId()).itemKey(itemKey).price(price).createdAt(Instant.now()).build());
        credit(account, -price, PointHistory.Reason.PURCHASE, "상점 구매");
        return view(user.getId(), settled);
    }

    // 문제 풀이 수가 새로 들어왔을 때(순위 기록) 바로 풀이 · 승급 · 퀘스트 포인트를 정산한다. 부른 쪽 트랜잭션에 같이 묶인다
    @Transactional
    public void refresh(User user) { settle(user); }

    @Transactional(readOnly = true)
    public Set<String> owned(Long userId) {
        Set<String> out = new TreeSet<>();
        items.findByUserId(userId).forEach(i -> out.add(i.getItemKey()));
        return out;
    }

    // 계정 줄을 잠그고, 지난번 지급 뒤로 늘어난 풀이 수와 등급 단계만큼 포인트를 준다. 풀이 수가 줄어도 이미 준 포인트는 그대로 둔다.
    // 새 풀이는 하루 DAILY_SOLVED_CAP개까지만 인정하고 나머지는 다음 날 이어서 준다
    Settled settle(User user) {
        PointAccount account = lock(user.getId());
        MembershipService.Membership m = memberships.membership(user);
        long solved = m.solvedCount();
        // 날짜가 바뀐 뒤 처음 정산할 때 오늘의 출발점을 지금 풀이 수로 잡는다. 그래서 지난 풀이나 소급 지급은 퀘스트에 들어가지 않는다
        LocalDate today = today();
        if (!today.equals(account.getQuestDate())) {
            account.setQuestDate(today);
            account.setQuestBase(solved);
            account.setQuestClaimed(0);
            account.setCreditedBase(account.getSolvedCredited());
        }
        if (account.getCreditedBase() == null) account.setCreditedBase(account.getSolvedCredited());
        long room = Math.max(0, DAILY_SOLVED_CAP - (account.getSolvedCredited() - account.getCreditedBase()));
        if (solved > account.getSolvedCredited() && room > 0) {
            long gained = Math.min(solved - account.getSolvedCredited(), room);
            account.setSolvedCredited(account.getSolvedCredited() + gained);
            credit(account, gained * SOLVED_POINT, PointHistory.Reason.SOLVED, "문제 풀이 " + gained + "개");
        }
        int level = creditedLevel(user, m, account.getSolvedCredited());
        if (level > account.getLevelCredited()) {
            long sum = 0;
            for (int l = account.getLevelCredited() + 1; l <= level; l++) sum += levelReward(l);
            account.setLevelCredited(level);
            credit(account, sum, PointHistory.Reason.TIER_UP, "승급 · " + (m.tierName() == null ? m.tier().label() : m.tierName()));
        }
        // 퀘스트는 오늘 새로 푼 문제로 세되, 오늘 포인트로 인정한 풀이 수를 넘지 않는다
        long todaySolved = Math.min(todaySolved(account, solved), account.getSolvedCredited() - account.getCreditedBase());
        int claimed = account.getQuestClaimed() == null ? 0 : account.getQuestClaimed();
        for (int i = 0; i < QUESTS.length; i++) {
            if (todaySolved < QUESTS[i][0] || (claimed & (1 << i)) != 0) continue;
            claimed |= 1 << i;
            account.setQuestClaimed(claimed);
            credit(account, QUESTS[i][1], PointHistory.Reason.QUEST, "오늘의 퀘스트 · " + QUESTS[i][0] + "문제 풀기");
        }
        return new Settled(account, todaySolved, Math.max(0, solved - account.getSolvedCredited()));
    }

    // 승급 보상을 줄 등급 단계. 풀이 수로 오른 등급은 포인트로 인정한 풀이 수까지만 보고, 승급 시험(서버 채점)으로 얻은 등급은 그대로 인정한다
    private int creditedLevel(User user, MembershipService.Membership m, long credited) {
        if (m.solvedCount() <= credited || NicknameService.testTier(user.getNickname()) != null) return level(m);
        return level(memberships.describe(MembershipService.baseTier(user), credited, "user:" + user.getId()));
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

    static long todaySolved(PointAccount account, long solved) {
        return Math.max(0, solved - (account.getQuestBase() == null ? solved : account.getQuestBase()));
    }

    private Summary view(Long userId, Settled settled) {
        PointAccount account = settled.account();
        List<Entry> recent = history.findTop30ByUserIdOrderByIdDesc(userId).stream()
                .map(h -> new Entry(h.getAmount(), h.getReason().name(), h.getMemo(), h.getCreatedAt())).toList();
        List<Item> shop = SHOP.entrySet().stream().map(e -> new Item(e.getKey(), e.getValue())).toList();
        int claimed = account.getQuestClaimed() == null ? 0 : account.getQuestClaimed();
        List<Quest> quests = new ArrayList<>();
        for (int i = 0; i < QUESTS.length; i++) quests.add(new Quest(QUESTS[i][0], QUESTS[i][1], (claimed & (1 << i)) != 0));
        return new Summary(account.getBalance(), account.getAttendStreak(), today().equals(account.getLastAttendDate()),
                List.copyOf(owned(userId)), recent, shop, settled.todaySolved(), quests, settled.pendingSolved(), DAILY_SOLVED_CAP);
    }
}
