package com.csstudy.backend.chatbot;

import com.csstudy.backend.security.ClientAddress;
import com.csstudy.backend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/chatbot")
@RequiredArgsConstructor
public class ChatbotController {
    private final ChatbotIndex index;
    private final ChatbotQuota quota;
    private final GeminiClient gemini;
    private final AuthService auth;
    private final ClientAddress address;
    private final ChatbotStats stats;
    record Question(String message){}
    @GetMapping("/status")
    public Map<String,Boolean> status(){ return Map.of("enabled",index.enabled(),"hybridReady",index.complete()); }
    @PostMapping("/ask")
    public Map<String,Object> ask(@RequestBody Question body,HttpServletRequest req) throws Exception {
        if(!index.enabled()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        String q=body.message()==null?"":body.message().strip();
        if(q.isEmpty() || q.length()>500) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var user=auth.currentUser(req);
        String actor=user.map(u->"user:"+u.getId()).orElse("guest:"+ChatbotIndex.hash(address.resolve(req)));
        quota.initialize();
        int remaining=quota.reserve(actor,user.isPresent());
        List<HybridIndex.Chunk> hits;
        try { hits=index.search(q,index.complete()); }
        catch(Exception unavailable){ hits=index.search(q,false); }
        String answer;
        try { answer=gemini.answer(q,hits); stats.record(true); }
        catch(Exception unavailable){ stats.record(false); answer="지금은 답변을 생성하기 어려워요. 관련 자료를 확인해 주세요."; }
        var sources=new ArrayList<Map<String,Object>>();
        boolean grounded=false;
        for(var hit:hits){
            int n=sources.size()+1;
            grounded |= answer.contains("["+n+"]");
            sources.add(Map.of("n",n,"title",hit.title(),"url",hit.url(),"excerpt",hit.text()));
        }
        return Map.of("answer",answer,"grounded",grounded,"sources",sources,"remainingToday",remaining);
    }
}
