package com.csstudy.backend.repository;

import com.csstudy.backend.entity.UserItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface UserItemRepository extends JpaRepository<UserItem, Long> {
    List<UserItem> findByUserId(Long userId);
    boolean existsByUserIdAndItemKey(Long userId, String itemKey);
}
