package com.csstudy.backend.controller;

import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.InterviewAiService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/interview-ai")
public class InterviewAiController {
    private final AuthService auth;
    private final InterviewAiService ai;
    public InterviewAiController(AuthService auth, InterviewAiService ai) { this.auth = auth; this.ai = ai; }
    @GetMapping("/status") public Map<String, Object> status() { return Map.of("available", ai.available(), "maxSeconds", 180); }
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> transcribe(@RequestParam("audio") MultipartFile audio, HttpServletRequest request) throws IOException {
        long user = auth.requireUser(request).getId();
        if (audio.getSize() > 5760044) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "녹음은 최대 3분입니다.");
        return Map.of("transcript", ai.transcribe(user, audio.getBytes()));
    }
    public record GradeRequest(String questionId, String transcript) {}
    @PostMapping("/grade") public Map<String, Object> grade(@RequestBody GradeRequest body, HttpServletRequest request) {
        return ai.grade(auth.requireUser(request).getId(), body.questionId(), body.transcript());
    }
}
