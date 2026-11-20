package com.csstudy.backend.repository;

import com.csstudy.backend.entity.DevLogEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DevLogEntryRepository extends JpaRepository<DevLogEntry, Long> {
    Optional<DevLogEntry> findByLogDate(LocalDate logDate);
    List<DevLogEntry> findTop60ByOrderByLogDateDesc();
}
