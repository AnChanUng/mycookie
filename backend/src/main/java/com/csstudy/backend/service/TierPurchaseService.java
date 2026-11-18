package com.csstudy.backend.service;

import com.csstudy.backend.entity.TierAward;
import com.csstudy.backend.entity.TierPurchase;
import com.csstudy.backend.entity.User;
import com.csstudy.backend.entity.UserTier;
import com.csstudy.backend.repository.TierAwardRepository;
import com.csstudy.backend.repository.TierPurchaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;

// 결제로 등급 올리기. 풀이 수로 정해지는 티어 기준은 건드리지 않고,
// 결제한 등급을 "이 아래로는 내려가지 않는 최소 등급"(승급 시험과 같은 TierAward)으로 저장한다
@Service
@RequiredArgsConstructor
public class TierPurchaseService {

    // 판매하는 등급과 기본 가격(원). 환경변수 PRICE_SILVER 같은 설정으로 바꿀 수 있다
    static final Map<UserTier, Long> DEFAULT_PRICES = new EnumMap<>(Map.of(
            UserTier.SILVER, 3_900L, UserTier.GOLD, 9_900L, UserTier.DIAMOND, 19_900L, UserTier.RUBY, 39_000L));

    public record Product(UserTier tier, String name, long price) {}
    public record Order(String orderId, long amount, String orderName, String customerKey) {}

    private final TierPurchaseRepository purchases;
    private final TierAwardRepository awards;
    private final TossPaymentsClient toss;
    private final MembershipService memberships;
    private final Environment env;

    public boolean enabled() { return toss.enabled(); }

    public String clientKey() { return toss.clientKey(); }

    public List<Product> products() {
        List<Product> out = new ArrayList<>();
        DEFAULT_PRICES.forEach((tier, price) -> out.add(new Product(tier, tier.label(),
                env.getProperty("app.payment.prices." + tier.name().toLowerCase(Locale.ROOT), Long.class, price))));
        return out;
    }

    // 등급의 가장 낮은 단계(Ⅴ). 승급 시험과 같은 0~24 단계 값을 쓴다
    static int level(UserTier tier) { return tier.ordinal() * 5; }

    static int level(MembershipService.Membership m) { return m.tier().ordinal() * 5 + 5 - m.division(); }

    @Transactional
    public Order order(User user, String tierName) {
        if (!enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "지금은 결제를 받을 수 없습니다.");
        Product product = products().stream().filter(p -> p.tier().name().equalsIgnoreCase(tierName)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "구매할 수 없는 등급입니다."));
        if (level(memberships.membership(user)) >= level(product.tier())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미 " + product.name() + " 이상이에요.");
        }
        String orderId = "tier-" + UUID.randomUUID().toString().replace("-", "");
        purchases.save(TierPurchase.builder().orderId(orderId).userId(user.getId()).tier(product.tier())
                .amount(product.price()).status(TierPurchase.Status.READY).createdAt(Instant.now()).build());
        return new Order(orderId, product.price(), "나의쿠키 " + product.name() + " 등급", "user-" + user.getId());
    }

    /** 결제창에서 돌아온 뒤 금액을 확인하고 승인한다. 이미 승인된 주문이면 다시 결제하지 않고 그대로 성공으로 본다. */
    @Transactional
    public TierPurchase confirm(User user, String paymentKey, String orderId, long amount) {
        TierPurchase order = purchases.findByOrderIdForUpdate(orderId)
                .filter(p -> p.getUserId().equals(user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "주문을 찾을 수 없습니다."));
        if (order.getStatus() == TierPurchase.Status.PAID) return order;
        if (order.getStatus() != TierPurchase.Status.READY || order.getAmount() != amount) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결제 금액이 주문과 다릅니다.");
        }
        TossPaymentsClient.Approval approval = toss.confirm(paymentKey, orderId, amount);
        if (!"DONE".equals(approval.status()) || approval.totalAmount() != amount || !orderId.equals(approval.orderId())) {
            order.setStatus(TierPurchase.Status.FAILED);
            purchases.save(order);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "결제가 완료되지 않았습니다.");
        }
        order.setStatus(TierPurchase.Status.PAID);
        order.setPaymentKey(paymentKey);
        order.setMethod(approval.method());
        order.setPaidAt(Instant.now());
        purchases.save(order);

        String key = "user:" + user.getId();
        TierAward award = awards.findForUpdate(key).orElseGet(() -> new TierAward(key, -1));
        award.setTierLevel(Math.max(award.getTierLevel(), level(order.getTier())));
        awards.save(award);
        return order;
    }
}
