package com.csstudy.backend.controller;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.service.NewsletterConcepts;
import com.csstudy.backend.service.NewsletterDailySets;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// 학습 메일의 개념 링크(/concepts/{slug})로 들어오는 개념 설명 페이지가 쓰는 API. 메일 본문과 같은 공개 학습 자료라 로그인 없이 읽는다
@RestController
@RequestMapping("/api/v1/concepts")
@RequiredArgsConstructor
public class ConceptController {

    private final NewsletterConcepts concepts;
    private final NewsletterDailySets sets;

    public record SetRef(int day, String theme, String title) {}
    public record ConceptRef(String slug, String term) {}

    @GetMapping("/{slug}")
    public ResponseEntity<Map<String, Object>> concept(@PathVariable String slug) {
        NewsletterConcepts.Concept concept = concepts.find(slug)
                .orElseThrow(() -> new CookieException(CookieErrorCode.NEWSLETTER_CONCEPT_NOT_FOUND));
        // 이 개념이 나온 문제와, 같은 문제에 함께 나온 다른 개념
        List<SetRef> appeared = new ArrayList<>();
        Set<String> relatedSlugs = new LinkedHashSet<>();
        for (NewsletterDailySets.DailySet set : sets.all()) {
            if (set.concepts() == null || !set.concepts().contains(concept.slug())) continue;
            appeared.add(new SetRef(set.day(), set.theme(), set.question().title()));
            for (String other : set.concepts()) if (!other.equals(concept.slug())) relatedSlugs.add(other);
        }
        List<ConceptRef> related = concepts.findAll(List.copyOf(relatedSlugs)).stream()
                .map(c -> new ConceptRef(c.slug(), c.term())).toList();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("slug", concept.slug());
        body.put("term", concept.term());
        body.put("summary", concept.summary());
        body.put("body", concept.body());
        body.put("deeper", concept.deeper());
        body.put("sources", concept.sources());
        body.put("sets", appeared);
        body.put("related", related);
        return ResponseEntity.ok().cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic()).body(body);
    }
}
