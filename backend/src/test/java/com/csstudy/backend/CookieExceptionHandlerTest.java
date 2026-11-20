package com.csstudy.backend;

import com.csstudy.backend.exception.CookieErrorCode;
import com.csstudy.backend.exception.CookieException;
import com.csstudy.backend.exception.CookieExceptionHandler;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// 어떤 오류든 {code, error} 한 모양으로 나가고, 내부 정보는 새지 않는지 확인한다
class CookieExceptionHandlerTest {

    @RestController
    static class Boom {
        @GetMapping("/cookie") void cookie() { throw new CookieException(CookieErrorCode.NICKNAME_DUPLICATED); }
        @GetMapping("/cookie-message") void cookieMessage() { throw new CookieException(CookieErrorCode.INVALID_REQUEST, "날짜 형식이 달라요."); }
        @GetMapping("/status") void status() { throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자만 볼 수 있어요."); }
        @GetMapping("/status-plain") void statusPlain() { throw new ResponseStatusException(HttpStatus.NOT_FOUND); }
        @GetMapping("/db") void db() { throw new DataIntegrityViolationException("duplicate key value violates unique constraint users_nickname_key"); }
        @GetMapping("/bug") void bug() { throw new IllegalStateException("password=secret 내부 상태"); }
        @PostMapping("/json") Map<String, Object> json(@RequestBody Map<String, Object> body) { return body; }
    }

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new Boom()).setControllerAdvice(new CookieExceptionHandler()).build();

    @Test
    void cookieExceptionUsesItsCodeAndMessage() throws Exception {
        mvc.perform(get("/cookie")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NICKNAME_DUPLICATED"))
                .andExpect(jsonPath("$.error").value(CookieErrorCode.NICKNAME_DUPLICATED.message()));
        mvc.perform(get("/cookie-message")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST")).andExpect(jsonPath("$.error").value("날짜 형식이 달라요."));
    }

    @Test
    void responseStatusExceptionKeepsReasonOrUsesDefault() throws Exception {
        mvc.perform(get("/status")).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN")).andExpect(jsonPath("$.error").value("관리자만 볼 수 있어요."));
        mvc.perform(get("/status-plain")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND")).andExpect(jsonPath("$.error").value(CookieErrorCode.NOT_FOUND.message()));
    }

    @Test
    void springErrorsGetTheSameShape() throws Exception {
        mvc.perform(post("/json").contentType(MediaType.APPLICATION_JSON).content("{깨진 json"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        mvc.perform(delete("/json")).andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.code").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void internalDetailsNeverLeak() throws Exception {
        mvc.perform(get("/db")).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("CONFLICT"))
                .andExpect(content().string(not(containsString("users_nickname_key"))));
        mvc.perform(get("/bug")).andExpect(status().isInternalServerError()).andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error").value(CookieErrorCode.INTERNAL_ERROR.message()))
                .andExpect(content().string(not(containsString("secret"))));
    }
}
