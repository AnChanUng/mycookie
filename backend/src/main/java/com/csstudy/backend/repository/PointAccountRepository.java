package com.csstudy.backend.repository;

import com.csstudy.backend.entity.PointAccount;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PointAccountRepository extends JpaRepository<PointAccount, Long> {
    // 지급 · 구매는 같은 계정 줄을 잠그고 처리해 두 요청이 겹쳐도 두 번 주거나 잔액이 틀어지지 않게 한다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from PointAccount a where a.userId = :userId")
    Optional<PointAccount> findForUpdate(@Param("userId") Long userId);
}
