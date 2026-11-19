package com.csstudy.backend.repository;

import com.csstudy.backend.entity.TierPurchase;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TierPurchaseRepository extends JpaRepository<TierPurchase, Long> {

    // 같은 주문을 두 번 승인하지 않도록 잠그고 읽는다
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from TierPurchase p where p.orderId = :orderId")
    Optional<TierPurchase> findByOrderIdForUpdate(@Param("orderId") String orderId);

    List<TierPurchase> findByUserIdAndStatusOrderByIdDesc(Long userId, TierPurchase.Status status);
}
