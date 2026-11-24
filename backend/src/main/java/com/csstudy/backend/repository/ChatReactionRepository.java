package com.csstudy.backend.repository;

import com.csstudy.backend.entity.ChatReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

public interface ChatReactionRepository extends JpaRepository<ChatReaction, Long> {
    List<ChatReaction> findByKindAndMessageIdInOrderByIdAsc(String kind, Collection<Long> messageIds);
    Optional<ChatReaction> findByKindAndMessageIdAndReactorAndEmoji(String kind, Long messageId, String reactor, String emoji);
    @Modifying @Transactional
    void deleteByKindAndMessageId(String kind, Long messageId);
}
