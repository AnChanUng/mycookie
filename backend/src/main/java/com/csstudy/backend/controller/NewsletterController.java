package com.csstudy.backend.controller;

import com.csstudy.backend.service.NewsletterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/newsletter")
@RequiredArgsConstructor
public class NewsletterController {

    private final NewsletterService newsletter;

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("enabled", newsletter.enabled());
    }

    @PostMapping("/subscribe")
    public Map<String, Object> subscribe(@RequestBody Map<String, String> body) {
        newsletter.subscribe(body.get("email"));
        return Map.of("ok", true);
    }

    @PostMapping("/confirm")
    public Map<String, Object> confirm(@RequestBody Map<String, String> body) {
        newsletter.confirm(body.get("token"));
        return Map.of("ok", true);
    }

    @PostMapping("/unsubscribe")
    public Map<String, Object> unsubscribe(@RequestBody Map<String, String> body) {
        newsletter.unsubscribe(body.get("key"));
        return Map.of("ok", true);
    }

}
