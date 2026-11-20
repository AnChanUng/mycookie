package com.csstudy.backend.controller;

import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.DevLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Map;

// 팀 개발 일지 API. TEAM 권한 계정(보민, 찬웅, 관리자)만 읽고 쓴다(DevLogService)
@RestController
@RequestMapping("/api/v1/devlog")
@RequiredArgsConstructor
public class DevLogController {

    private final DevLogService devLog;
    private final AuthService auth;
    private final com.csstudy.backend.service.RoleService roles;

    @GetMapping
    public Map<String, Object> list(HttpServletRequest request) {
        roles.require(request, com.csstudy.backend.entity.AccountRole.Role.TEAM);
        return Map.of("canEdit", true, "entries", devLog.list());
    }

    @PutMapping("/{date}")
    public Map<String, Object> save(@PathVariable String date, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        var user = roles.require(request, com.csstudy.backend.entity.AccountRole.Role.TEAM);
        return devLog.save(parse(date), body, java.util.Optional.of(user));
    }

    @DeleteMapping("/{date}")
    public Map<String, Object> delete(@PathVariable String date, HttpServletRequest request) {
        roles.require(request, com.csstudy.backend.entity.AccountRole.Role.TEAM);
        devLog.delete(parse(date));
        return Map.of("ok", true);
    }

    // 화면이 error 문구를 그대로 보여 줄 수 있게 {error: "..."}로 돌려준다
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> status(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("error", e.getReason() == null ? "요청을 처리하지 못했어요." : e.getReason()));
    }

    // 같은 순간 두 사람이 저장해 version이 엇갈린 경우
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<Map<String, String>> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "다른 사람이 먼저 고쳤어요. 새로고침한 뒤 다시 저장해 주세요."));
    }

    private static LocalDate parse(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "날짜는 2026-11-20 형식이어야 해요.");
        }
    }
}
