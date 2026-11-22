package com.csstudy.backend.repository;

import com.csstudy.backend.entity.OwnerDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OwnerDocumentRepository extends JpaRepository<OwnerDocument, String> {
}
