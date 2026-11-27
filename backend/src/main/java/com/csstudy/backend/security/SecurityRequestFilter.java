package com.csstudy.backend.security;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.service.AdminAuth;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.util.*;
import java.util.regex.Pattern;

@Component @Order(-100)
public class SecurityRequestFilter extends OncePerRequestFilter {
    private static final Pattern CRAWLER=Pattern.compile("(?i)(bot\\b|crawler|spider|scrapy|python-requests|httpx|curl/|wget/|headlesschrome|playwright|selenium)");
    private final ClientAddress addresses;
    private final TrafficGuard traffic;
    private final SecurityAudit audit;
    private final AdminAuth admins;
    private final ObjectMapper json;
    private final IpBanList bans;
    private final SecurityAlerts alerts;
    private final boolean rateLimit;
    public SecurityRequestFilter(ClientAddress addresses,TrafficGuard traffic,SecurityAudit audit,AdminAuth admins,ObjectMapper json,
                                 IpBanList bans,SecurityAlerts alerts,
                                 @Value("${app.security.rate-limit-enabled:true}") boolean rateLimit) {
        this.addresses=addresses;this.traffic=traffic;this.audit=audit;this.admins=admins;this.json=json;
        this.bans=bans;this.alerts=alerts;this.rateLimit=rateLimit;
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        response.setHeader("X-Content-Type-Options","nosniff");
        response.setHeader("X-Frame-Options","DENY");
        response.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
        response.setHeader("Cache-Control","no-store");
        if ("OPTIONS".equals(request.getMethod())) { chain.doFilter(request,response);return; }
        String path=request.getServletPath();
        if (path.isEmpty()) path=request.getRequestURI();
        String ip=addresses.resolve(request),lower=path.toLowerCase(Locale.ROOT);
        if (lower.contains("/.env") || lower.contains("/.git") || lower.startsWith("/wp-") || lower.startsWith("/actuator")) {
            deny(request,response,ip,"PROBE",403,0,"접근할 수 없는 경로입니다.");strike(ip,"PROBE",path);return;
        }
        if (!path.startsWith("/api/")) { chain.doFilter(request,response);return; }
        // 자동 임시 차단(PROBE · ADMIN_DENIED 반복). 요청 제한보다 먼저 막아 계수기도 늘리지 않는다
        if (bans.isBanned(ip)) {
            CookieErrorCode blocked=CookieErrorCode.IP_TEMPORARILY_BLOCKED;
            deny(request,response,ip,"BANNED",blocked.status().value(),0,blocked.code(),blocked.message());return;
        }
        TrafficGuard.Decision decision=rateLimit ? traffic.check(ip,request.getMethod(),path) : new TrafficGuard.Decision(true,0,0,"");
        if (!decision.allowed()) {
            response.setHeader("Retry-After",Integer.toString(decision.retrySeconds()));
            if (alerts.watches(decision.reason())) alerts.burst(decision.reason(),ip,decision.count(),path);
            deny(request,response,ip,decision.reason(),429,decision.count(),"요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");return;
        }
        boolean mutation=!Set.of("GET","HEAD").contains(request.getMethod());
        boolean admin=path.startsWith("/api/v1/admin/") || path.equals("/api/v1/admin")
                || path.startsWith("/api/v1/slack/") || path.equals("/api/v1/sync")
                || mutation && (path.matches("/api/v1/questions(?:/[^/]+)?/?") || path.matches("/api/v1/categories/?"));
        // 관리자 계정 생성과 권한 부여는 홈서버의 관리자 키로만(로그인한 관리자도 인터넷에서는 못 한다)
        boolean keyOnly=path.startsWith("/api/v1/admin/accounts") || path.startsWith("/api/v1/admin/roles");
        if (admin) {
            try { if (keyOnly) admins.requireKey(request.getHeader("X-Admin-Key")); else admins.require(request.getHeader("X-Admin-Key"),request); }
            catch (ResponseStatusException ex) {
                int status=ex.getStatusCode().value();
                deny(request,response,ip,"ADMIN_DENIED",status,decision.count(),ex.getReason());
                // 관리자 API가 닫혀 있는 503(키 미설정)은 서버 설정 문제라 세지 않는다
                if (status==401 || status==403) strike(ip,"ADMIN_DENIED",path);
                return;
            }
        }
        String agent=request.getHeader("User-Agent");
        if (agent!=null && CRAWLER.matcher(agent).find()) audit.record(request,ip,"DECLARED_AUTOMATION",200,decision.count());
        chain.doFilter(request,response);
    }
    // 검색엔진 같은 정상 봇은 DECLARED_AUTOMATION만 남기고 세지 않는다. PROBE · ADMIN_DENIED만 센다
    private void strike(String ip,String reason,String path) {
        IpBanList.Strike strike=bans.strike(ip);
        if (strike.newlyBanned()) alerts.banned(ip,reason,strike.count(),path,bans.banDuration());
    }
    private void deny(HttpServletRequest request,HttpServletResponse response,String ip,String reason,int status,int count,String message) throws IOException {
        deny(request,response,ip,reason,status,count,CookieErrorCode.from(HttpStatusCode.valueOf(status)).code(),message);
    }
    private void deny(HttpServletRequest request,HttpServletResponse response,String ip,String reason,int status,int count,String code,String message) throws IOException {
        audit.record(request,ip,reason,status,count);
        response.setStatus(status);response.setContentType("application/json");response.setCharacterEncoding("UTF-8");
        response.getWriter().write(json.writeValueAsString(Map.of("code",code,"error",message==null ? "" : message)));
    }
}
