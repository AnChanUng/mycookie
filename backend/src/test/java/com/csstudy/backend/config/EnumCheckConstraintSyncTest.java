package com.csstudy.backend.config;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// 포인트 내역 reason 칸: QUEST가 생기기 전에 만든 CHECK 제약은 QUEST를 거절한다(이슈 #293 · #297의 409)
class EnumCheckConstraintSyncTest {

    // PostgreSQL pg_get_constraintdef가 돌려주는 모양 그대로
    private static final String OLD_DEF = "CHECK (((reason)::text = ANY ((ARRAY['ATTEND'::character varying, "
            + "'SOLVED'::character varying, 'TIER_UP'::character varying, 'PURCHASE'::character varying])::text[])))";
    private static final List<String> NOW = List.of("ATTEND", "SOLVED", "TIER_UP", "QUEST", "PURCHASE");

    @Test
    void oldReasonCheckIsMissingQuestAndGetsRebuilt() {
        assertThat(EnumCheckConstraintSync.isEnumCheckFor(OLD_DEF, "reason", NOW)).isTrue();
        assertThat(EnumCheckConstraintSync.missingValues(OLD_DEF, NOW)).isTrue();
    }

    @Test
    void upToDateCheckIsLeftAlone() {
        String def = OLD_DEF.replace("'PURCHASE'", "'QUEST'::character varying, 'PURCHASE'");
        assertThat(EnumCheckConstraintSync.missingValues(def, NOW)).isFalse();
    }

    @Test
    void otherChecksOnTheTableAreNotTouched() {
        assertThat(EnumCheckConstraintSync.isEnumCheckFor("CHECK ((amount <> 0))", "reason", NOW)).isFalse();
        // 칸 이름이 다른 enum 칸(예: status)의 제약은 reason 기준으로 보지 않는다
        assertThat(EnumCheckConstraintSync.isEnumCheckFor("CHECK (((status)::text = ANY ((ARRAY['ATTEND'::text])::text[])))", "reason", NOW)).isFalse();
    }

    @Test
    void defaultColumnNamesFollowSpringNaming() {
        assertThat(EnumCheckConstraintSync.snake("baseTier")).isEqualTo("base_tier");
        assertThat(EnumCheckConstraintSync.snake("PointHistory")).isEqualTo("point_history");
    }
}
