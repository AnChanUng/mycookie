package com.csstudy.backend.service;

import com.csstudy.backend.entity.NewsletterConcept;
import com.csstudy.backend.repository.NewsletterConceptRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

// 학습 메일 문제에 나온 개념 정리. 원본은 newsletter/concepts.json이고, 서버가 뜰 때 DB(newsletter_concepts)에 slug 기준으로 넣거나 고친다.
// 메일에는 한 줄 정리(summary)와 개념 페이지 링크만 넣고, 자세한 설명은 개념 페이지가 DB에서 읽어 보여 준다
@Slf4j
@Component
public class NewsletterConcepts {

    // 근거 문서. 제목에 다루는 기술 버전(예: MySQL 8.0, Spring Framework 6.2)을 함께 적는다
    public record Source(String title, String url) {}
    // body: 자세한 설명 문단, deeper: 심화 학습 질문, sources: 근거가 되는 공식 문서
    public record Concept(String slug, String term, String summary, List<String> body, List<String> deeper, List<Source> sources) {}

    static final String RESOURCE = "newsletter/concepts.json";
    static final Pattern SLUG = Pattern.compile("[a-z0-9]+(-[a-z0-9]+)*");
    static final int SLUG_MAX = 80;
    static final int SUMMARY_MAX = 120;

    private final NewsletterConceptRepository repository;
    private final NewsletterDailySets dailySets;
    private final ObjectMapper json;

    public NewsletterConcepts(NewsletterConceptRepository repository, NewsletterDailySets dailySets, ObjectMapper json) {
        this.repository = repository;
        this.dailySets = dailySets;
        this.json = json;
    }

    /** 원본 파일의 개념을 읽고 모양을 확인한다. 잘못된 개념이 있거나 세트가 없는 개념을 가리키면 서버가 뜨지 않게 예외를 던진다. */
    List<Concept> source() throws IOException {
        List<Concept> concepts;
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            concepts = json.readValue(in, new TypeReference<List<Concept>>() {});
        }
        Set<String> slugs = new HashSet<>();
        for (Concept c : concepts) {
            validate(c);
            if (!slugs.add(c.slug())) throw new IllegalStateException("학습 메일 개념 " + c.slug() + "이 두 번 있습니다");
        }
        for (NewsletterDailySets.DailySet set : dailySets.source()) {
            if (set.concepts() == null) continue;
            for (String slug : set.concepts()) {
                if (!slugs.contains(slug)) throw new IllegalStateException("오늘의 학습 세트 " + set.day() + "번이 없는 개념 " + slug + "을 가리킵니다");
            }
        }
        return concepts;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() throws IOException {
        int changed = 0;
        for (Concept c : source()) {
            String content = json.writeValueAsString(c);
            NewsletterConcept row = repository.findBySlug(c.slug()).orElse(null);
            if (row == null) row = NewsletterConcept.builder().slug(c.slug()).build();
            else if (c.term().equals(row.getTerm()) && c.summary().equals(row.getSummary()) && sameContent(row.getContent(), content)) continue;
            row.setTerm(c.term());
            row.setSummary(c.summary());
            row.setContent(content);
            repository.save(row);
            changed++;
        }
        if (changed > 0) log.info("학습 메일 개념 정리 {}개를 DB에 반영", changed);
    }

    /** slug의 개념. 주소 모양이 아니거나, 없거나, 읽을 수 없으면 비어 있다. */
    public Optional<Concept> find(String slug) {
        if (!validSlug(slug)) return Optional.empty();
        return repository.findBySlug(slug).flatMap(this::read);
    }

    /** 세트에 적힌 순서대로 개념을 돌려준다. DB에 없는 개념은 건너뛴다. */
    public List<Concept> findAll(List<String> slugs) {
        if (slugs == null || slugs.isEmpty()) return List.of();
        Map<String, NewsletterConcept> rows = repository.findBySlugIn(slugs).stream()
                .collect(Collectors.toMap(NewsletterConcept::getSlug, Function.identity()));
        List<Concept> found = new ArrayList<>();
        for (String slug : slugs) {
            NewsletterConcept row = rows.get(slug);
            if (row != null) read(row).ifPresent(found::add);
        }
        return found;
    }

    static boolean validSlug(String slug) {
        return slug != null && slug.length() <= SLUG_MAX && SLUG.matcher(slug).matches();
    }

    private Optional<Concept> read(NewsletterConcept row) {
        try {
            return Optional.of(json.readValue(row.getContent(), Concept.class));
        } catch (IOException e) {
            log.error("학습 메일 개념 {}을 읽지 못했습니다", row.getSlug());
            return Optional.empty();
        }
    }

    private boolean sameContent(String a, String b) {
        try {
            JsonNode left = json.readTree(a), right = json.readTree(b);
            return left.equals(right);
        } catch (IOException e) {
            return false;
        }
    }

    static void validate(Concept c) {
        String where = "학습 메일 개념 " + (c.slug() == null ? "(slug 없음)" : c.slug()) + ": ";
        if (!validSlug(c.slug())) throw new IllegalStateException(where + "slug는 영문 소문자, 숫자, -만 씁니다(" + SLUG_MAX + "자 이하)");
        if (blank(c.term()) || c.term().length() > 120) throw new IllegalStateException(where + "용어 이름이 필요합니다(120자 이하)");
        if (blank(c.summary()) || c.summary().length() > SUMMARY_MAX) throw new IllegalStateException(where + "한 줄 정리는 " + SUMMARY_MAX + "자 이하로 씁니다");
        if (c.body() == null || c.body().isEmpty() || c.body().stream().anyMatch(NewsletterConcepts::blank)) throw new IllegalStateException(where + "자세한 설명이 필요합니다");
        if (c.deeper() == null || c.deeper().isEmpty() || c.deeper().stream().anyMatch(NewsletterConcepts::blank)) throw new IllegalStateException(where + "심화 학습 질문이 필요합니다");
        if (c.sources() == null || c.sources().isEmpty()
                || c.sources().stream().anyMatch(s -> s == null || blank(s.title()) || s.url() == null || !s.url().startsWith("https://"))) {
            throw new IllegalStateException(where + "근거 문서는 제목과 https 주소가 필요합니다");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
