package com.csstudy.backend.controller;

import com.csstudy.backend.service.BlogFeedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/blog")
@RequiredArgsConstructor
public class BlogController {

    private final BlogFeedService feed;

    @GetMapping("/posts")
    public Map<String, List<BlogFeedService.Post>> posts() {
        return Map.of("posts", feed.posts());
    }
}
