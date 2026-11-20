package com.csstudy.backend.service.alert;

import java.util.regex.Pattern;

// 외부(Gemini, Mattermost)로 보내기 전에 로그에서 개인정보와 비밀값을 가린다.
// Gemini 무료 등급은 입력을 서비스 개선에 쓸 수 있으므로, 사람을 알아볼 수 있는 값은 남기지 않는다
public final class LogMasking {

    private static final Pattern[] PATTERNS = {
            Pattern.compile("(?i)(bearer\\s+)[A-Za-z0-9._~+/=-]{8,}"),                                       // 인증 토큰
            Pattern.compile("(?i)((?:password|passwd|pwd|secret|token|api[_-]?key|authorization)[\"'\\s:=]+)[^\\s\"',&]+"),
            Pattern.compile("eyJ[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}\\.[A-Za-z0-9_-]{8,}"),                   // JWT
            Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"),                                // 이메일
            Pattern.compile("\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b"),                                                 // IPv4
            Pattern.compile("\\b01[016789]-?\\d{3,4}-?\\d{4}\\b"),                                              // 휴대폰 번호
            Pattern.compile("(?i)(postgres(?:ql)?://[^:\\s/]+:)[^@\\s]+@"),                                    // DB 주소의 비밀번호
            Pattern.compile("\\b[A-Za-z0-9_-]{32,}\\b"),                                                         // 긴 무작위 문자열(키, 세션 ID)
    };
    private static final String[] REPLACEMENTS = {"$1[토큰]", "$1[가림]", "[JWT]", "[이메일]", "[IP]", "[전화번호]", "$1[가림]@", "[긴값]"};

    private LogMasking() {}

    public static String mask(String text) {
        if (text == null) return "";
        String out = text;
        for (int i = 0; i < PATTERNS.length; i++) out = PATTERNS[i].matcher(out).replaceAll(REPLACEMENTS[i]);
        return out;
    }
}
