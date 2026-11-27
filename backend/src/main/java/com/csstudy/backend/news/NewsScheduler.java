package com.csstudy.backend.news;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.CompletableFuture;

// 하루에 한 번(기본 오전 7시, 한국 시간) 기업 소식을 모은다. 서버를 켰을 때 아직 글이 하나도 없는 소스(새로 추가한 곳)는 그곳만 바로 모아 둔다.
// NEWS_ENABLED=false이면 외부 요청을 하지 않는다(app.news.enabled)
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.news.enabled", havingValue = "true")
public class NewsScheduler {

    private final NewsCollector collector;
    private final NewsArticleRepository articles;

    @Scheduled(cron = "${app.news.cron:0 0 7 * * *}", zone = "Asia/Seoul")
    public void daily() {
        collector.collectAll();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void firstRun() {
        List<NewsSources.Source> empty = NewsSources.ALL.stream().filter(s -> !articles.existsBySourceKey(s.key())).toList();
        if (empty.isEmpty()) return;
        // 시작이 늦어지지 않게 따로 돌린다
        CompletableFuture.runAsync(() -> collector.collect(empty)).exceptionally(e -> {
            log.warn("처음 기업 소식 수집이 실패했습니다: {}", e.getClass().getSimpleName());
            return null;
        });
    }
}
