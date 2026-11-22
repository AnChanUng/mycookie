package com.csstudy.backend.repository;

import com.csstudy.backend.entity.NewsletterSubscriber;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NewsletterSubscriberRepository extends JpaRepository<NewsletterSubscriber, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from NewsletterSubscriber s where s.email = :email")
    Optional<NewsletterSubscriber> findByEmailForUpdate(@Param("email") String email);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from NewsletterSubscriber s where s.confirmHash = :hash")
    Optional<NewsletterSubscriber> findByConfirmHashForUpdate(@Param("hash") String hash);

    Optional<NewsletterSubscriber> findByUnsubscribeKey(String key);

    // 확인 링크가 만료된 미확인 신청 삭제(예전에 수신 거부로 남겨 둔 행도 함께 정리)
    @Modifying
    @Query("delete from NewsletterSubscriber s where (s.status = com.csstudy.backend.entity.NewsletterSubscriber.Status.PENDING "
            + "and (s.confirmSentAt is null or s.confirmSentAt < :before)) "
            + "or s.status = com.csstudy.backend.entity.NewsletterSubscriber.Status.UNSUBSCRIBED")
    int deleteUnconfirmedBefore(@Param("before") LocalDateTime before);

    // 오늘 아직 받지 않은 구독자. 오래 못 받은 사람부터
    @Query("select s from NewsletterSubscriber s where s.status = com.csstudy.backend.entity.NewsletterSubscriber.Status.ACTIVE "
            + "and (s.lastSentOn is null or s.lastSentOn < :today) order by s.lastSentOn asc nulls first, s.id asc")
    List<NewsletterSubscriber> dueOn(@Param("today") LocalDate today, Pageable page);
}
