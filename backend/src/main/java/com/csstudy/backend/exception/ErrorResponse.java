package com.csstudy.backend.exception;

/**
 * 모든 오류 응답의 모양: {@code {"code": "NICKNAME_DUPLICATED", "error": "이미 사용 중인 닉네임입니다..."}}.
 * 화면은 예전부터 {@code error}를 읽으므로 이름을 바꾸지 않는다.
 */
public record ErrorResponse(String code, String error) {

    public static ErrorResponse of(CookieErrorCode code) {
        return new ErrorResponse(code.code(), code.message());
    }

    public static ErrorResponse of(CookieErrorCode code, String message) {
        return new ErrorResponse(code.code(), message == null || message.isBlank() ? code.message() : message);
    }
}
