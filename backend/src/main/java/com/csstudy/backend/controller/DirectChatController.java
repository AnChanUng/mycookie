package com.csstudy.backend.controller;

import com.csstudy.backend.entity.*;
import com.csstudy.backend.repository.*;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.ChatReactionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/direct")
@RequiredArgsConstructor
@Transactional
public class DirectChatController {
    private final AuthService auth;
    private final UserRepository users;
    private final DirectThreadRepository threads;
    private final DirectMessageRepository messages;
    private final ChatReactionService reactions;
    private static final int SEARCH_LIMIT = 8;
    private static final int MEMBERS_MAX = 50;

    private DirectThread owned(Long id, Long me) {
        DirectThread t = threads.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!me.equals(t.getLowUser()) && !me.equals(t.getHighUser())) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return t;
    }
    private Map<String,Object> row(DirectThread t, Long me) {
        Long peer = me.equals(t.getLowUser()) ? t.getHighUser() : t.getLowUser();
        String state = t.isFriends() ? "friends" : t.getRequestedBy() == null ? "none" : me.equals(t.getRequestedBy()) ? "sent" : "received";
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("id",t.getId());
        out.put("nickname",users.findById(peer).map(User::getNickname).orElse("탈퇴한 사용자"));
        out.put("friendship",state);
        out.put("unread",messages.countByThreadIdAndSenderIdNotAndReadAtIsNull(t.getId(),me));
        // 목록에서 마지막 메시지를 미리 보여 준다
        messages.findTopByThreadIdOrderByIdDesc(t.getId()).ifPresent(m -> {
            out.put("lastText",m.getText().length() > 60 ? m.getText().substring(0,60) + "…" : m.getText());
            out.put("lastAt",m.getCreatedAt());
            out.put("lastMine",m.getSenderId().equals(me));
        });
        return out;
    }
    // 최근에 대화가 오간 순서로 보여 준다. 메시지가 없는 대화는 만든 순서대로 뒤에 둔다
    @GetMapping
    public List<Map<String,Object>> inbox(HttpServletRequest request) {
        Long me = auth.requireUser(request).getId();
        return threads.findByLowUserOrHighUserOrderByIdDesc(me,me).stream().map(t -> row(t,me))
                .sorted(Comparator.comparing((Map<String,Object> r) -> (Instant) r.get("lastAt"), Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }
    // 계정 사람을 찾는 한 줄. 친구 관계와 대화방 번호를 함께 돌려준다
    private Map<String,Object> person(User u, Long me) {
        Long low = Math.min(me,u.getId()), high = Math.max(me,u.getId());
        Map<String,Object> out = new LinkedHashMap<>();
        out.put("nickname",u.getNickname());
        var thread = threads.findByLowUserAndHighUser(low,high);
        out.put("friendship",thread.map(t -> t.isFriends() ? "friends" : t.getRequestedBy() == null ? "none" : me.equals(t.getRequestedBy()) ? "sent" : "received").orElse("none"));
        thread.ifPresent(t -> out.put("threadId",t.getId()));
        return out;
    }
    // 닉네임 일부로 계정을 찾는다
    @GetMapping("/search")
    public List<Map<String,Object>> search(@RequestParam(defaultValue = "") String q, HttpServletRequest request) {
        Long me = auth.requireUser(request).getId();
        String query = q.trim();
        if (query.isEmpty()) return List.of();
        if (query.length() > 20) query = query.substring(0,20);
        return users.findTop9ByNicknameContainingIgnoreCaseOrderByNicknameAsc(query).stream()
                .filter(u -> !u.getId().equals(me) && u.getNickname() != null).limit(SEARCH_LIMIT).map(u -> person(u,me)).toList();
    }
    // 접속 중인 사람들 가운데 계정이 있는 사람만 골라 친구 추천에 쓴다
    @PostMapping("/members")
    public List<Map<String,Object>> members(@RequestBody Map<String,List<String>> body, HttpServletRequest request) {
        Long me = auth.requireUser(request).getId();
        List<String> names = Optional.ofNullable(body.get("nicknames")).orElse(List.of()).stream()
                .filter(Objects::nonNull).map(String::trim).filter(n -> !n.isEmpty() && n.length() <= 40).distinct().limit(MEMBERS_MAX).toList();
        if (names.isEmpty()) return List.of();
        return users.findByNicknameIn(names).stream().filter(u -> !u.getId().equals(me)).map(u -> person(u,me)).toList();
    }
    @PostMapping
    public Map<String,Object> start(@RequestBody Map<String,String> body, HttpServletRequest request) {
        Long me = auth.requireUser(request).getId();
        String name = body.getOrDefault("nickname","").trim();
        User peer = users.findByNickname(name).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"로그인 계정으로 등록된 닉네임을 찾을 수 없습니다."));
        if (peer.getId().equals(me)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"본인에게 요청할 수 없습니다.");
        Long low = Math.min(me,peer.getId()), high = Math.max(me,peer.getId());
        // Lock the stable pair endpoint before creating a unique thread.
        users.findForUpdate(low).orElseThrow();
        DirectThread t = threads.findByLowUserAndHighUser(low,high).orElseGet(() -> {
            DirectThread created = new DirectThread(); created.setLowUser(low); created.setHighUser(high);
            return threads.saveAndFlush(created);
        });
        return row(t,me);
    }
    @PostMapping("/{id}/friend")
    public Map<String,Object> friendship(@PathVariable Long id, @RequestBody Map<String,String> body, HttpServletRequest request) {
        Long me = auth.requireUser(request).getId();
        DirectThread initial = owned(id,me);
        users.findForUpdate(initial.getLowUser()).orElseThrow();
        // Refresh after locking to observe a concurrently committed request.
        entityManager.refresh(initial);
        String action = body.getOrDefault("action","");
        switch (action) {
            case "request" -> { if (!initial.isFriends() && initial.getRequestedBy()==null) initial.setRequestedBy(me); }
            case "accept" -> {
                if (initial.getRequestedBy()==null || me.equals(initial.getRequestedBy())) throw new ResponseStatusException(HttpStatus.CONFLICT);
                initial.setFriends(true); initial.setRequestedBy(null);
            }
            case "remove" -> { initial.setFriends(false); initial.setRequestedBy(null); }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        return row(initial,me);
    }
    private final jakarta.persistence.EntityManager entityManager;

    @GetMapping("/{id}/messages")
    public List<Map<String,Object>> history(@PathVariable Long id, HttpServletRequest request) {
        Long me=auth.requireUser(request).getId(); owned(id,me);
        List<DirectMessage> rows = new ArrayList<>(messages.findTop100ByThreadIdOrderByIdDesc(id));
        Collections.reverse(rows);
        var reacted = reactions.load("direct", rows.stream().map(DirectMessage::getId).toList());
        return rows.stream().map(m -> Map.<String,Object>of("id",m.getId(),"mine",m.getSenderId().equals(me),"text",m.getText(),"at",m.getCreatedAt(),
                "reactions",summary(reacted.getOrDefault(m.getId(),Map.of()),me))).toList();
    }
    private static List<Map<String,Object>> summary(Map<String,? extends Collection<String>> byEmoji, Long me) {
        return byEmoji.entrySet().stream().filter(e -> !e.getValue().isEmpty())
                .map(e -> Map.<String,Object>of("emoji",e.getKey(),"count",e.getValue().size(),"mine",e.getValue().contains("u:"+me))).toList();
    }
    // 1:1 메시지에 이모지 반응을 달거나 뗀다
    @PostMapping("/{id}/messages/{messageId}/reactions")
    public List<Map<String,Object>> react(@PathVariable Long id, @PathVariable Long messageId, @RequestBody Map<String,String> body, HttpServletRequest request) {
        Long me=auth.requireUser(request).getId(); owned(id,me);
        DirectMessage m = messages.findById(messageId).filter(x -> x.getThreadId().equals(id)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String emoji = body.get("emoji");
        if (!ChatReactionService.allowed(emoji)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"보낼 수 없는 반응입니다.");
        reactions.toggle("direct",m.getId(),"u:"+me,emoji);
        return summary(reactions.load("direct",List.of(m.getId())).getOrDefault(m.getId(),Map.of()),me);
    }
    @PostMapping("/{id}/read")
    public Map<String,Boolean> read(@PathVariable Long id,@RequestBody Map<String,Long> body,HttpServletRequest request) {
        Long me=auth.requireUser(request).getId(); owned(id,me);
        messages.markRead(id,me,body.getOrDefault("last",0L),Instant.now());
        return Map.of("ok",true);
    }
    @PostMapping("/{id}/messages")
    public Map<String,Long> send(@PathVariable Long id,@RequestBody Map<String,String> body,HttpServletRequest request) {
        Long me=auth.requireUser(request).getId(); owned(id,me);
        String text=body.getOrDefault("text","").trim(), client=body.getOrDefault("clientId","");
        if(text.isBlank() || text.length()>1000 || !client.matches("[a-zA-Z0-9-]{1,36}")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        users.findForUpdate(me).orElseThrow();
        var previous=messages.findBySenderIdAndClientId(me,client);
        if(previous.isPresent()) {
            if(!previous.get().getThreadId().equals(id))throw new ResponseStatusException(HttpStatus.CONFLICT);
            return Map.of("id",previous.get().getId());
        }
        if(messages.findTopBySenderIdOrderByIdDesc(me).filter(m -> m.getCreatedAt().isAfter(Instant.now().minusSeconds(1))).isPresent()) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        DirectMessage m=new DirectMessage();m.setThreadId(id);m.setSenderId(me);m.setClientId(client);m.setText(text);m.setCreatedAt(Instant.now());
        return Map.of("id",messages.save(m).getId());
    }
}
