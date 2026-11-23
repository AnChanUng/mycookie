package com.csstudy.backend.entity;

public enum UserTier {
    BRONZE("동 쿠키"), SILVER("은 쿠키"), GOLD("금 쿠키"), DIAMOND("다이아 쿠키"), RUBY("루비 쿠키");

    private final String label;
    UserTier(String label) { this.label = label; }
    public String label() { return label; }

    // Absolute lifetime solved totals, from V to I; never reset when a base tier is granted.
    public long[] thresholds() {
        return switch (this) {
            case BRONZE -> new long[]{0, 5, 12, 25, 45};
            case SILVER -> new long[]{50, 60, 80, 100, 120};
            case GOLD -> new long[]{150, 170, 200, 230, 260};
            case DIAMOND -> new long[]{300, 350, 450, 650, 950};
            case RUBY -> new long[]{1000, 1100, 1300, 1700, 2300};
        };
    }

    public int division(long solved) {
        long[] thresholds = thresholds();
        for (int i = 4; i >= 0; i--) if (solved >= thresholds[i]) return 5 - i;
        return 5;
    }

    public String displayName(int division) {
        return label + " " + new String[]{"", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"}[division];
    }

    /** 푼 문제 수로 정한 등급. 기준: 은 50 · 금 150 · 다이아 300 · 루비 1,000 */
    public static UserTier earned(long solved) {
        return solved >= 1000 ? RUBY : solved >= 300 ? DIAMOND : solved >= 150 ? GOLD : solved >= 50 ? SILVER : BRONZE;
    }

    // 등급은 푼 문제 수로만 정한다. 예전에 계정에 붙인 기본 금 쿠키(SSAFY 16기 인증 · 기존 회원 일괄)는 더 이상 등급을 올리지 않는다.
    // 저장된 base_tier 값은 지우지 않는다(데이터 보존). 시험 · 결제로 얻은 최소 등급(TierAward)은 MembershipService가 따로 지킨다
    public static UserTier calculate(UserTier base, long solved) {
        UserTier earned = earned(solved);
        UserTier kept = base == null || base == GOLD ? BRONZE : base;
        return kept.ordinal() > earned.ordinal() ? kept : earned;
    }
}
