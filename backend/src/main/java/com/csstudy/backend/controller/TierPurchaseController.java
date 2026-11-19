package com.csstudy.backend.controller;

import com.csstudy.backend.entity.TierPurchase;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.MembershipService;
import com.csstudy.backend.service.TierPurchaseService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

// 등급 구매: 상품 목록 → 주문 만들기 → (토스 결제창) → 승인
@RestController
@RequestMapping("/api/v1/payments/tier")
@RequiredArgsConstructor
public class TierPurchaseController {

    private final TierPurchaseService service;
    private final AuthService authService;
    private final MembershipService memberships;

    @GetMapping("/products")
    public Map<String, Object> products(HttpServletRequest request) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("enabled", service.enabled());
        out.put("clientKey", service.enabled() ? service.clientKey() : "");
        out.put("products", service.products().stream().map(p -> Map.of("tier", p.tier().name(), "name", p.name(), "price", p.price())).toList());
        authService.currentUser(request).ifPresent(u -> out.put("membership", memberships.membership(u)));
        return out;
    }

    @PostMapping("/order")
    public TierPurchaseService.Order order(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = authService.requireUser(request);
        return service.order(user, Objects.toString(body.get("tier"), ""));
    }

    @PostMapping("/confirm")
    public Map<String, Object> confirm(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User user = authService.requireUser(request);
        long amount = body.get("amount") instanceof Number n ? n.longValue() : parse(body.get("amount"));
        TierPurchase paid = service.confirm(user, Objects.toString(body.get("paymentKey"), ""),
                Objects.toString(body.get("orderId"), ""), amount);
        return Map.of("tier", paid.getTier().name(), "tierName", paid.getTier().label(),
                "membership", memberships.membership(user));
    }

    private static long parse(Object value) {
        try { return Long.parseLong(Objects.toString(value, "")); } catch (NumberFormatException e) { return -1; }
    }
}
