package com.csstudy.backend.repository;

import com.csstudy.backend.entity.DevLogHeader;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DevLogHeaderRepository extends JpaRepository<DevLogHeader, Long> {
    Optional<DevLogHeader> findFirstByOrderByIdAsc();
}
