package com.csstudy.backend.security;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// 누구나 부르는 쓰기 API(제보 · 건의 · 자료 기부)의 "같은 곳(IP)에서 하루 몇 번까지" 제한.
// 방문자 ID는 요청마다 바꿔 보낼 수 있어서 IP로도 따로 센다. 서버 메모리에만 두고, 날짜가 바뀌면 다시 0부터 센다.
// IP는 ClientAddress로 고른 값을 넘긴다(X-Forwarded-For 첫 값은 지어낼 수 있다)
public final class DailyIpLimit {

    private static final int TRACK_MAX = 10_000;

    private final int limit;
    private final Map<String, int[]> counts = new ConcurrentHashMap<>();

    public DailyIpLimit(int limit) {
        this.limit = limit;
    }

    public int limit() {
        return limit;
    }

    // 한도 안이면 한 번 세고 true, 이미 다 썼으면 세지 않고 false
    public boolean tryAcquire(String ip, LocalDate day) {
        if (counts.size() > TRACK_MAX) counts.clear();
        int today = (int) day.toEpochDay();
        int[] window = counts.compute(String.valueOf(ip), (k, v) -> v == null || v[0] != today ? new int[]{today, 0} : v);
        synchronized (window) {
            if (window[1] >= limit) return false;
            window[1]++;
            return true;
        }
    }
}
