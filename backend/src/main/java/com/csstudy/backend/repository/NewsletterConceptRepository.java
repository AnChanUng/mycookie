package com.csstudy.backend.repository;

import com.csstudy.backend.entity.NewsletterConcept;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface NewsletterConceptRepository extends JpaRepository<NewsletterConcept, Long> {
    Optional<NewsletterConcept> findBySlug(String slug);

    List<NewsletterConcept> findBySlugIn(Collection<String> slugs);
}
