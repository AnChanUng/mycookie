package com.csstudy.backend.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;

@Repository
public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long>, JpaSpecificationExecutor<NewsArticle> {

    boolean existsByUrlHash(String urlHash);

    // 새로 추가한 소스는 아직 글이 없으니 서버를 켤 때 한 번 바로 모은다
    boolean existsBySourceKey(String sourceKey);

    Page<NewsArticle> findByCompany(String company, Pageable pageable);

    // 학습 메일의 오늘의 기술블로그: 구독자가 마지막으로 받은 글 다음에 수집된 최근 글 하나
    Optional<NewsArticle> findFirstByIdGreaterThanAndPublishedAtAfterOrderByIdAsc(long id, Instant since);
}
