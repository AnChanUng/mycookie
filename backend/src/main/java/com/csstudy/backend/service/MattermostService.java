package com.csstudy.backend.service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

// 장애와 사용자 제보 같은 운영 알림만 전달한다. 학습 콘텐츠는 이메일 구독으로 제공한다.
@Service
public class MattermostService {
    private final RestTemplate http;
    private final String webhookUrl;
    private final String baseUrl;
    public MattermostService(RestTemplate http,
            @Value("${app.mattermost.webhook-url:}") String webhookUrl,
            @Value("${app.base-url:http://localhost:3000}") String baseUrl) {
        this.http=http; this.webhookUrl=webhookUrl.trim(); this.baseUrl=baseUrl.replaceAll("/+$", "");
    }
    public boolean enabled() { return !webhookUrl.isEmpty(); }
    /** 운영 알림(제보 접수 등)을 채널에 올린다. 꺼져 있으면 false, 보내다 실패하면 예외를 던진다(호출한 쪽이 다시 시도). */
    public boolean postNotice(String text) {
        if (!enabled()) return false;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        http.postForEntity(webhookUrl, new HttpEntity<>(Map.of("username", "나의쿠키", "text", text), headers), String.class);
        return true;
    }

    public String baseUrl() { return baseUrl; }

}
