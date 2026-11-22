package com.csstudy.backend.news;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 기업 소식 목록. 최신순으로 20개씩(기본) 보여 주고 page를 올리면 더 오래된 글이 나온다
@RestController
@RequestMapping("/api/v1/news")
@RequiredArgsConstructor
public class NewsController {

    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 50;
    private static final int MAX_PAGE = 100;

    private final NewsArticleRepository articles;

    public record Row(Long id, String company, String source, String title, String url, String summary, Instant publishedAt) {}

    @GetMapping
    public Map<String, Object> list(@RequestParam(required = false) String company,
                                    @RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        if (company != null && !company.isBlank() && !NewsSources.companies().contains(company)) {
            throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        }
        int safePage = Math.max(0, Math.min(page, MAX_PAGE));
        int safeSize = Math.max(1, Math.min(size, MAX_SIZE));
        PageRequest request = PageRequest.of(safePage, safeSize, Sort.by(Sort.Order.desc("publishedAt"), Sort.Order.desc("id")));
        Page<NewsArticle> result = company == null || company.isBlank() ? articles.findAll(request) : articles.findByCompany(company, request);

        List<Row> rows = result.getContent().stream()
                .map(a -> new Row(a.getId(), a.getCompany(), a.getSourceName(), a.getTitle(), a.getUrl(), a.getSummary(), a.getPublishedAt()))
                .toList();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", rows);
        out.put("page", safePage);
        out.put("size", safeSize);
        out.put("total", result.getTotalElements());
        out.put("hasMore", result.hasNext());
        out.put("companies", NewsSources.companies());
        return out;
    }
}
