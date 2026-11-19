package com.csstudy.backend.repository;

import com.csstudy.backend.entity.SocialAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SocialAccountRepository extends JpaRepository<SocialAccount, Long> {

    Optional<SocialAccount> findByProviderAndProviderUserId(String provider, String providerUserId);

    boolean existsByUserIdAndProvider(Long userId, String provider);

    List<SocialAccount> findByUserId(Long userId);
}
