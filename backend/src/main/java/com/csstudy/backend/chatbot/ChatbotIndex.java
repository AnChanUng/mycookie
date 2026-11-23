package com.csstudy.backend.chatbot;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.slf4j.LoggerFactory;

@Service
public class ChatbotIndex {
    private final JdbcTemplate db;
    private final GeminiClient gemini;
    private final List<HybridIndex.Chunk> chunks;
    private final boolean enabled;
    private volatile HybridIndex active;
    private volatile boolean complete;
    public ChatbotIndex(JdbcTemplate db,GeminiClient gemini,ObjectMapper json,@Value("${CHATBOT_ENABLED:true}") boolean enabled) throws Exception {
        this.db=db; this.gemini=gemini; this.enabled=enabled;
        try(var in=new ClassPathResource("chatbot/public.json").getInputStream()) {
            chunks=List.of(json.readValue(in,HybridIndex.Chunk[].class));
        }
        active=new HybridIndex(chunks,new float[chunks.size()][]);
    }
    public boolean enabled(){ return enabled && gemini.configured(); }
    public boolean complete(){ return complete; }
    @EventListener(ApplicationReadyEvent.class)
    public void start(){
        if(!enabled()) return;
        Thread task=new Thread(()->{
            try {
                db.execute("create table if not exists chatbot_chunks (hash varchar(64) primary key, source text not null, title text not null, body text not null, embedding real[] not null)");
                float[][] vectors=new float[chunks.size()][];
                for(int i=0;i<chunks.size();i++){
                    var c=chunks.get(i);
                    String hash=hash(gemini.embedModel+"|768|"+c.source()+"|"+c.text());
                    var cached=db.query("select embedding::text from chatbot_chunks where hash=?", (rs,row)->rs.getString(1),hash);
                    if(cached.isEmpty()){
                        vectors[i]=gemini.embed(c.text(),false);
                        String encoded=Arrays.toString(vectors[i]).replace('[','{').replace(']','}');
                        db.update("insert into chatbot_chunks values (?,?,?,?,?::real[]) on conflict do nothing",hash,c.source(),c.title(),c.text(),encoded);
                        Thread.sleep(1000);
                    } else {
                        String value=cached.get(0);
                        String[] parts=value.substring(1,value.length()-1).split(",");
                        if(parts.length!=768) throw new IllegalStateException("Invalid cached vector");
                        vectors[i]=new float[768];
                        for(int j=0;j<768;j++) vectors[i][j]=Float.parseFloat(parts[j]);
                    }
                }
                active=new HybridIndex(chunks,vectors);
                complete=true;
            } catch(Exception e){LoggerFactory.getLogger(getClass()).warn("Chatbot indexing incomplete ({}), using keyword search",e.getClass().getSimpleName());}
        },"chatbot-index");
        task.setDaemon(true);task.start();
    }
    static String hash(String text) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
    }
    public List<HybridIndex.Chunk> search(String q,boolean hybrid) throws Exception {
        if(hybrid && !complete) throw new IllegalStateException("Hybrid index not ready");
        return active.search(q,hybrid?gemini.embed(q,true):null);
    }
}
