package com.csstudy.backend.chatbot;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Component;

@Component
public class ChatbotStats {
    private final AtomicLong answers=new AtomicLong(), errors=new AtomicLong();
    private final GeminiClient gemini;
    private volatile String lastChat="", lastError="";
    public ChatbotStats(GeminiClient gemini){this.gemini=gemini;}
    void record(boolean successful){
        lastChat=Instant.now().toString();
        if(successful) answers.incrementAndGet();
        else {errors.incrementAndGet(); lastError=lastChat;}
    }
    public Map<String,Object> adminStatus(){
        return Map.of("geminiConfigured",gemini.configured(),"aiReplies",answers.get(),"fallbackReplies",errors.get(),
                "geminiErrors",errors.get(),"lastChatAt",lastChat,"lastErrorAt",lastError,"lastError","답변 생성 실패");
    }
}
