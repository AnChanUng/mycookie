package com.csstudy.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;

// 토스페이먼츠 결제 승인. 클라이언트 키는 화면에 공개되고, 시크릿 키는 서버에만 둔다.
// 개발 중에는 test_ck_ · test_sk_ 로 시작하는 테스트 키를 쓴다(실제 돈이 나가지 않는다)
@Component
public class TossPaymentsClient {

    public record Approval(String status, String orderId, long totalAmount, String method) {}

    private final RestTemplate http;
    private final ObjectMapper json;
    private final String clientKey;
    private final String secretKey;

    public TossPaymentsClient(RestTemplate http, ObjectMapper json,
                              @Value("${app.payment.toss.client-key:}") String clientKey,
                              @Value("${app.payment.toss.secret-key:}") String secretKey) {
        this.http = http;
        this.json = json;
        this.clientKey = clientKey == null ? "" : clientKey.trim();
        this.secretKey = secretKey == null ? "" : secretKey.trim();
    }

    public boolean enabled() { return !clientKey.isBlank() && !secretKey.isBlank(); }

    public String clientKey() { return clientKey; }

    /** 결제창에서 돌아온 결제를 최종 승인한다. 승인 전에는 돈이 빠져나가지 않는다. */
    public Approval confirm(String paymentKey, String orderId, long amount) {
        HttpHeaders headers = new HttpHeaders();
        headers.set(HttpHeaders.AUTHORIZATION, "Basic " + Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8)));
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        // 같은 주문을 다시 보내도 한 번만 처리되게 한다
        headers.set("Idempotency-Key", orderId);
        try {
            JsonNode res = http.postForObject("https://api.tosspayments.com/v1/payments/confirm",
                    new HttpEntity<>(Map.of("paymentKey", paymentKey, "orderId", orderId, "amount", amount), headers), JsonNode.class);
            if (res == null) throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "결제 승인 응답을 받지 못했습니다.");
            return new Approval(res.path("status").asText(""), res.path("orderId").asText(""),
                    res.path("totalAmount").asLong(-1), res.path("method").asText(null));
        } catch (HttpStatusCodeException e) {
            // 토스가 주는 안내 문구(예: 카드 한도 초과)를 그대로 보여 준다
            String message = "결제를 승인하지 못했습니다.";
            try { message = json.readTree(e.getResponseBodyAsString()).path("message").asText(message); } catch (Exception ignored) { /* 기본 문구 */ }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        } catch (RestClientException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "결제사와 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
    }
}
