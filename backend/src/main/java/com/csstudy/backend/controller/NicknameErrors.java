package com.csstudy.backend.controller;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.ErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// 닉네임을 저장하는 컨트롤러에서 유일 제약 위반은 "닉네임 중복"으로 알려 준다.
// 나머지 오류는 전체 예외 처리(CookieExceptionHandler)가 맡는다
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = {AuthController.class, OAuthController.class, RankController.class, LoungeController.class})
public class NicknameErrors {
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> duplicate(DataIntegrityViolationException e) {
        CookieErrorCode code = CookieErrorCode.NICKNAME_DUPLICATED;
        return ResponseEntity.status(code.status()).body(ErrorResponse.of(code));
    }
}
