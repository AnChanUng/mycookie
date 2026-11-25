package com.csstudy.backend.controller;

import com.csstudy.backend.entity.ArcadeScore;
import com.csstudy.backend.repository.ArcadeScoreRepository;
import com.csstudy.backend.service.AdminAuth;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.*;

// 숨은 오락실의 게임별 3위까지 순위판. 점수는 브라우저가 보내는 값이라 위조를 완전히 막을 수는 없고,
// 말이 안 되는 값과 한 곳에서의 도배만 걸러 낸다
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ArcadeController {

    // lowerWins: 시간·횟수처럼 작을수록 좋은 기록. min~max 밖의 값은 받지 않는다
    private record Board(boolean lowerWins, long min, long max) {}

    private static final Map<String, Board> BOARDS = new LinkedHashMap<>();
    static {
        BOARDS.put("eliminate", new Board(false, 1, 1_000_000));
        BOARDS.put("2048", new Board(false, 4, 4_000_000));
        BOARDS.put("snake", new Board(false, 10, 100_000));
        BOARDS.put("breakout", new Board(false, 5, 1_000_000));
        BOARDS.put("flappy", new Board(false, 1, 10_000));
        BOARDS.put("mines-easy", new Board(true, 1, 5_999));
        BOARDS.put("mines-normal", new Board(true, 1, 5_999));
        BOARDS.put("mines-hard", new Board(true, 1, 5_999));
        BOARDS.put("memory-4", new Board(true, 8, 999));
        BOARDS.put("memory-6", new Board(true, 18, 999));
        BOARDS.put("reaction", new Board(true, 80, 5_000));
    }

    private static final int TOP = 3;
    private static final int NICKNAME_MAX = 10;
    // 같은 곳(IP)에서 한 순위판에 올릴 수 있는 서로 다른 방문자 수
    private static final int PER_IP_PER_BOARD = 5;

    private final ArcadeScoreRepository scoreRepository;
    private final AdminAuth adminAuth;
    private final com.csstudy.backend.security.ClientAddress addresses;

    // game을 주면 그 순위판만, 안 주면 모든 순위판을 돌려준다
    @GetMapping("/arcade/scores")
    public Map<String, Object> scores(@RequestParam(required = false) String game) {
        Map<String, Object> out = new LinkedHashMap<>();
        if (game != null) {
            requireBoard(game);
            out.put(game, top(game));
            return out;
        }
        for (String key : BOARDS.keySet()) out.put(key, top(key));
        return out;
    }

    @PostMapping("/arcade/scores")
    public ResponseEntity<?> submit(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String game = body.get("game") instanceof String s ? s : null;
        String visitorId = str(body.get("visitorId"), 40);
        String nickname = nickname(body.get("nickname"));
        Board board = game == null ? null : BOARDS.get(game);
        if (board == null || visitorId == null || nickname == null || !(body.get("score") instanceof Number n)) {
            return ResponseEntity.badRequest().body(Map.of("error", "기록을 확인해 주세요."));
        }
        long score = n.longValue();
        if (score < board.min() || score > board.max()) {
            return ResponseEntity.badRequest().body(Map.of("error", "등록할 수 없는 기록입니다."));
        }

        Optional<ArcadeScore> mine = scoreRepository.findByGameAndVisitorId(game, visitorId);
        List<ArcadeScore> current = topRows(game);
        boolean improves = mine.map(m -> better(board, score, m.getScore())).orElse(true);
        boolean inTop = current.size() < TOP || better(board, score, current.get(current.size() - 1).getScore())
                || mine.map(m -> current.stream().anyMatch(c -> c.getId().equals(m.getId()))).orElse(false);

        boolean saved = false;
        if (improves && inTop) {
            String ipHash = hash(clientIp(request));
            if (mine.isEmpty() && scoreRepository.countByGameAndIpHash(game, ipHash) >= PER_IP_PER_BOARD) {
                return ResponseEntity.badRequest().body(Map.of("error", "이 네트워크에서는 더 등록할 수 없습니다."));
            }
            ArcadeScore row = mine.orElseGet(() -> ArcadeScore.builder().game(game).visitorId(visitorId).build());
            row.setNickname(nickname);
            row.setScore(score);
            row.setIpHash(ipHash);
            row.setUpdatedAt(Instant.now());
            try {
                scoreRepository.save(row);
                saved = true;
            } catch (DataIntegrityViolationException e) {
                // 같은 방문자의 요청이 겹쳤다. 먼저 들어간 기록을 그대로 둔다
            }
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("saved", saved);
        out.put("top", top(game));
        return ResponseEntity.ok(out);
    }

    @GetMapping("/admin/arcade/scores")
    public List<Map<String, Object>> adminList(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        return scoreRepository.findByOrderByGameAscUpdatedAtDesc().stream().map(r -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", r.getId());
            m.put("game", r.getGame());
            m.put("nickname", r.getNickname());
            m.put("score", r.getScore());
            m.put("at", r.getUpdatedAt().toString());
            return m;
        }).toList();
    }

    // 부적절한 닉네임이나 조작된 기록을 지운다
    @DeleteMapping("/admin/arcade/scores/{id}")
    public Map<String, Object> adminDelete(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                           @PathVariable Long id) {
        adminAuth.require(key);
        if (!scoreRepository.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "기록을 찾을 수 없습니다.");
        scoreRepository.deleteById(id);
        return Map.of("ok", true);
    }

    private static boolean better(Board board, long a, long b) {
        return board.lowerWins() ? a < b : a > b;
    }

    private static void requireBoard(String game) {
        if (!BOARDS.containsKey(game)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "없는 순위판입니다.");
    }

    private List<ArcadeScore> topRows(String game) {
        return BOARDS.get(game).lowerWins()
                ? scoreRepository.findTop3ByGameOrderByScoreAscUpdatedAtAsc(game)
                : scoreRepository.findTop3ByGameOrderByScoreDescUpdatedAtAsc(game);
    }

    // 방문자 ID는 본인 기록을 알아보는 데만 쓰도록 앞 8자만 내보낸다
    private List<Map<String, Object>> top(String game) {
        List<Map<String, Object>> rows = new ArrayList<>();
        for (ArcadeScore r : topRows(game)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("nickname", r.getNickname());
            m.put("score", r.getScore());
            m.put("visitor", r.getVisitorId().substring(0, Math.min(8, r.getVisitorId().length())));
            rows.add(m);
        }
        return rows;
    }

    // 제어 문자와 꺾쇠를 걷어 내고 공백을 하나로 줄인다
    private static String nickname(Object value) {
        if (!(value instanceof String s)) return null;
        String t = s.replaceAll("[\\p{Cntrl}<>]", "").replaceAll("\\s+", " ").trim();
        if (t.isEmpty()) return null;
        return t.length() > NICKNAME_MAX ? t.substring(0, NICKNAME_MAX) : t;
    }

    // 요청한 곳의 주소. X-Forwarded-For의 첫 값은 누구나 지어 넣을 수 있어서, 믿을 수 있는 프록시가 붙인 값만 쓰는 ClientAddress로 고른다
    private String clientIp(HttpServletRequest request) {
        return addresses.resolve(request);
    }

    private static String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            return null;
        }
    }

    private static String str(Object value, int max) {
        if (!(value instanceof String s)) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
