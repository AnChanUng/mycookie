package com.csstudy.backend.service.alert;

import com.csstudy.backend.service.MattermostService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.sql.SQLTransientConnectionException;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class CriticalErrorAlertsTest {

    MattermostService mattermost = mock(MattermostService.class);
    GeminiSummarizer gemini = mock(GeminiSummarizer.class);
    @SuppressWarnings("unchecked") ObjectProvider<StringRedisTemplate> redis = mock(ObjectProvider.class);
    Instant now = Instant.parse("2026-11-20T01:00:00Z");
    CriticalErrorAlerts alerts;

    @BeforeEach
    void setUp() {
        when(mattermost.enabled()).thenReturn(true);
        when(gemini.summarize(anyString())).thenReturn(Optional.of("- 무슨 일: DB 연결 실패"));
        alerts = new CriticalErrorAlerts(mattermost, gemini, redis, false, "test:", true, 10, 30, "");
        alerts.useClock(Clock.fixed(now, ZoneOffset.UTC));
    }

    @AfterEach
    void tearDown() { alerts.detach(); }

    private void errors(int n, String exception, boolean fatal) {
        for (int i = 0; i < n; i++)
            alerts.record(new CriticalErrorAlerts.Event(now.minusSeconds(60 - i), exception + "@DuelService.finish:42", exception,
                    "user a@b.com from 10.0.0.1 failed", "DuelService.finish:42", fatal));
    }

    @Test
    void fewOrdinaryErrorsDoNotAlert() {
        errors(9, "IllegalStateException", false);
        alerts.check();
        verify(mattermost, never()).postNotice(anyString());
        verify(gemini, never()).summarize(anyString());
    }

    @Test
    void errorSpikeAlertsOnceWithSummaryAndMaskedEvidence() {
        errors(12, "IllegalStateException", false);
        alerts.check();
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mattermost).postNotice(text.capture());
        assertThat(text.getValue()).contains("[긴급] 서버 오류 급증: 5분간 ERROR 12건", "Gemini 요약", "`IllegalStateException` × 12", "DuelService.finish:42")
                .doesNotContain("a@b.com").doesNotContain("10.0.0.1");
        ArgumentCaptor<String> sent = ArgumentCaptor.forClass(String.class);
        verify(gemini).summarize(sent.capture());
        assertThat(sent.getValue()).doesNotContain("a@b.com");   // Gemini에도 가린 값만 보낸다

        alerts.check();   // 30분 안에는 다시 알리지 않는다
        verify(mattermost, times(1)).postNotice(anyString());
    }

    @Test
    void singleFatalErrorAlertsEvenBelowThreshold() {
        errors(1, "CannotGetJdbcConnectionException", true);
        alerts.check();
        verify(mattermost).postNotice(contains("치명 오류: CannotGetJdbcConnectionException"));
    }

    @Test
    void geminiFailureStillSendsRawEvidence() {
        when(gemini.summarize(anyString())).thenReturn(Optional.empty());
        errors(1, "OutOfMemoryError", true);
        alerts.check();
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mattermost).postNotice(text.capture());
        assertThat(text.getValue()).contains("원본 증거", "OutOfMemoryError").doesNotContain("Gemini 요약");
    }

    @Test
    void failedSendIsRetriedNextCheck() {
        doThrow(new IllegalStateException("down")).doReturn(true).when(mattermost).postNotice(anyString());
        errors(1, "OutOfMemoryError", true);
        alerts.check();
        alerts.check();
        verify(mattermost, times(2)).postNotice(anyString());
    }

    @Test
    void noWebhookMeansNothingIsSentOrSummarized() {
        when(mattermost.enabled()).thenReturn(false);
        errors(20, "OutOfMemoryError", true);
        alerts.check();
        verify(mattermost, never()).postNotice(anyString());
        verify(gemini, never()).summarize(anyString());
    }

    @Test
    void capturesRealErrorLogsWithRootCauseAndAppFrame() {
        var live = new CriticalErrorAlerts(mattermost, gemini, redis, false, "test:", true, 10, 30, "");
        live.attach();
        try {
            LoggerFactory.getLogger("com.csstudy.backend.SomeController").error("결과 저장 실패",
                    new IllegalStateException("wrap", new SQLTransientConnectionException("pool exhausted")));
            live.check();
            verify(mattermost).postNotice(contains("치명 오류: SQLTransientConnectionException"));
        } finally {
            live.detach();
        }
    }

    @Test
    void addsGrafanaLinkWhenConfigured() {
        var linked = new CriticalErrorAlerts(mattermost, gemini, redis, false, "test:", true, 10, 30, "http://homeserver:3000/");
        linked.useClock(Clock.fixed(now, ZoneOffset.UTC));
        linked.record(new CriticalErrorAlerts.Event(now.minusSeconds(10), "OutOfMemoryError@x", "OutOfMemoryError", "m", "x", true));
        linked.check();
        verify(mattermost).postNotice(contains("http://homeserver:3000/d/mycookie-logs?var-environment=prod"));
    }

    @Test
    void maskingHidesPersonalDataAndSecrets() {
        String masked = LogMasking.mask("mail kim@test.com ip 192.168.0.12 Bearer abcdefghijklmnop password=hunter2 "
                + "jdbc postgresql://cookie:SuperSecret@db:5432 phone 010-1234-5678 key " + "a".repeat(40));
        assertThat(masked).doesNotContain("kim@test.com", "192.168.0.12", "abcdefghijklmnop", "hunter2", "SuperSecret", "010-1234-5678", "a".repeat(40));
    }
}
