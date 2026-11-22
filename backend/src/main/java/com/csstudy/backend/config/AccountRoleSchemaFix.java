package com.csstudy.backend.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Hibernate가 처음 만든 account_roles 표에는 그때 있던 권한(ADMIN, OWNER, TEAM)만 받는 CHECK 조건이 붙는다.
// ddl-auto: update는 이 조건을 고치지 않으므로, 새 권한(BANK)을 넣을 수 있게 시작할 때 조건을 지운다.
// 값은 enum으로만 들어오므로 조건이 없어도 엉뚱한 권한이 저장되지 않는다(마이그레이션 도구를 들이면 그쪽으로 옮긴다)
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class AccountRoleSchemaFix implements ApplicationRunner {

    private final JdbcTemplate jdbc;

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute("ALTER TABLE account_roles DROP CONSTRAINT IF EXISTS account_roles_role_check");
        } catch (RuntimeException e) {
            log.warn("account_roles 권한 조건을 정리하지 못했습니다: {}", e.getClass().getSimpleName());
        }
    }
}
