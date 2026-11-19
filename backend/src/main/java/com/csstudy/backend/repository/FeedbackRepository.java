package com.csstudy.backend.repository;

import com.csstudy.backend.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    // 한 방문자가 하루에 보낼 수 있는 제보 수를 막는 데 쓴다
    long countByVisitorIdAndDay(String visitorId, LocalDate day);

    // 사이트 전체 하루 상한(스팸으로 이슈 목록이 덮이지 않게)
    long countByDay(LocalDate day);
}
