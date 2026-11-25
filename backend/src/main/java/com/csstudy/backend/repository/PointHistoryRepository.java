package com.csstudy.backend.repository;

import com.csstudy.backend.entity.PointHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Long> {
    List<PointHistory> findTop30ByUserIdOrderByIdDesc(Long userId);
}
