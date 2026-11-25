package com.csstudy.backend.controller;

import com.csstudy.backend.entity.LoungeMessage;
import com.csstudy.backend.repository.LoungeMessageRepository;
import com.csstudy.backend.service.AdminAuth;
import com.csstudy.backend.service.PresenceService;
import com.csstudy.backend.service.VisitorProfileService;
import com.csstudy.backend.service.LoungeStreamService;
import com.csstudy.backend.service.AuthService;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

// 접속해 있는 사람들이 함께 쓰는 채팅방. 로그인이 없어 닉네임만으로 쓰고, 화면은 새 글을 몇 초마다 물어 간다.
// 그 조회가 DB를 깨우지 않도록 최근 글은 메모리에 들고 있다
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class LoungeController {

    private static final int RECENT = 100;
    private static final int TEXT_MAX = 200;
    private static final int ADMIN_LIST = 200;
    private static final ZoneId CHAT_ZONE = ZoneId.of("Asia/Seoul");
    // 한 사람이 연달아 보낼 수 있는 간격과, 한 곳(IP)에서 1분에 보낼 수 있는 수
    private static final Duration MIN_GAP = Duration.ofMillis(1500);
    private static final int PER_IP_PER_MINUTE = 30;
    private static final int LIMITER_MAX = 5000;

    private final LoungeMessageRepository messageRepository;
    private final VisitorProfileService profileService;
    private final PresenceService presenceService;
    private final AdminAuth adminAuth;
    private final LoungeStreamService streamService;
    private final AuthService authService;

    private final Deque<LoungeMessage> recent = new ArrayDeque<>();
    private boolean loaded;
    private LocalDate visibleDay = LocalDate.now(CHAT_ZONE);
    // 글이 지워지면 바뀐다. 화면은 이 값이 달라지면 목록을 처음부터 다시 받는다
    private long epoch = System.currentTimeMillis();

    private final Map<String, Instant> lastSentAt = new ConcurrentHashMap<>();
    private final Map<String, long[]> sentPerIp = new ConcurrentHashMap<>();

    // after를 주면 그 뒤에 올라온 글만, 안 주면 최근 글을 모두 돌려준다
    @GetMapping(value = "/lounge/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    // synchronized를 걸지 않는다: 몰릴 때 연결이 한 줄로 서지 않게, 목록 읽기(messages)만 잠근다
    public SseEmitter stream(jakarta.servlet.http.HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        SseEmitter emitter = streamService.subscribe(messages(null));
        // 상한을 넘으면 오류 대신 "가득 참"을 알려 화면이 몇 초마다 조회로 바꾸게 한다(ERROR 로그와 긴급 알림을 만들지 않음)
        return emitter != null ? emitter : streamService.full();
    }

    @GetMapping("/lounge/messages")
    public Map<String, Object> messages(@RequestParam(required = false) Long after) {
        List<Map<String, Object>> rows;
        long currentEpoch;
        synchronized (this) {
            load();
            rollDay();
            rows = recent.stream().filter(m -> after == null || m.getId() > after).map(LoungeController::row).toList();
            currentEpoch = epoch;
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("messages", rows);
        out.put("epoch", currentEpoch);
        out.put("online", presenceService.count());
        out.put("participants", presenceService.chatMembers());
        return out;
    }

    @PostMapping("/lounge/presence")
    public ResponseEntity<?> joinChat(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String id = str(body.get("visitorId"), 40);
        if (id == null) return ResponseEntity.badRequest().build();
        String name = authService.currentUser(request).map(com.csstudy.backend.entity.User::getNickname)
                .orElseGet(() -> VisitorProfileService.nickname(body.get("nickname")));
        if (name == null) name = VisitorProfileService.anonymous(id);
        profileService.remember(id,name,authService.currentUser(request).map(com.csstudy.backend.entity.User::getId).orElse(null));
        String self = presenceService.joinChat(id, name);
        if (self == null) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        // 입장은 참여자 목록만 알린다(전체 글 목록을 모두에게 다시 보내지 않는다)
        streamService.publishPresence(presenceService.count(), presenceService.chatMembers());
        return ResponseEntity.ok(Map.of("self", self, "participants", presenceService.chatMembers()));
    }

    @DeleteMapping("/lounge/presence")
    public Map<String, Object> leaveChat(@RequestBody Map<String, Object> body) {
        presenceService.leaveChat(str(body.get("visitorId"), 40));
        streamService.publishPresence(presenceService.count(), presenceService.chatMembers());
        return Map.of("ok", true);
    }

    @PostMapping("/lounge/messages")
    public synchronized ResponseEntity<?> send(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String visitorId = str(body.get("visitorId"), 40);
        var user = authService.currentUser(request);
        String nickname = user.map(com.csstudy.backend.entity.User::getNickname)
                .orElseGet(() -> VisitorProfileService.nickname(body.get("nickname")));
        String text = text(body.get("text"));
        String clientId = str(body.get("clientId"), 36);
        if (visitorId == null || nickname == null || text == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "닉네임과 내용을 확인해 주세요."));
        }
        if (text.length() > TEXT_MAX) {
            return ResponseEntity.badRequest().body(Map.of("error", TEXT_MAX + "자까지 보낼 수 있습니다."));
        }

        if (clientId != null) {
            var existing = messageRepository.findByVisitorIdAndClientId(visitorId, clientId);
            if (existing.isPresent()) return ResponseEntity.ok(row(existing.get()));
        }

        Instant now = Instant.now();
        String ipHash = hash(clientIp(request));
        if (tooFast(visitorId, ipHash, now)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of("error", "조금 천천히 보내 주세요."));
        }

        profileService.remember(visitorId, nickname,user.map(com.csstudy.backend.entity.User::getId).orElse(null));
        LoungeMessage saved;
        synchronized (this) {
            load();
            rollDay();
            LoungeMessage last = recent.peekLast();
            if (last != null && last.getVisitorId().equals(visitorId) && last.getText().equals(text)) {
                return ResponseEntity.badRequest().body(Map.of("error", "같은 내용을 연달아 보낼 수 없습니다."));
            }
            saved = messageRepository.save(LoungeMessage.builder()
                    .visitorId(visitorId).clientId(clientId).nickname(nickname).text(text).ipHash(ipHash).createdAt(now).build());
            recent.addLast(saved);
            while (recent.size() > RECENT) recent.removeFirst();
            // 새 글은 그 글 하나만 보낸다(예전에는 최근 100개 전체를 접속자마다 다시 보냈다)
            streamService.publishMessage(row(saved), epoch);
        }
        return ResponseEntity.ok(row(saved));
    }

    @GetMapping("/admin/lounge/messages")
    public List<Map<String, Object>> adminList(@RequestHeader(value = "X-Admin-Key", required = false) String key) {
        adminAuth.require(key);
        return messageRepository.findByOrderByIdDesc(PageRequest.of(0, ADMIN_LIST)).stream().map(LoungeController::row).toList();
    }

    // 부적절한 글을 지운다. 열려 있는 화면에서도 다음 조회 때 사라진다
    @DeleteMapping("/admin/lounge/messages/{id}")
    public Map<String, Object> adminDelete(@RequestHeader(value = "X-Admin-Key", required = false) String key,
                                           @PathVariable Long id) {
        adminAuth.require(key);
        if (!messageRepository.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다.");
        messageRepository.deleteById(id);
        synchronized (this) {
            recent.removeIf(m -> m.getId().equals(id));
            epoch++;
            streamService.publish(messages(null));
        }
        return Map.of("ok", true);
    }

    // DB에는 보관하고, 한국시간 자정에 공개 목록만 비운다.
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Seoul")
    public synchronized void newDay() {
        rollDay();
        streamService.publish(messages(null));
    }

    private void rollDay() {
        LocalDate today = LocalDate.now(CHAT_ZONE);
        Instant cutoff = today.atStartOfDay(CHAT_ZONE).toInstant();
        boolean changed = recent.removeIf(message -> message.getCreatedAt().isBefore(cutoff));
        if (!today.equals(visibleDay) || changed) epoch++;
        visibleDay = today;
    }

    // 서버가 뜬 뒤 첫 조회 때 한 번만 DB에서 최근 글을 가져온다. synchronized 안에서 부른다
    private void load() {
        if (loaded) return;
        List<LoungeMessage> rows = messageRepository.findByOrderByIdDesc(PageRequest.of(0, RECENT));
        for (int i = rows.size() - 1; i >= 0; i--) recent.addLast(rows.get(i));
        loaded = true;
    }

    private boolean tooFast(String visitorId, String ipHash, Instant now) {
        if (lastSentAt.size() > LIMITER_MAX) lastSentAt.clear();
        if (sentPerIp.size() > LIMITER_MAX) sentPerIp.clear();

        Instant last = lastSentAt.get(visitorId);
        if (last != null && Duration.between(last, now).compareTo(MIN_GAP) < 0) return true;

        long minute = now.getEpochSecond() / 60;
        long[] window = sentPerIp.compute(String.valueOf(ipHash), (k, v) -> v == null || v[0] != minute ? new long[]{minute, 0} : v);
        synchronized (window) {
            if (window[1] >= PER_IP_PER_MINUTE) return true;
            window[1]++;
        }
        lastSentAt.put(visitorId, now);
        return false;
    }

    // 방문자 ID는 본인 글을 알아보는 데만 쓰도록 앞 8자만 내보낸다
    private static Map<String, Object> row(LoungeMessage m) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", m.getId());
        if (m.getClientId() != null) row.put("clientId", m.getClientId());
        row.put("nickname", m.getNickname());
        row.put("text", m.getText());
        row.put("at", m.getCreatedAt().toString());
        row.put("visitor", m.getVisitorId().substring(0, Math.min(8, m.getVisitorId().length())));
        return row;
    }

    // 한 줄짜리 글로 다듬는다. 길이는 자르지 않고 호출한 쪽에서 거절한다
    private static String text(Object value) {
        if (!(value instanceof String s)) return null;
        String t = s.replaceAll("\\p{Cntrl}", " ").replaceAll("\\s+", " ").trim();
        return t.isEmpty() ? null : t;
    }

    // Render 같은 프록시 뒤에서는 실제 주소가 X-Forwarded-For의 첫 값으로 온다
    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
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
