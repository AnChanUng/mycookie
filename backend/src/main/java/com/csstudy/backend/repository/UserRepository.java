package com.csstudy.backend.repository;

import com.csstudy.backend.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByNickname(String nickname);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.nickname = :nickname")
    Optional<User> findByNicknameForUpdate(@Param("nickname") String nickname);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findForUpdate(@Param("id") Long id);

    boolean existsByNickname(String nickname);

    List<User> findTop9ByNicknameContainingIgnoreCaseOrderByNicknameAsc(String part);

    List<User> findByNicknameIn(java.util.Collection<String> nicknames);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByOrderByIdDesc(Pageable pageable);

    long countByCreatedAtGreaterThanEqual(LocalDateTime since);
}
