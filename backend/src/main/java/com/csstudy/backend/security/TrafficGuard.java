package com.csstudy.backend.security;

import org.springframework.stereotype.Component;
import java.time.Clock;
import java.util.*;

@Component
public class TrafficGuard {
    private final Clock clock;
    private final LinkedHashMap<String, Window> clients = new LinkedHashMap<>(128, .75f, true);
    public TrafficGuard() { this(Clock.systemUTC()); }
    TrafficGuard(Clock clock) { this.clock = clock; }
    private static class Window {
        long start;
        int total;
        final Map<String, Integer> groups = new HashMap<>();
        Window(long start) { this.start = start; }
    }
    public record Decision(boolean allowed, int count, int retrySeconds, String reason) {}
    public synchronized Decision check(String ip, String method, String path) {
        long now = clock.millis();
        Window window = clients.computeIfAbsent(ip, key -> new Window(now));
        if (now - window.start >= 60_000) { window = new Window(now); clients.put(ip, window); }
        while (clients.size() > 20_000) clients.remove(clients.keySet().iterator().next());
        window.total = Math.min(window.total + 1, 1_000_000);
        String group = (path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/newsletter/")) && "POST".equals(method) ? "auth"
                : path.equals("/api/v1/code/java") ? "code"
                : path.startsWith("/api/v1/questions") && Set.of("GET","HEAD").contains(method) ? "content"
                : path.equals("/api/v1/chat") && "POST".equals(method) ? "chat" : "general";
        int count = window.groups.merge(group, 1, (a, b) -> Math.min(a + b, 1_000_000));
        int limit = switch (group) { case "auth" -> 60; case "code" -> 15; case "content" -> 180; case "chat" -> 60; default -> 3000; };
        int retry = (int)Math.max(1, (60_000 - (now - window.start) + 999) / 1000);
        return new Decision(window.total <= 3000 && count <= limit, window.total, retry, "RATE_" + group.toUpperCase(Locale.ROOT));
    }
}
