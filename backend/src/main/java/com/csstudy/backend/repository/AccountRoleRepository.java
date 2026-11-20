package com.csstudy.backend.repository;

import com.csstudy.backend.entity.AccountRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AccountRoleRepository extends JpaRepository<AccountRole, Long> {
    List<AccountRole> findByUserId(Long userId);
    Optional<AccountRole> findByUserIdAndRole(Long userId, AccountRole.Role role);
    boolean existsByUserIdAndRole(Long userId, AccountRole.Role role);
}
