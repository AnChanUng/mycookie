package com.csstudy.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 라운지 실시간 연결(SSE). 접속자가 몰려도 메시지가 조용히 사라지거나, 느린 한 사람이 모두를 막지 않게 한다.
 *
 * <ul>
 *   <li>접속자마다 자기 대기열을 갖고, 공용 스레드 몇 개가 대기열이 찬 사람만 차례로 비운다(느린 사람은 자기 대기열만 밀린다)</li>
 *   <li>대기열이 넘치면 메시지를 버리지 않고 그 연결을 끊는다. 화면이 다시 붙으면 처음 목록(스냅샷)을 받으므로 빠지는 글이 없다</li>
 *   <li>새 글은 그 글 하나만, 입장과 퇴장은 참여자 목록만 보낸다. 전체 목록은 처음 연결과 목록 초기화(삭제, 자정) 때만 보낸다</li>
 *   <li>보낼 내용은 한 번만 JSON으로 만들어 모든 접속자에게 같은 문자열을 쓴다</li>
 * </ul>
 */
@Slf4j
@Service
public class LoungeStreamService {

    private static final int QUEUE_PER_CLIENT = 256;

    // 보낼 이름과 이미 만든 JSON 문자열. SseEventBuilder는 보낼 때 내용을 바꾸므로 접속자마다 새로 만든다
    private record Event(String name, String body) {}

    private final ObjectMapper json;
    private final int maxClients;
    private final Set<Client> clients = ConcurrentHashMap.newKeySet();
    private final ExecutorService delivery;

    public LoungeStreamService(ObjectMapper json,
                               @Value("${app.lounge.max-streams:1000}") int maxClients,
                               @Value("${app.lounge.delivery-threads:4}") int threads) {
        this.json = json;
        this.maxClients = maxClients;
        this.delivery = Executors.newFixedThreadPool(threads, task -> {
            Thread thread = new Thread(task, "lounge-stream");
            thread.setDaemon(true);
            return thread;
        });
    }

    private final class Client {
        final SseEmitter emitter = new SseEmitter(120_000L);
        final BlockingQueue<Event> queue = new ArrayBlockingQueue<>(QUEUE_PER_CLIENT);
        final AtomicBoolean draining = new AtomicBoolean();
        volatile boolean closed;

        void offer(Event event) {
            if (closed) return;
            if (!queue.offer(event)) {   // 너무 밀린 연결은 끊고 다시 붙게 한다(다시 붙으면 스냅샷을 받는다)
                close();
                return;
            }
            schedule();
        }

        void schedule() {
            if (draining.compareAndSet(false, true)) delivery.execute(this::drain);
        }

        void drain() {
            try {
                Event event;
                while (!closed && (event = queue.poll()) != null) {
                    emitter.send(SseEmitter.event().name(event.name()).data(event.body(), MediaType.APPLICATION_JSON));
                }
            } catch (IOException | IllegalStateException error) {
                close();
            } finally {
                draining.set(false);
                if (!closed && !queue.isEmpty()) schedule();
            }
        }

        void close() {
            if (closed) return;
            closed = true;
            clients.remove(this);
            queue.clear();
            try { emitter.complete(); } catch (Exception ignored) { /* 이미 끊김 */ }
        }
    }

    /** 연결을 연다. 상한을 넘으면 null을 돌려준다(호출한 쪽이 "가득 참"을 알려 주고 화면은 몇 초마다 조회로 바꾼다). */
    public SseEmitter subscribe(Map<String, Object> snapshot) {
        if (clients.size() >= maxClients) return null;
        Client client = new Client();
        clients.add(client);
        client.emitter.onCompletion(client::close);
        client.emitter.onTimeout(client::close);
        client.emitter.onError(error -> client.close());
        client.offer(event("messages", snapshot));
        return client.emitter;
    }

    /** 상한을 넘은 사람에게 보내는 짧은 응답. 오류(예외)로 처리하지 않아 ERROR 로그와 긴급 알림을 만들지 않는다. */
    public SseEmitter full() {
        SseEmitter emitter = new SseEmitter(1_000L);
        try {
            emitter.send(SseEmitter.event().name("full").reconnectTime(60_000L).data("{\"pollMs\":3000}", MediaType.APPLICATION_JSON));
            emitter.complete();
        } catch (IOException | IllegalStateException ignored) { /* 이미 끊김 */ }
        return emitter;
    }

    /** 처음 목록 전체. 목록이 바뀌었을 때(삭제, 자정)만 쓴다. */
    public void publish(Map<String, Object> snapshot) { broadcast("messages", snapshot); }

    /** 새 글 하나. */
    public void publishMessage(Map<String, Object> row, long epoch) {
        broadcast("message", Map.of("message", row, "epoch", epoch));
    }

    /** 입장과 퇴장: 접속자 수와 참여자 목록만. */
    public void publishPresence(Object online, Object participants) {
        broadcast("presence", Map.of("online", online, "participants", participants));
    }

    public int connected() { return clients.size(); }

    private void broadcast(String name, Object data) {
        Event event = event(name, data);
        for (Client client : clients) client.offer(event);
    }

    private Event event(String name, Object data) {
        String body;
        try {
            body = json.writeValueAsString(data);   // 접속자 수와 관계없이 한 번만 만든다
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
        return new Event(name, body);
    }

    @Scheduled(fixedDelay = 15000)
    public void heartbeat() {
        Event beat = new Event("heartbeat", "\"\"");
        for (Client client : clients) client.offer(beat);
    }

    @PreDestroy
    public void close() {
        clients.forEach(Client::close);
        delivery.shutdownNow();
    }
}
