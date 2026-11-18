package com.csstudy.backend.repository;

import com.csstudy.backend.entity.ScheduledPost;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ScheduledPostRepository extends JpaRepository<ScheduledPost, Long> {
}
