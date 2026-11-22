package com.csstudy.backend.controller;

import com.csstudy.backend.entity.AccountRole.Role;
import com.csstudy.backend.entity.OwnerDocument;
import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.repository.OwnerDocumentRepository;
import com.csstudy.backend.service.RoleService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

// 소유자(OWNER)만 읽고 쓰는 개인 자료. 이력서에서 만든 기술면접 질문처럼 저장소에 둘 수 없는 내용을 DB에 두고 권한으로 내려 준다
@RestController
@RequestMapping("/api/v1/private/docs")
@RequiredArgsConstructor
public class OwnerDocumentController {

    private static final Set<String> KEYS = Set.of("tech-interview");
    private static final int MAX_CHARS = 300_000;

    private final OwnerDocumentRepository docs;
    private final RoleService roles;
    private final ObjectMapper json;

    @GetMapping("/{key}")
    public ResponseEntity<Map<String, Object>> read(@PathVariable String key, HttpServletRequest request) {
        roles.require(request, Role.OWNER);
        checkKey(key);
        Map<String, Object> out = new LinkedHashMap<>();
        var doc = docs.findById(key);
        out.put("data", doc.map(d -> parse(d.getJson())).orElse(null));
        out.put("updatedAt", doc.map(OwnerDocument::getUpdatedAt).orElse(null));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(out);
    }

    @PutMapping("/{key}")
    public Map<String, Object> write(@PathVariable String key, @RequestBody JsonNode body, HttpServletRequest request) {
        roles.require(request, Role.OWNER);
        checkKey(key);
        JsonNode data = body.get("data");
        if (data == null || !data.isArray()) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        String text = data.toString();
        if (text.length() > MAX_CHARS) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
        Instant now = Instant.now();
        docs.save(OwnerDocument.builder().key(key).json(text).updatedAt(now).build());
        return Map.of("ok", true, "updatedAt", now);
    }

    private static void checkKey(String key) {
        if (!KEYS.contains(key)) throw new CookieException(CookieErrorCode.NOT_FOUND);
    }

    private JsonNode parse(String text) {
        try { return json.readTree(text); } catch (Exception e) { return null; }
    }
}
