package com.csstudy.backend.news;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

// 기업 소식 목록. 최신순으로 20개씩(기본) 보여 주고 page를 올리면 더 오래된 글이 나온다.
// kind=tech이면 기술 블로그만, kind=newsroom이면 뉴스룸만 보여 주고, q를 주면 제목에 그 말이 든 글만 찾는다
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private static final int MAX_SIZE = 50;
    private static final int MAX_PAGE = 100;
    private static final int MAX_QUERY = 50;

    private final NewsArticleRepository articles;

    public record Row(Long id, String company, String source, String title, String url, String summary, Instant publishedAt) {}

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String company,
                                    @RequestParam(required = false) String kind,
                                    @RequestParam(required = false) String q,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        NewsSources.Kind sourceKind = parseKind(kind);
        List<String> companies = sourceKind == null ? NewsSources.companies() : NewsSources.companies(sourceKind);
        String companyName = company == null || company.isBlank() ? null : company.trim();
        if (companyName != null && !companies.contains(companyName)) {
            throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        }
        String query = q == null ? "" : q.strip();
        if (query.codePointCount(0, query.length()) > MAX_QUERY) {
            throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        }

        Specification<NewsArticle> where = (root, cq, cb) -> cb.conjunction();
        if (sourceKind != null) {
            List<String> keys = NewsSources.keys(sourceKind);
            where = where.and((root, cq, cb) -> root.get("sourceKey").in(keys));
        }
        if (companyName != null) {
            where = where.and((root, cq, cb) -> cb.equal(root.get("company"), companyName));
        }
        if (!query.isEmpty()) {
            String pattern = "%" + escapeLike(query.toLowerCase(Locale.ROOT)) + "%";
            where = where.and((root, cq, cb) -> cb.like(cb.lower(root.get("title")), pattern, '\\'));
        }

        int safePage = Math.max(0, Math.min(page, MAX_PAGE));
        int safeSize = Math.max(1, Math.min(size, MAX_SIZE));
        PageRequest request = PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("id")));
        Page<NewsArticle> result = articles.findAll(where, request);

        List<Row> rows = result.getContent().stream()
                .map(a -> new Row(a.getId(), a.getCompany(), a.getSourceName(), a.getTitle(), a.getUrl(), a.getSummary(), a.getPublishedAt()))
                .toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", rows);
        out.put("page", safePage);
        out.put("size", safeSize);
        out.put("total", result.getTotalElements());
        out.put("hasMore", result.hasNext());
        out.put("companies", companies);
        return out;
    }

    private static NewsSources.Kind parseKind(String kind) {
        if (kind == null || kind.isBlank()) return null;
        return switch (kind.trim().toLowerCase(Locale.ROOT)) {
            case "tech" -> NewsSources.Kind.TECH;
            case "newsroom" -> NewsSources.Kind.NEWSROOM;
            default -> throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        };
    }

    // LIKE에서 특별한 뜻을 가진 %, _와 이스케이프 문자 자체를 글자 그대로 찾게 한다
    static String escapeLike(String raw) {
        return raw.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
