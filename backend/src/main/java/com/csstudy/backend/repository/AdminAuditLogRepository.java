package com.csstudy.backend.repository;

import com.csstudy.backend.entity.AdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {

    List<AdminAuditLog> findTop100ByOrderByIdDesc();
}
