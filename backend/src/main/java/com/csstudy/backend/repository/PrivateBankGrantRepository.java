package com.csstudy.backend.repository;

import com.csstudy.backend.entity.PrivateBankGrant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PrivateBankGrantRepository extends JpaRepository<PrivateBankGrant, Long> {
    boolean existsByUserId(Long userId);
    Optional<PrivateBankGrant> findByUserId(Long userId);
    List<PrivateBankGrant> findAllByOrderByGrantedAtDesc();
}
