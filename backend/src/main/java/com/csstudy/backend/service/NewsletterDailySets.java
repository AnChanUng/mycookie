package com.csstudy.backend.service;

import com.csstudy.backend.entity.NewsletterDailySet;
import com.csstudy.backend.repository.NewsletterDailySetRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

// 오늘의 학습 세트(오늘의 문제 + 관련 기술블로그). 원본은 newsletter/daily-sets.json이고,
// 서버가 뜰 때 DB(newsletter_daily_sets)에 day 기준으로 넣거나 고친다. 발송할 때는 DB에서 읽는다
@Slf4j
@Component
public class NewsletterDailySets {

    public record Question(String title, String context, String code, String prompt, List<String> options, int answer, List<String> explanation) {}
    public record FollowUp(String question, String answer) {}
    public record Cs(String title, List<String> body, List<String> points, FollowUp followUp) {}
    // 문제와 이어지는 기업 기술블로그 글(수집 대상 회사의 실제 글). 없으면 발송할 때 수집해 둔 글(news_articles)에서 고른다
    public record Blog(String company, String title, String url, String published, String note) {}
    // cs(오늘의 CS)는 선택 항목이다. 지금 세트는 문제 → 관련 기술블로그 → 정답과 해설로 구성한다
    // practice: 메일의 "더 공부하기"로 들어와 푸는 그날 주제의 연습 문제(5개). 메일 문제와 같은 모양이다
    // concepts: 이 문제에 나온 개념의 slug(newsletter/concepts.json). 메일에는 한 줄 정리와 개념 페이지 링크로 들어간다
    public record DailySet(int day, String theme, Question question, Cs cs, Blog blog, List<Question> practice, List<String> concepts) {}

    static final String RESOURCE = "newsletter/daily-sets.json";
    static final int PRACTICE_SIZE = 5;
    static final int CONCEPTS_MAX = 5;

    private final NewsletterDailySetRepository repository;
    private final ObjectMapper json;

    public NewsletterDailySets(NewsletterDailySetRepository repository, ObjectMapper json) {
        this.repository = repository;
        this.json = json;
    }

    /** 원본 파일의 세트를 읽고 모양을 확인한다. 잘못된 세트가 있으면 서버가 뜨지 않게 예외를 던진다. */
    List<DailySet> source() throws IOException {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            List<DailySet> sets = json.readValue(in, new TypeReference<List<DailySet>>() {});
            for (DailySet set : sets) validate(set);
            return sets;
        }
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() throws IOException {
        int changed = 0;
        for (DailySet set : source()) {
            String content = json.writeValueAsString(set);
            NewsletterDailySet row = repository.findByDayNo(set.day()).orElse(null);
            if (row == null) row = NewsletterDailySet.builder().dayNo(set.day()).content(content).build();
            else if (sameContent(row.getContent(), content)) continue;
            else row.setContent(content);
            repository.save(row);
            changed++;
        }
        if (changed > 0) log.info("오늘의 학습 세트 {}개를 DB에 반영", changed);
    }

    /** day번째 세트(1부터). 없거나 읽을 수 없으면 비어 있다. */
    public Optional<DailySet> find(int day) {
        return repository.findByDayNo(day).flatMap(row -> {
            try {
                return Optional.of(json.readValue(row.getContent(), DailySet.class));
            } catch (IOException e) {
                log.error("오늘의 학습 세트 {}번을 읽지 못했습니다", day);
                return Optional.empty();
            }
        });
    }

    /** DB에 있는 모든 세트(day 순). 읽을 수 없는 세트는 건너뛴다. */
    public List<DailySet> all() {
        return repository.findAll(Sort.by("dayNo")).stream().map(row -> {
            try {
                return json.readValue(row.getContent(), DailySet.class);
            } catch (IOException e) {
                log.error("오늘의 학습 세트 {}번을 읽지 못했습니다", row.getDayNo());
                return null;
            }
        }).filter(Objects::nonNull).toList();
    }

    private boolean sameContent(String a, String b) {
        try {
            JsonNode left = json.readTree(a), right = json.readTree(b);
            return left.equals(right);
        } catch (IOException e) {
            return false;
        }
    }

    static void validate(DailySet set) {
        String where = "오늘의 학습 세트 " + set.day() + "번: ";
        if (set.day() < 1) throw new IllegalStateException(where + "day는 1부터");
        Question q = set.question();
        if (q == null || blank(q.title()) || blank(q.prompt()) || q.options() == null || q.options().size() != 4
                || q.options().stream().anyMatch(NewsletterDailySets::blank) || q.options().stream().distinct().count() != 4
                || q.answer() < 0 || q.answer() > 3 || q.explanation() == null || q.explanation().isEmpty()) {
            throw new IllegalStateException(where + "문제는 제목, 질문, 서로 다른 보기 4개, 정답(0~3), 해설이 필요합니다");
        }
        if (set.practice() != null) {
            if (set.practice().size() != PRACTICE_SIZE) throw new IllegalStateException(where + "연습 문제는 " + PRACTICE_SIZE + "개여야 합니다");
            for (int i = 0; i < set.practice().size(); i++) {
                Question p = set.practice().get(i);
                if (p == null || blank(p.title()) || blank(p.prompt()) || p.options() == null || p.options().size() != 4
                        || p.options().stream().anyMatch(NewsletterDailySets::blank) || p.options().stream().distinct().count() != 4
                        || p.answer() < 0 || p.answer() > 3 || p.explanation() == null || p.explanation().isEmpty()) {
                    throw new IllegalStateException(where + "연습 문제 " + (i + 1) + "번은 제목, 질문, 서로 다른 보기 4개, 정답(0~3), 해설이 필요합니다");
                }
            }
        }
        List<String> concepts = set.concepts();
        if (concepts != null && (concepts.isEmpty() || concepts.size() > CONCEPTS_MAX || concepts.stream().distinct().count() != concepts.size()
                || concepts.stream().anyMatch(slug -> !NewsletterConcepts.validSlug(slug)))) {
            throw new IllegalStateException(where + "개념은 서로 다른 slug 1~" + CONCEPTS_MAX + "개여야 합니다");
        }
        Cs cs = set.cs();
        if (cs != null && (blank(cs.title()) || cs.body() == null || cs.body().isEmpty() || cs.points() == null || cs.points().isEmpty())) {
            throw new IllegalStateException(where + "오늘의 CS를 넣으려면 제목, 본문, 핵심 정리가 필요합니다");
        }
        Blog blog = set.blog();
        if (blog != null && (blank(blog.company()) || blank(blog.title()) || blog.url() == null || !blog.url().startsWith("https://"))) {
            throw new IllegalStateException(where + "기술블로그는 회사, 제목, https 주소가 필요합니다");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
