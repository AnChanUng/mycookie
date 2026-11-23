package com.csstudy.backend;

import com.csstudy.backend.entity.MailFailure;
import com.csstudy.backend.repository.MailFailureRepository;
import com.csstudy.backend.service.MailFailureAlerts;
import com.csstudy.backend.service.MattermostService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

// 최근 24시간 메일 발송 실패가 기준 이상이면 Mattermost로 한 번 알린다(받는 주소는 넣지 않는다)
@SpringBootTest(properties = "app.alert.mail-failure-threshold=3")
@ActiveProfiles("test")
class MailFailureAlertTest {

    @Autowired MailFailureRepository failures;
    @Autowired MailFailureAlerts alerts;
    @MockitoBean MattermostService mattermost;

    @BeforeEach
    void setUp() {
        failures.deleteAll();
        when(mattermost.enabled()).thenReturn(true);
        when(mattermost.postNotice(anyString())).thenReturn(true);
        when(mattermost.baseUrl()).thenReturn("https://mycookie.dev");
    }

    private void fail(String to, String kind, String reason, Instant at) {
        failures.save(MailFailure.builder().at(at).recipient(to).kind(kind).subject("[나의쿠키] 제목").reason(reason).build());
    }

    @Test
    void alertsOnceWhenFailuresReachTheThresholdWithoutRecipientAddresses() {
        fail("a@example.com", "학습 메일", "MailSendException: 550 a@example.com does not exist", Instant.now());
        fail("b@example.com", "학습 메일", "MailSendException: 550 b@example.com does not exist", Instant.now());
        // 기준(3건) 미만이면 알리지 않는다. 24시간보다 오래된 실패는 세지 않는다
        fail("old@example.com", "기타", "옛 실패", Instant.now().minusSeconds(25 * 3600));
        assertThat(alerts.check()).isFalse();
        verify(mattermost, never()).postNotice(anyString());

        fail("c@example.com", "인증 번호", "MailConnectException: timeout", Instant.now());
        assertThat(alerts.check()).isTrue();
        ArgumentCaptor<String> text = ArgumentCaptor.forClass(String.class);
        verify(mattermost).postNotice(text.capture());
        assertThat(text.getValue()).contains("최근 24시간 3건", "학습 메일 2건", "인증 번호 1건", "MailConnectException", "/admin")
                .doesNotContain("a@example.com").doesNotContain("b@example.com").doesNotContain("c@example.com")
                .contains("[메일 주소]");

        // 같은 알림은 쿨다운 동안 다시 보내지 않는다
        fail("d@example.com", "학습 메일", "x", Instant.now());
        assertThat(alerts.check()).isFalse();
        verify(mattermost, times(1)).postNotice(anyString());
    }
}
