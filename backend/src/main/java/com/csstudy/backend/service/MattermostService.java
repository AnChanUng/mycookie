package com.csstudy.backend.service;

import com.csstudy.backend.entity.Question;
import com.csstudy.backend.entity.ScheduledPost;
import com.csstudy.backend.repository.QuestionRepository;
import com.csstudy.backend.repository.ScheduledPostRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Random;

// Mattermost 채널에 오늘의 CS 질문을 올린다(수신 웹훅). 웹훅 URL이 없으면 아무 일도 하지 않는다.
// 질문만 보내고 답은 사이트에서 확인하게 한다. 발송 기록을 DB에 남겨 같은 날 두 번 올리지 않는다
@Slf4j
@Service
public class MattermostService {

    static final String JOB = "mattermost-daily-cs";
    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    private final QuestionRepository questions;
    private final ScheduledPostRepository posts;
    private final RestTemplate http;
    private final String webhookUrl;
    private final String baseUrl;

    public MattermostService(QuestionRepository questions, ScheduledPostRepository posts, RestTemplate http,
                             @Value("${app.mattermost.webhook-url:}") String webhookUrl,
                             @Value("${app.base-url:http://localhost:3000}") String baseUrl) {
        this.questions = questions;
        this.posts = posts;
        this.http = http;
        this.webhookUrl = webhookUrl.trim();
        this.baseUrl = baseUrl.replaceAll("/+$", "");
    }

    public boolean enabled() {
        return !webhookUrl.isEmpty();
    }

    @Scheduled(cron = "${app.mattermost.cron:0 30 8 * * MON-FRI}", zone = "Asia/Seoul")
    public void scheduled() {
        postDaily(LocalDate.now(SEOUL));
    }

    /** 운영 알림(제보 접수 등)을 채널에 올린다. 꺼져 있으면 false, 보내다 실패하면 예외를 던진다(호출한 쪽이 다시 시도). */
    public boolean postNotice(String text) {
        if (!enabled()) return false;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        http.postForEntity(webhookUrl, new HttpEntity<>(Map.of("username", "나의쿠키", "text", text), headers), String.class);
        return true;
    }

    public String baseUrl() { return baseUrl; }

    /** 보냈으면 true. 이미 보낸 날이거나 꺼져 있으면 false. */
    public boolean postDaily(LocalDate date) {
        if (!enabled()) return false;
        List<Question> picked = pick(date);
        if (picked.isEmpty()) {
            log.warn("Mattermost 오늘의 CS: 보낼 질문이 없습니다");
            return false;
        }
        ScheduledPost claim;
        try {
            claim = posts.saveAndFlush(ScheduledPost.builder().job(JOB).runDate(date).build());
        } catch (DataIntegrityViolationException alreadySent) {
            return false;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            http.postForEntity(webhookUrl, new HttpEntity<>(Map.of("username", "나의쿠키", "text", message(date, picked)), headers), String.class);
            return true;
        } catch (Exception e) {
            // 실패하면 기록을 지워 다시 보낼 수 있게 한다
            posts.delete(claim);
            log.warn("Mattermost 오늘의 CS 발송 실패: {}", e.getMessage());
            return false;
        }
    }

    // 덜 공부한 질문 30개 중에서 날짜별로 정해진 3개를 고른다
    List<Question> pick(LocalDate date) {
        List<Question> pool = new ArrayList<>(questions.findLeastStudied(PageRequest.of(0, 30)));
        Collections.shuffle(pool, new Random(date.toEpochDay()));
        return pool.subList(0, Math.min(3, pool.size()));
    }

    String message(LocalDate date, List<Question> picked) {
        StringBuilder text = new StringBuilder("#### :books: 오늘의 CS 면접 질문 (")
                .append(date.getMonthValue()).append('/').append(date.getDayOfMonth()).append(")\n")
                .append("먼저 머릿속으로 답해 보고, 링크에서 모범 답안을 확인하세요.\n\n");
        for (int i = 0; i < picked.size(); i++) {
            Question q = picked.get(i);
            String category = q.getCategory() == null ? "CS" : q.getCategory().getName();
            text.append(i + 1).append(". **").append(q.getTitle()).append("** `").append(category).append("`  ")
                    .append('[').append("답 보기").append("](").append(baseUrl).append("/question/").append(q.getId()).append(")\n");
        }
        return text.append("\n[나의쿠키에서 더 풀기](").append(baseUrl).append(")").toString();
    }
}
