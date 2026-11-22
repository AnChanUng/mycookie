package com.csstudy.backend.news;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

// 일주일에 한 번(기본 월요일 오전 7시, 한국 시간) 기업 소식을 모은다. 처음 켰을 때 글이 하나도 없으면 한 번 바로 모아 둔다.
// NEWS_ENABLED=false이면 외부 요청을 하지 않는다(app.news.enabled)
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.news.enabled", havingValue = "true")
public class NewsScheduler {

    private final NewsCollector collector;
    private final NewsArticleRepository articles;

    @Scheduled(cron = "${app.news.cron:0 0 7 * * MON}", zone = "Asia/Seoul")
    public void weekly() {
        collector.collectAll();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void firstRun() {
        if (articles.count() > 0) return;
        // 시작이 늦어지지 않게 따로 돌린다
        CompletableFuture.runAsync(collector::collectAll).exceptionally(e -> {
            log.warn("처음 기업 소식 수집이 실패했습니다: {}", e.getClass().getSimpleName());
            return null;
        });
    }
}
