package com.csstudy.backend.controller;

import com.csstudy.backend.service.AuthService;
import com.csstudy.backend.service.StudyCoachService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/study-coach")
public class StudyCoachController {
    private final AuthService auth;
    private final StudyCoachService coach;
    public StudyCoachController(AuthService auth, StudyCoachService coach) { this.auth = auth; this.coach = coach; }
    @PostMapping("/plan")
    public StudyCoachService.Plan plan(@RequestBody StudyCoachService.Goal goal, HttpServletRequest request) {
        return coach.plan(auth.requireUser(request).getId(), goal);
    }
}
