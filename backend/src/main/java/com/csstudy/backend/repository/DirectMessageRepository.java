package com.csstudy.backend.repository;
import com.csstudy.backend.entity.DirectMessage;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;
public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {
    List<DirectMessage> findTop100ByThreadIdOrderByIdDesc(Long id);
    Optional<DirectMessage> findBySenderIdAndClientId(Long sender, String client);
    Optional<DirectMessage> findTopBySenderIdOrderByIdDesc(Long sender);
    Optional<DirectMessage> findTopByThreadIdOrderByIdDesc(Long thread);
    long countByThreadIdAndSenderIdNotAndReadAtIsNull(Long thread, Long sender);
    @Modifying
    @Query("update DirectMessage m set m.readAt=:at where m.threadId=:thread and m.senderId<>:me and m.readAt is null and m.id<=:last")
    void markRead(@Param("thread") Long thread, @Param("me") Long me, @Param("last") Long last, @Param("at") Instant at);
}
