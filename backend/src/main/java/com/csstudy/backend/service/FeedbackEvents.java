package com.csstudy.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

// 제보가 저장되면 "feedback.created" 이벤트(값: 제보 번호)를 Kafka에 넣는다(KAFKA_ENABLED=true).
// 이슈 생성, 알림 같은 느린 일은 소비자가 맡으므로 제보 요청은 바로 끝난다.
// Kafka가 꺼져 있거나 넣지 못하면 false를 돌려주고, 호출한 쪽이 바로 처리한다(제보는 이미 DB에 있다)
@Slf4j
@Component
public class FeedbackEvents {

    private final ObjectProvider<KafkaTemplate<String, String>> kafka;
    private final boolean enabled;
    private final String topic;

    public FeedbackEvents(ObjectProvider<KafkaTemplate<String, String>> kafka,
                          @Value("${app.kafka.enabled:false}") boolean enabled,
                          @Value("${app.kafka.topic-prefix:local}") String prefix) {
        this.kafka = kafka;
        this.enabled = enabled;
        this.topic = topic(prefix);
    }

    public static String topic(String prefix) { return prefix + ".feedback.created"; }

    public boolean publish(long feedbackId) {
        KafkaTemplate<String, String> template = enabled ? kafka.getIfAvailable() : null;
        if (template == null) return false;
        try {
            // 키를 제보 번호로 두어 같은 제보의 이벤트는 같은 파티션에서 순서대로 처리된다
            template.send(topic, Long.toString(feedbackId), Long.toString(feedbackId)).get(5, TimeUnit.SECONDS);
            return true;
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("제보 #{} 이벤트를 Kafka에 넣지 못해 바로 처리합니다: {}", feedbackId, e.getMessage());
            return false;
        }
    }
}
