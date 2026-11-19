package com.csstudy.backend;

import com.csstudy.backend.entity.TierPurchase;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.repository.TierPurchaseRepository;
import com.csstudy.backend.repository.UserRepository;
import com.csstudy.backend.service.TossPaymentsClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "app.payment.open=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TierPurchaseTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired TierPurchaseRepository purchases;
    @MockitoBean TossPaymentsClient toss;

    @BeforeEach
    void setUp() {
        when(toss.enabled()).thenReturn(true);
        when(toss.clientKey()).thenReturn("test_ck_dummy");
    }

    private JsonNode read(ResultActions r) throws Exception { return json.readTree(r.andReturn().getResponse().getContentAsString()); }

    private ResultActions postJson(String path, Object body, String token) throws Exception {
        var req = post(path).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        return mvc.perform(token == null ? req : req.header("Authorization", "Bearer " + token));
    }

    // 새로 가입한 계정은 동 쿠키에서 시작한다
    private String register(String name) throws Exception {
        return read(postJson("/api/v1/auth/register", Map.of("nickname", name, "password", "pw-1234"), null).andExpect(status().isOk()))
                .path("token").asText();
    }

    private JsonNode order(String token, String tier) throws Exception {
        return read(postJson("/api/v1/payments/tier/order", Map.of("tier", tier), token).andExpect(status().isOk()));
    }

    @Test
    void paidTierBecomesMinimumTierAndSecondConfirmDoesNotChargeAgain() throws Exception {
        String token = register("pay-ok");
        mvc.perform(get("/api/v1/payments/tier/products")).andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.products[0].tier").value("SILVER"));

        JsonNode order = order(token, "DIAMOND");
        String orderId = order.path("orderId").asText();
        assertThat(order.path("amount").asLong()).isEqualTo(19_900L);
        when(toss.confirm("pk-1", orderId, 19_900L)).thenReturn(new TossPaymentsClient.Approval("DONE", orderId, 19_900L, "카드"));

        postJson("/api/v1/payments/tier/confirm", Map.of("paymentKey", "pk-1", "orderId", orderId, "amount", 19_900), token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.membership.tier").value("DIAMOND"))
                .andExpect(jsonPath("$.membership.solvedCount").value(0));

        // 같은 결제를 다시 승인해도 토스를 또 부르지 않는다
        postJson("/api/v1/payments/tier/confirm", Map.of("paymentKey", "pk-1", "orderId", orderId, "amount", 19_900), token)
                .andExpect(status().isOk());
        verify(toss, times(1)).confirm(anyString(), anyString(), anyLong());

        // 이미 다이아라서 같은 등급 · 낮은 등급은 살 수 없다
        postJson("/api/v1/payments/tier/order", Map.of("tier", "GOLD"), token).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.membership.tier").value("DIAMOND"));
    }

    @Test
    void tamperedAmountOtherUsersOrderAndFailedPaymentGrantNothing() throws Exception {
        String token = register("pay-tamper");
        String other = register("pay-other");
        String orderId = order(token, "RUBY").path("orderId").asText();

        // 금액을 바꿔 보내면 토스에 보내기 전에 거절
        postJson("/api/v1/payments/tier/confirm", Map.of("paymentKey", "pk", "orderId", orderId, "amount", 100), token)
                .andExpect(status().isBadRequest());
        // 남의 주문은 찾을 수 없다
        postJson("/api/v1/payments/tier/confirm", Map.of("paymentKey", "pk", "orderId", orderId, "amount", 49_900), other)
                .andExpect(status().isNotFound());
        verify(toss, never()).confirm(anyString(), anyString(), anyLong());

        // 토스가 거절하면 등급은 그대로
        when(toss.confirm(anyString(), eq(orderId), eq(49_900L)))
                .thenThrow(new ResponseStatusException(HttpStatus.BAD_REQUEST, "카드 한도 초과"));
        postJson("/api/v1/payments/tier/confirm", Map.of("paymentKey", "pk", "orderId", orderId, "amount", 49_900), token)
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.membership.tier").value("BRONZE"));
        assertThat(purchases.findAll()).filteredOn(p -> p.getOrderId().equals(orderId))
                .singleElement().extracting(TierPurchase::getStatus).isEqualTo(TierPurchase.Status.READY);

        // 로그인하지 않으면 주문할 수 없다
        postJson("/api/v1/payments/tier/order", Map.of("tier", "SILVER"), null).andExpect(status().isUnauthorized());
        User saved = users.findByNickname("pay-tamper").orElseThrow();
        assertThat(saved.getBaseTier()).isEqualTo(UserTier.BRONZE);
    }

    @Test
    void ordersAreRefusedWhenPaymentKeysAreMissing() throws Exception {
        when(toss.enabled()).thenReturn(false);
        String token = register("pay-off");
        mvc.perform(get("/api/v1/payments/tier/products")).andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.clientKey").value(""));
        postJson("/api/v1/payments/tier/order", Map.of("tier", "SILVER"), token).andExpect(status().isServiceUnavailable());
    }
}
