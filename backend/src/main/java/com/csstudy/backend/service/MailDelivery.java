package com.csstudy.backend.service;

// 메일 한 통의 발송 결과(발송 스레드가 SMTP 서버에 넘긴 뒤 알린다). error가 null이면 성공
public record MailDelivery(String to, String subject, Exception error) {
    public boolean failed() {
        return error != null;
    }
}
