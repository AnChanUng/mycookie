package com.csstudy.backend.repository;

import com.csstudy.backend.entity.DailyPracticeStat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DailyPracticeStatRepository extends JpaRepository<DailyPracticeStat, Integer> {

    @Transactional
    @Modifying
    @Query("update DailyPracticeStat s set s.opens = s.opens + 1 where s.dayNo = :day")
    int addOpen(@Param("day") int day);

    @Transactional
    @Modifying
    @Query("update DailyPracticeStat s set s.finishes = s.finishes + 1 where s.dayNo = :day")
    int addFinish(@Param("day") int day);

    List<DailyPracticeStat> findAllByOrderByDayNoAsc();
}
