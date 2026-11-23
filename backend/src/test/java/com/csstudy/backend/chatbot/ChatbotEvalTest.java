package com.csstudy.backend.chatbot;

import com.fasterxml.jackson.databind.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import java.nio.file.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class ChatbotEvalTest {
    interface Search { List<HybridIndex.Chunk> find(String question) throws Exception; }
    static int evaluate(String mode,Search search) throws Exception {
        var json=new ObjectMapper();
        var rows=new ArrayList<Map<String,Object>>();
        int hit=0, answerable=0, topOne=0;
        try(var in=new ClassPathResource("rag/eval-set.json").getInputStream()){
            for(var q:json.readTree(in).get("items")){
                var results=search.find(q.get("question").asText()).stream().map(HybridIndex.Chunk::source).toList();
                Set<String> gold=new HashSet<>();
                q.get("gold").forEach(g->gold.add(g.asText()));
                if(q.get("answerable").asBoolean()){
                    answerable++;
                    if(results.stream().anyMatch(gold::contains)) hit++;
                    if(!results.isEmpty() && gold.contains(results.get(0))) topOne++;
                }
                rows.add(Map.of("id",q.get("id").asText(),"results",results,"gold",gold));
            }
        }
        assertEquals(113,rows.size()); assertEquals(88,answerable);
        Path file=Path.of("build/reports/chatbot-"+mode+".json");
        Files.createDirectories(file.getParent());
        json.writerWithDefaultPrettyPrinter().writeValue(file.toFile(),Map.of("mode",mode,"hitsAt5",hit,"hitsAt1",topOne,"answerable",answerable,"rows",rows));
        return hit;
    }
    @Test void keywordBaseline() throws Exception {
        try(var in=new ClassPathResource("chatbot/public.json").getInputStream()){
            var chunks=List.of(new ObjectMapper().readValue(in,HybridIndex.Chunk[].class));
            var index=new HybridIndex(chunks,new float[chunks.size()][]);
            evaluate("bm25",q->index.search(q,null));
        }
    }
}

@EnabledIfEnvironmentVariable(named="CHATBOT_EVAL",matches="1")
class ChatbotHybridEvalTest {
    private final ObjectMapper json=new ObjectMapper();
    private final GeminiClient gemini=new GeminiClient(json,System.getenv().getOrDefault("GEMINI_API_KEY",""),
            "gemini-flash-lite-latest",System.getenv().getOrDefault("CHATBOT_EMBED_MODEL","gemini-embedding-001"));
    private float[] cached(String text,boolean query) throws Exception {
        var directory=Path.of("build/chatbot-eval-cache");
        Files.createDirectories(directory);
        var target=directory.resolve(ChatbotIndex.hash(gemini.embedModel+"|768|"+query+"|"+text)+".json");
        if(Files.exists(target)) return json.readValue(target.toFile(),float[].class);
        var vector=gemini.embed(text,query);
        var temp=Files.createTempFile(directory,"vector",".tmp");
        json.writeValue(temp.toFile(),vector);
        Files.move(temp,target,StandardCopyOption.REPLACE_EXISTING);
        Thread.sleep(1000);
        return vector;
    }
    @Test void evaluate() throws Exception {
        assertTrue(gemini.configured(),"Set GEMINI_API_KEY");
        try(var in=new ClassPathResource("chatbot/public.json").getInputStream()){
            var chunks=List.of(json.readValue(in,HybridIndex.Chunk[].class));
            var vectors=new float[chunks.size()][];
            for(int i=0;i<chunks.size();i++) vectors[i]=cached(chunks.get(i).text(),false);
            var index=new HybridIndex(chunks,vectors);
            int hits=ChatbotEvalTest.evaluate("hybrid",q->index.search(q,cached(q,true)));
            assertTrue(hits>=84,"Hit@5: "+hits+"/88");
        }
    }
}
