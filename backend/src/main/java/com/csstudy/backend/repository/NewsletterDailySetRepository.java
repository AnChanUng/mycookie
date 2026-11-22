package com.csstudy.backend.repository;

import com.csstudy.backend.entity.NewsletterDailySet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NewsletterDailySetRepository extends JpaRepository<NewsletterDailySet, Long> {
    Optional<NewsletterDailySet> findByDayNo(int dayNo);
}
