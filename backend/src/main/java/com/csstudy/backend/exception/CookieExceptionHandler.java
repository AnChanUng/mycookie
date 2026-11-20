package com.csstudy.backend.exception;

import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * 나의쿠키 전체 예외 처리. 어떤 오류든 {@link ErrorResponse}({@code {code, error}}) 한 가지 모양으로 돌려준다.
 *
 * <ul>
 *   <li>{@link CookieException}: 우리가 정한 오류. 코드의 상태와 문구를 그대로 쓴다</li>
 *   <li>{@link ResponseStatusException}과 Spring MVC 오류(잘못된 JSON, 없는 주소, 지원하지 않는 메서드 등):
 *       상태 코드로 공통 코드를 고르고, 사유가 있으면 그 문구를 쓴다</li>
 *   <li>그 밖의 예상하지 못한 예외: 500으로 감추고 ERROR 로그를 남긴다(긴급 알림이 이 로그를 센다)</li>
 * </ul>
 * 컨트롤러 안의 {@code @ExceptionHandler}나 범위를 좁힌 advice가 있으면 그쪽이 먼저다. 그래서 순서를 맨 뒤로 둔다.
 */
@Slf4j
@Order(Ordered.LOWEST_PRECEDENCE)
@RestControllerAdvice
public class CookieExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(CookieException.class)
    public ResponseEntity<ErrorResponse> handleCookie(CookieException e) {
        CookieErrorCode code = e.getErrorCode();
        if (code.status().is5xxServerError()) log.error("[{}] {}", code.code(), e.getMessage(), e);
        else log.debug("[{}] {}", code.code(), e.getMessage());
        return ResponseEntity.status(code.status()).body(ErrorResponse.of(code, e.getMessage()));
    }

    // 유일 제약 위반 같은 DB 충돌. 어떤 제약인지는 내부 정보라 문구에 넣지 않는다
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleConflict(DataIntegrityViolationException e) {
        log.warn("DB 제약 위반: {}", e.getMostSpecificCause().getClass().getSimpleName());
        return ResponseEntity.status(CookieErrorCode.CONFLICT.status()).body(ErrorResponse.of(CookieErrorCode.CONFLICT));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e, HttpServletResponse response) {
        if (isClientAbort(e) || response.isCommitted()) {
            log.debug("응답을 보낼 수 없는 상태의 예외: {}", e.getClass().getSimpleName());
            return null;
        }
        log.error("처리하지 못한 예외", e);
        return ResponseEntity.status(CookieErrorCode.INTERNAL_ERROR.status()).body(ErrorResponse.of(CookieErrorCode.INTERNAL_ERROR));
    }

    // ResponseStatusException을 포함한 Spring MVC 표준 예외는 모두 여기로 모인다(ResponseEntityExceptionHandler).
    // 브라우저가 먼저 연결을 끊은 경우(AsyncRequestNotUsableException)는 부모 클래스가 조용히 넘긴다
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception ex, @Nullable Object body, HttpHeaders headers,
                                                             HttpStatusCode statusCode, WebRequest request) {
        CookieErrorCode code = CookieErrorCode.from(statusCode);
        String reason = ex instanceof ResponseStatusException rse ? rse.getReason() : null;
        if (statusCode.is5xxServerError()) log.error("[{}] {}", code.code(), reason == null ? ex.getClass().getSimpleName() : reason, ex);
        return ResponseEntity.status(statusCode).headers(headers).body(ErrorResponse.of(code, reason));
    }

    private static boolean isClientAbort(Throwable e) {
        for (Throwable t = e; t != null; t = t.getCause()) {
            String name = t.getClass().getSimpleName();
            if (name.equals("ClientAbortException") || name.equals("AsyncRequestNotUsableException")) return true;
        }
        return false;
    }
}
