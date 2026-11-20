package com.csstudy.backend.exception;

/**
 * 나의쿠키가 던지는 예외. 어떤 오류인지는 {@link CookieErrorCode}로 정한다.
 *
 * <pre>
 * throw new CookieException(CookieErrorCode.NICKNAME_DUPLICATED);
 * throw new CookieException(CookieErrorCode.INVALID_REQUEST, "날짜는 2026-11-20 형식이어야 해요.");  // 문구만 바꿀 때
 * </pre>
 */
public class CookieException extends RuntimeException {

    private final CookieErrorCode errorCode;

    public CookieException(CookieErrorCode errorCode) {
        this(errorCode, errorCode.message());
    }

    /** 같은 종류의 오류지만 사용자에게 더 구체적인 문구를 보여 줄 때. */
    public CookieException(CookieErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /** 원인 예외를 함께 남길 때(로그에는 원인이 찍히고, 사용자에게는 문구만 간다). */
    public CookieException(CookieErrorCode errorCode, Throwable cause) {
        super(errorCode.message(), cause);
        this.errorCode = errorCode;
    }

    public CookieErrorCode getErrorCode() { return errorCode; }
}
