package com.csstudy.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

/**
 * 나의쿠키에서 쓰는 모든 오류를 한곳에 모은 목록.
 *
 * <p>새 오류가 생기면 여기에 한 줄 추가하고 {@code throw new CookieException(CookieErrorCode.이름)}으로 던진다.
 * 응답은 {@link CookieExceptionHandler}가 {@code {"code": "이름", "error": "사용자에게 보여 줄 문구"}}로 만든다.
 * 화면은 {@code error}를 그대로 보여 주고, 분기가 필요하면 {@code code}를 본다.
 *
 * <p>규칙
 * <ul>
 *   <li>이름은 {@code 도메인_상황}(예: {@code NICKNAME_DUPLICATED}), 문구는 사용자에게 바로 보여 줄 수 있는 존댓말</li>
 *   <li>문구에 내부 정보(SQL, 클래스 이름, 개인정보)를 넣지 않는다</li>
 *   <li>한 번 쓴 이름은 화면이 기대고 있을 수 있으니 바꾸지 않는다</li>
 * </ul>
 */
public enum CookieErrorCode {

    // 공통
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "요청 내용이 올바르지 않아요. 입력한 값을 확인해 주세요."),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요해요."),
    FORBIDDEN(HttpStatus.FORBIDDEN, "이 작업을 할 권한이 없어요."),
    NOT_FOUND(HttpStatus.NOT_FOUND, "찾는 정보가 없어요."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식이에요."),
    CONFLICT(HttpStatus.CONFLICT, "이미 있는 정보와 겹쳐요. 새로고침한 뒤 다시 시도해 주세요."),
    PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "보낸 내용이 너무 커요."),
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "요청이 너무 많아요. 잠시 후 다시 시도해 주세요."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버에 문제가 생겼어요. 잠시 후 다시 시도해 주세요."),
    SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "지금은 이 기능을 쓸 수 없어요. 잠시 후 다시 시도해 주세요."),

    // 학습 메일
    NEWSLETTER_FULL(HttpStatus.CONFLICT, "학습 메일 구독자가 가득 찼어요. 자리가 나면 다시 열릴 테니 나중에 다시 신청해 주세요."),

    // 계정
    NICKNAME_DUPLICATED(HttpStatus.CONFLICT, "이미 사용 중인 닉네임입니다. 다른 이름을 사용해 주세요."),
    NICKNAME_RESERVED(HttpStatus.BAD_REQUEST, "관리용으로 예약된 닉네임이에요. 다른 이름을 사용해 주세요."),

    // 권한
    ADMIN_REQUIRED(HttpStatus.UNAUTHORIZED, "관리자만 볼 수 있어요. 관리자 계정으로 로그인해 주세요."),
    ROLE_REQUIRED(HttpStatus.FORBIDDEN, "이 페이지를 볼 권한이 없어요."),
    WEAK_ADMIN_PASSWORD(HttpStatus.BAD_REQUEST, "관리자 비밀번호를 입력해 주세요. 아이디와 같거나 아이디를 포함하면 안 돼요.");

    private final HttpStatus status;
    private final String message;

    CookieErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() { return status; }
    public String message() { return message; }
    public String code() { return name(); }

    /** 상태 코드만 아는 오류(ResponseStatusException, Spring 내부 오류)를 공통 코드로 바꾼다. */
    public static CookieErrorCode from(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> INVALID_REQUEST;
            case 401 -> UNAUTHORIZED;
            case 403 -> FORBIDDEN;
            case 404 -> NOT_FOUND;
            case 405 -> METHOD_NOT_ALLOWED;
            case 409 -> CONFLICT;
            case 413 -> PAYLOAD_TOO_LARGE;
            case 429 -> TOO_MANY_REQUESTS;
            case 503 -> SERVICE_UNAVAILABLE;
            default -> status.is4xxClientError() ? INVALID_REQUEST : INTERNAL_ERROR;
        };
    }
}
