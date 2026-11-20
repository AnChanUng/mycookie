package com.csstudy.backend;

import com.csstudy.backend.service.TossPaymentsClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// 결제 키가 들어 있어도 PAYMENT_OPEN을 켜기 전에는 결제를 받지 않는다(기본값은 닫힘)
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TierPaymentClosedTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean TossPaymentsClient toss;

    @Test
    void paymentStaysClosedByDefaultEvenWithKeys() throws Exception {
        when(toss.enabled()).thenReturn(true);
        when(toss.clientKey()).thenReturn("test_gck_dummy");
        String token = json.readTree(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("nickname", "pay-closed", "password", "pw-123456"))))
                .andReturn().getResponse().getContentAsString()).path("token").asText();

        mvc.perform(get("/api/v1/payments/tier/products"))
                .andExpect(jsonPath("$.enabled").value(false))
                .andExpect(jsonPath("$.clientKey").value(""));
        mvc.perform(post("/api/v1/payments/tier/order").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"tier\":\"SILVER\"}"))
                .andExpect(status().isServiceUnavailable());
    }
}
