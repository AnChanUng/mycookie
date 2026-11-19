package com.csstudy.backend.repository;

import com.csstudy.backend.entity.EmailToken;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {

    // 같은 링크를 두 번 눌러도 한 번만 쓰이게 행을 잠근다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from EmailToken t join fetch t.user where t.tokenHash = :hash")
    Optional<EmailToken> findForUpdate(@Param("hash") String hash);

    Optional<EmailToken> findTopByUserIdAndPurposeOrderByCreatedAtDesc(Long userId, EmailToken.Purpose purpose);

    @Modifying
    @Query("delete from EmailToken t where t.user.id = :userId and t.purpose = :purpose")
    void deleteFor(@Param("userId") Long userId, @Param("purpose") EmailToken.Purpose purpose);

    @Modifying
    @Query("delete from EmailToken t where t.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
