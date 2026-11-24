package com.csstudy.backend.service;

import com.csstudy.backend.entity.ChatReaction;
import com.csstudy.backend.repository.ChatReactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

// 이모지 반응을 켜고 끈다. 정해 둔 이모지만 받는다
@Service
@RequiredArgsConstructor
public class ChatReactionService {
    public static final List<String> EMOJI = List.of("👍", "❤️", "😂", "😮", "😢", "🎉");

    private final ChatReactionRepository repository;

    public static boolean allowed(String emoji) { return emoji != null && EMOJI.contains(emoji); }

    // 이미 단 반응이면 지우고, 없으면 단다. 달았으면 true
    @Transactional
    public boolean toggle(String kind, Long messageId, String reactor, String emoji) {
        var existing = repository.findByKindAndMessageIdAndReactorAndEmoji(kind, messageId, reactor, emoji);
        if (existing.isPresent()) { repository.delete(existing.get()); return false; }
        ChatReaction r = new ChatReaction();
        r.setKind(kind); r.setMessageId(messageId); r.setReactor(reactor); r.setEmoji(emoji); r.setCreatedAt(Instant.now());
        repository.save(r);
        return true;
    }

    // 메시지 ID → (이모지 → 단 사람들). 이모지 순서는 EMOJI를 따른다
    public Map<Long, Map<String, LinkedHashSet<String>>> load(String kind, Collection<Long> messageIds) {
        Map<Long, Map<String, LinkedHashSet<String>>> out = new HashMap<>();
        if (messageIds.isEmpty()) return out;
        for (ChatReaction r : repository.findByKindAndMessageIdInOrderByIdAsc(kind, messageIds)) {
            out.computeIfAbsent(r.getMessageId(), k -> new TreeMap<>(Comparator.comparingInt(EMOJI::indexOf)))
                    .computeIfAbsent(r.getEmoji(), k -> new LinkedHashSet<>()).add(r.getReactor());
        }
        return out;
    }

    public static Map<String, LinkedHashSet<String>> emptyFor() {
        return new TreeMap<>(Comparator.comparingInt(EMOJI::indexOf));
    }

    public void deleteFor(String kind, Long messageId) { repository.deleteByKindAndMessageId(kind, messageId); }
}
