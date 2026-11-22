package com.csstudy.backend.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {

    boolean existsByUrlHash(String urlHash);

    Page<NewsArticle> findByCompany(String company, Pageable pageable);

    // 학습 메일의 오늘의 기술블로그: 구독자가 마지막으로 받은 글 다음에 수집된 최근 글 하나
    Optional<NewsArticle> findFirstByIdGreaterThanAndPublishedAtAfterOrderByIdAsc(long id, Instant since);
}
