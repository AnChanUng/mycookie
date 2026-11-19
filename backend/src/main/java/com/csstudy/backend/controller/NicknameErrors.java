package com.csstudy.backend.controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;
@RestControllerAdvice(assignableTypes={AuthController.class,OAuthController.class,RankController.class,LoungeController.class})
public class NicknameErrors {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error",e.getReason()==null?"요청을 처리하지 못했습니다.":e.getReason()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> duplicate(DataIntegrityViolationException e) {
        return ResponseEntity.status(409).body(Map.of("error","이미 사용 중인 닉네임입니다. 다른 이름을 사용해 주세요."));
    }
}
