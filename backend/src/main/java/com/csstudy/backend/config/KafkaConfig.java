package com.csstudy.backend.config;

import com.csstudy.backend.service.FeedbackEvents;
import com.csstudy.backend.service.FeedbackProcessor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.backoff.FixedBackOff;

// Kafka를 켰을 때(KAFKA_ENABLED=true)만 쓰는 설정: 토픽 만들기, 실패한 이벤트 다시 시도, 끝내 실패하면 DLT로 보내기
@Slf4j
@Configuration
@ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
public class KafkaConfig {

    private final String topic;
    private final String mailTopic;

    public KafkaConfig(@Value("${app.kafka.topic-prefix:local}") String prefix) {
        this.topic = FeedbackEvents.topic(prefix);
        this.mailTopic = com.csstudy.backend.service.MailService.topic(prefix);
    }

    // 메일 발송 이벤트(MAIL_VIA_KAFKA). 받는 주소와 본문이 들어 있어 하루만 남긴다
    @Bean
    NewTopic mailSendTopic() {
        return TopicBuilder.name(mailTopic).partitions(1).replicas(1).config("retention.ms", "86400000").build();
    }

    // 홈서버 한 대라 파티션 1개, 복제 1개. 7일 동안 남겨 두어 장애 뒤에도 다시 처리할 수 있다
    @Bean
    NewTopic feedbackCreatedTopic() {
        return TopicBuilder.name(topic).partitions(1).replicas(1).config("retention.ms", "604800000").build();
    }

    @Bean
    NewTopic feedbackDeadLetterTopic() {
        return TopicBuilder.name(topic + ".dlt").partitions(1).replicas(1).config("retention.ms", "2592000000").build();
    }

    // 처리 중 예외가 나면 10초 간격으로 3번 더 시도하고, 그래도 안 되면 <토픽>.dlt에 남긴다(스프링 부트가 소비자에 붙인다)
    @Bean
    DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template) {
        var recoverer = new DeadLetterPublishingRecoverer(template,
                (ConsumerRecord<?, ?> record, Exception e) -> new TopicPartition(record.topic() + ".dlt", 0));
        return new DefaultErrorHandler(recoverer, new FixedBackOff(10_000L, 3));
    }

    // 메일 발송 이벤트 소비자. 발송이 실패해도 예외를 던지지 않으므로(실패 기록과 학습 메일 되감기가 맡는다) 재시도·DLT로 본문이 쌓이지 않는다
    @Component
    @ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
    static class MailSendListener {
        private final com.csstudy.backend.service.MailService mail;
        private final com.fasterxml.jackson.databind.ObjectMapper json;

        MailSendListener(com.csstudy.backend.service.MailService mail, com.fasterxml.jackson.databind.ObjectMapper json) {
            this.mail = mail;
            this.json = json;
        }

        @KafkaListener(topics = "${app.kafka.topic-prefix:local}.mail.send")
        void onMail(String payload) {
            try {
                mail.deliver(json.readValue(payload, com.csstudy.backend.service.MailService.Mail.class));
            } catch (Exception e) {
                log.warn("메일 발송 이벤트를 읽지 못했습니다: {}", e.getClass().getSimpleName());
            }
        }
    }

    @Component
    @ConditionalOnProperty(name = "app.kafka.enabled", havingValue = "true")
    static class FeedbackEventListener {
        private final FeedbackProcessor processor;

        FeedbackEventListener(FeedbackProcessor processor) { this.processor = processor; }

        @KafkaListener(topics = "${app.kafka.topic-prefix:local}.feedback.created")
        void onFeedbackCreated(String feedbackId) {
            log.info("제보 #{} 이벤트 처리", feedbackId);
            processor.process(Long.parseLong(feedbackId.trim()));
        }
    }
}
