package com.csstudy.backend.controller;

import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.service.MembershipService;
import com.csstudy.backend.repository.VisitorTierGrantRepository;
import com.csstudy.backend.entity.VisitorSolved;
import com.csstudy.backend.repository.UsageEventRepository;
import com.csstudy.backend.repository.UserRepository;
import com.csstudy.backend.repository.VisitorSolvedRepository;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.VisitorProfileService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

// 문제를 많이 푼 사람 순위. 같은 문제를 여러 번 풀어도 한 문제로 센다.
// 브라우저가 알려 준 문제 수(visitor_solved)를 쓰고, 아직 알려 주지 않은 방문자는 풀이 완료 기록(usage_events의 exam)으로 어림한다
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RankController {

    private static final int TOP = 5;
    private static final int CACHE_SECONDS = 60;
    // 사이트의 문제를 다 풀어도 넘지 못할 값. 터무니없는 숫자가 순위에 오르지 않게 막는다
    private static final int MAX_SOLVED = 3000;

    // account: 동기화 계정으로 묶인 줄이면 그 계정의 닉네임, 아니면 null
    private record Solver(String visitorId, long count, String account, UserTier baseTier, String subjectKey) {}

    // hiddenSolved · hiddenSolvers: 순위표에서 뺀 관리 계정(admin1~admin5)의 문제 수와 인원. 합계에는 더한다
    private record Board(List<Solver> ranked, Map<String, Integer> rankOf, long hiddenSolved, int hiddenSolvers, Instant at) {}

    // 순위표에 올리지 않는 관리 계정. 이들이 푼 문제 수는 전체 합계에만 들어간다
    private static final Set<String> RANK_HIDDEN = Set.of("admin1", "admin2", "admin3", "admin4", "admin5");

    static boolean hiddenFromRank(String nickname) {
        return nickname != null && RANK_HIDDEN.contains(com.csstudy.backend.service.NicknameService.key(nickname).replace(" ", ""));
    }

    private final UsageEventRepository usageEventRepository;
    private final VisitorSolvedRepository solvedRepository;
    private final VisitorProfileService profileService;
    private final UserRepository userRepository;
    private final AuthService authService;
    private final MembershipService membershipService;
    private final VisitorTierGrantRepository grants;
    private final com.csstudy.backend.service.PromotionNoticeService notices;
    private final com.csstudy.backend.service.PointService pointService;

    private final com.csstudy.backend.service.RankWelcomeService welcomeService;
    private final com.csstudy.backend.repository.NicknameClaimRepository nicknameClaims;

    @PostMapping("/rank/welcome")
    public Map<String, Object> welcome(HttpServletRequest request) {
        User user = authService.currentUser(request).orElse(null);
        Integer rank = null;
        if (user != null) {
            Board current = board();
            rank = solvedRepository.findByUserId(user.getId()).stream()
                    .map(v -> current.rankOf().get(v.getVisitorId()))
                    .filter(Objects::nonNull).min(Integer::compareTo).orElse(null);
        }
        return Map.of("notices", welcomeService.heartbeat(user == null ? null : user.getId(),
                rank, user == null ? null : user.getNickname(), Instant.now()));
    }

    private volatile Board cached;
    @org.springframework.transaction.event.TransactionalEventListener(fallbackExecution = true)
    public void profileChanged(com.csstudy.backend.service.NicknameService.Changed event) { cached=null; }

    // 방문자 ID를 헤더로 주면 본인 순위도 함께 돌려준다
    @GetMapping("/rank/solved")
    public Map<String, Object> solved(@RequestHeader(value = "X-Visitor-Id", required = false) String visitorId,
                                      @RequestParam(defaultValue = "false") boolean all,
                                      HttpServletRequest request) {
        Board board = board();
        List<Solver> top = all ? board.ranked() : board.ranked().subList(0, Math.min(TOP, board.ranked().size()));
        User currentUser = authService.currentUser(request).orElse(null);
        Integer myRank = currentUser == null
                ? (visitorId == null ? null : board.rankOf().get(visitorId))
                : board.rankOf().get("user:" + currentUser.getId());

        Set<String> ids = new HashSet<>();
        top.forEach(s -> ids.add(s.visitorId()));
        if (visitorId != null) ids.add(visitorId);
        Map<String, String> nicknames = profileService.nicknames(ids);

        List<Map<String, Object>> rows = new ArrayList<>();
        for (int i = 0; i < top.size(); i++) {
            Solver s = top.get(i);
            Map<String, Object> row = row(s, i + 1, nicknames.get(s.visitorId()));
            row.put("me", myRank != null && myRank == i + 1);
            rows.add(row);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("top", rows);
        // 한 문제 이상 푼 모든 계정을 순위와 합계에 포함한다. 같은 계정의 여러 기기는 한 명으로 센다.
        // 순위표에서 뺀 관리 계정(admin1~admin5)의 문제 수도 합계에는 더한다
        out.put("totalSolved", board.ranked().stream().mapToLong(Solver::count).sum() + board.hiddenSolved());
        out.put("totalSolvers", board.ranked().size() + board.hiddenSolvers());
        Solver mine = myRank == null ? null : board.ranked().get(myRank - 1);
        out.put("me", mine == null ? null : row(mine, myRank, nicknames.get(visitorId)));
        // 직접 정한 닉네임만 돌려준다. 정한 적이 없으면 null. 계정으로 묶인 기기는 계정 닉네임이 나간다
        out.put("nickname", mine != null && mine.account() != null ? mine.account() : visitorId == null ? null : nicknames.get(visitorId));
        out.put("account", mine != null && mine.account() != null);
        return out;
    }

    // 브라우저에 남은 풀이 기록에서 센 "한 번이라도 푼 문제 수"를 받아 둔다
    @org.springframework.transaction.annotation.Transactional
    @PutMapping("/rank/solved")
    public ResponseEntity<?> report(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String visitorId = body.get("visitorId") instanceof String s && !s.isBlank() && s.length() <= 40 ? s.trim() : null;
        Integer count = body.get("count") instanceof Number n && n.intValue() >= 0 && n.intValue() <= MAX_SOLVED ? n.intValue() : null;
        if (visitorId == null || count == null) return ResponseEntity.badRequest().build();

        var account=authService.currentUser(request);
        var before=account.isPresent()?membershipService.membership(account.get()):membershipService.visitor(visitorId);
        VisitorSolved solved = solvedRepository.findByVisitorId(visitorId)
                .orElseGet(() -> VisitorSolved.builder().visitorId(visitorId).count(-1).build());
        // 연결된 기록은 다른 계정이나 로그아웃한 요청이 변경할 수 없다.
        if (solved.getUserId() != null && !Objects.equals(solved.getUserId(), account.map(User::getId).orElse(null)))
            return ResponseEntity.status(403).build();
        Long userId = authService.currentUser(request).map(User::getId).orElse(solved.getUserId());
        if (solved.getCount() != count || !Objects.equals(solved.getUserId(), userId)) {
            solved.setCount(count);
            solved.setUserId(userId);
            solved.setUpdatedAt(Instant.now());
            try {
                solvedRepository.saveAndFlush(solved);
                var after=account.isPresent()?membershipService.membership(account.get()):membershipService.visitor(visitorId);
                notices.announce(account.isPresent()?"user:"+account.get().getId():"visitor:"+visitorId,before,after);
                // 로그인한 계정이면 새로 푼 문제 · 승급 · 오늘의 퀘스트 포인트를 바로 준다
                if (account.isPresent()) pointService.refresh(account.get());
                cached = null;   // 방금 알려 준 숫자가 바로 순위에 보이게 한다
            } catch (DataIntegrityViolationException e) {
                // 같은 방문자의 요청이 겹쳤다. 먼저 들어간 값을 그대로 둔다
            }
        }
        return ResponseEntity.ok(Map.of("count", count));
    }

    // 순위에 나올 닉네임을 정한다. 채팅에서 쓰는 이름과 같은 것이다
    @PutMapping("/profile")
    public ResponseEntity<?> profile(@RequestBody Map<String, Object> body,HttpServletRequest request) {
        String visitorId = body.get("visitorId") instanceof String s && !s.isBlank() && s.length() <= 40 ? s.trim() : null;
        String nickname = VisitorProfileService.nickname(body.get("nickname"));
        if (visitorId == null || nickname == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "닉네임을 확인해 주세요."));
        }
        var user=authService.currentUser(request);
        if(user.isPresent() && !user.get().getNickname().equals(nickname))
            return ResponseEntity.badRequest().body(Map.of("error","회원 닉네임은 내 계정에서 변경해 주세요."));
        profileService.remember(visitorId, nickname,user.map(User::getId).orElse(null));
        return ResponseEntity.ok(Map.of("nickname", nickname));
    }

    // 닉네임을 정하지 않은 사람은 익명 닉네임으로 나간다
    private Map<String, Object> row(Solver s, int rank, String nickname) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("rank", rank);
        row.put("nickname", s.account() != null ? s.account() : nickname != null ? nickname : VisitorProfileService.anonymous(s.visitorId()));
        row.put("count", s.count());
        var status = membershipService.describe(s.baseTier(), s.count(), s.subjectKey());
        UserTier tier = status.tier();
        row.put("tier", tier);
        row.put("tierName", status.tierName());
        row.put("division", status.division());
        return row;
    }

    // 같은 사람의 기기인데 풀이 보고가 계정에 묶이지 않은 방문자(로그인 전에 풀었거나 보고를 놓친 기기)는
    // 순위에 계정 줄과 방문자 줄로 두 번 나온다(이슈 #297). 닉네임은 계정과 방문자를 통틀어 한 주인만 가질 수 있으므로,
    // 방문자 닉네임의 주인이 계정(u:번호)이면 그 기기를 그 계정의 기기로 합친다
    private void linkDevicesByNickname(Map<String, Long> counts, Map<Long, List<String>> devices) {
        Set<String> linked = new HashSet<>();
        devices.values().forEach(linked::addAll);
        List<String> loose = counts.keySet().stream().filter(id -> !linked.contains(id)).toList();
        Map<String, String> names = profileService.nicknames(loose);
        if (names.isEmpty()) return;
        Map<String, String> ownerOf = new HashMap<>();
        nicknameClaims.findAllById(names.values().stream().map(com.csstudy.backend.service.NicknameService::key).distinct().toList())
                .forEach(c -> ownerOf.put(c.getName(), c.getOwner()));
        names.forEach((visitorId, name) -> {
            String owner = ownerOf.get(com.csstudy.backend.service.NicknameService.key(name));
            if (owner == null || !owner.startsWith("u:")) return;
            try {
                devices.computeIfAbsent(Long.valueOf(owner.substring(2)), k -> new ArrayList<>()).add(visitorId);
            } catch (NumberFormatException ignored) { /* 형식이 다른 주인 값은 방문자 줄로 둔다 */ }
        });
    }

    // 집계는 기록 전체를 훑으므로 잠깐 들고 있는다
    private Board board() {
        Board board = cached;
        if (board != null && board.at().isAfter(Instant.now().minusSeconds(CACHE_SECONDS))) {
            return board;
        }

        // 풀이 완료 기록으로 어림한 값: 문제집마다 한 번씩만 센 문제 수를 방문자별로 더한다
        Map<String, Long> counts = new HashMap<>();
        usageEventRepository.solvedCounts().forEach(r -> counts.merge((String) r[0], ((Number) r[2]).longValue(), Long::sum));
        // 브라우저가 알려 준 값이 있으면 그것이 정확하므로 그 값을 쓴다
        // 같은 계정으로 로그인한 기기들은 한 줄로 합친다. 기기끼리 기록을 맞추므로 더하지 않고 가장 큰 값을 쓴다
        Map<Long, List<String>> devices = new HashMap<>();
        solvedRepository.findAll().forEach(v -> {
            counts.put(v.getVisitorId(), (long) v.getCount());
            if (v.getUserId() != null) devices.computeIfAbsent(v.getUserId(), k -> new ArrayList<>()).add(v.getVisitorId());
        });
        Map<Long, Long> saved = membershipService.savedCounts();
        // 기기 보고가 없어도 계정에 저장된 풀이 기록이 있으면 순위에 포함한다.
        saved.keySet().forEach(id -> devices.computeIfAbsent(id, key -> new ArrayList<>()));
        linkDevicesByNickname(counts, devices);
        Map<Long, User> accounts = new HashMap<>();
        userRepository.findAllById(devices.keySet()).forEach(u -> accounts.put(u.getId(), u));
        Map<String, UserTier> visitorTiers = new HashMap<>();
        grants.findAll().forEach(g -> visitorTiers.put(g.getVisitorId(), g.getTier()));

        List<Solver> ranked = new ArrayList<>();
        List<Solver> hidden = new ArrayList<>();
        Map<String, Solver> solverOf = new HashMap<>();
        devices.forEach((userId, ids) -> {
            if (!accounts.containsKey(userId)) return;   // 지워진 계정의 기기는 따로 센다
            ids.sort(Comparator.naturalOrder());
            long best = Math.max(saved.getOrDefault(userId, 0L), ids.stream().mapToLong(counts::get).max().orElse(0));
            User user = accounts.get(userId);
            Solver s = new Solver(ids.isEmpty() ? "user:" + userId : ids.get(0), best, user.getNickname(), MembershipService.baseTier(user), "user:" + userId);
            solverOf.put("user:" + userId, s);
            ids.forEach(id -> { solverOf.put(id, s); counts.remove(id); });
            if (best > 0) (hiddenFromRank(user.getNickname()) ? hidden : ranked).add(s);
        });
        counts.forEach((visitorId, count) -> {
            if (count <= 0) return;
            Solver s = new Solver(visitorId, count, null, visitorTiers.getOrDefault(visitorId, UserTier.BRONZE), "visitor:" + visitorId);
            solverOf.put(visitorId, s);
            ranked.add(s);
        });
        // 티어와 권한은 정렬에 관여하지 않는다. 문제 수가 같으면 방문자 ID로 순서를 고정한다.
        ranked.sort(Comparator.comparingLong(Solver::count).reversed().thenComparing(Solver::visitorId));

        Map<Solver, Integer> place = new IdentityHashMap<>();
        for (int i = 0; i < ranked.size(); i++) place.put(ranked.get(i), i + 1);
        Map<String, Integer> rankOf = new HashMap<>();
        solverOf.forEach((visitorId, s) -> { if (place.containsKey(s)) rankOf.put(visitorId, place.get(s)); });
        board = new Board(ranked, rankOf, hidden.stream().mapToLong(Solver::count).sum(), hidden.size(), Instant.now());
        cached = board;
        return board;
    }
}
