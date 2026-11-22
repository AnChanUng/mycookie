package com.csstudy.backend.service;

import com.csstudy.backend.entity.AdminAuditLog;
import com.csstudy.backend.repository.AdminAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;

// 관리자 작업을 남긴다. 기록이 실패해도 작업 자체는 막지 않는다
@Service
@RequiredArgsConstructor
public class AdminAudit {

    public static final String KEY_ACTOR = "홈서버(관리자 키)";

    private final AdminAuditLogRepository logs;

    public void record(String actor, String action, String target) {
        try {
            logs.save(AdminAuditLog.builder().at(Instant.now()).actor(cut(actor, 60)).action(cut(action, 40)).target(cut(target, 120)).build());
        } catch (RuntimeException ignored) {
            // 기록 실패가 계정 작업을 되돌리지 않게 한다
        }
    }

    private static String cut(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max);
    }
}
