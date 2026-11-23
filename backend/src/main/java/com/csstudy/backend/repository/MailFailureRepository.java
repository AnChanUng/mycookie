package com.csstudy.backend.repository;

import com.csstudy.backend.entity.MailFailure;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface MailFailureRepository extends JpaRepository<MailFailure, Long> {

    List<MailFailure> findTop100ByOrderByIdDesc();

    long countByAtAfter(Instant since);

    @Query("select f.kind, count(f) from MailFailure f where f.at > :since group by f.kind")
    List<Object[]> countByKindSince(@Param("since") Instant since);

    // 최근 실패 원인 상위(많은 순)
    @Query("select f.reason, count(f) from MailFailure f where f.at > :since group by f.reason order by count(f) desc")
    List<Object[]> topReasonsSince(@Param("since") Instant since, org.springframework.data.domain.Pageable page);

    @Modifying
    @Query("delete from MailFailure f where f.at < :before")
    int deleteOlderThan(@Param("before") Instant before);
}
