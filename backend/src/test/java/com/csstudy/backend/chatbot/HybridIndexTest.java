package com.csstudy.backend.chatbot;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;

class HybridIndexTest {
    @Test void agreementAcrossRankingsBeatsASingleFirstPlace(){
        var chunks=List.of(new HybridIndex.Chunk("keyword","heap heap","/notes","heap heap heap"),
                new HybridIndex.Chunk("both","heap","/notes","heap tree memory"),
                new HybridIndex.Chunk("meaning","priority","/notes","queue"));
        var index=new HybridIndex(chunks,new float[][]{{0,1},{0.9f,0.436f},{1,0}});
        assertEquals("keyword",index.search("heap",null).get(0).source());
        assertEquals("both",index.search("heap",new float[]{1,0}).get(0).source());
    }
    @Test void packagedCorpusHasOnlyPublicSourceFamilies() throws Exception {
        try(var in=new ClassPathResource("chatbot/public.json").getInputStream()){
            for(var c:new ObjectMapper().readValue(in,HybridIndex.Chunk[].class)){
                assertTrue(c.source().matches("(algorithm|data-structure|database|java|network|operating-system|software-engineering|spring)/[0-9]+-[a-z0-9-]+\\.md|/(notes|web-essentials)/[a-zA-Z0-9_-]+|guide/[a-z-]+"), c.source());
                assertFalse(c.url().contains("private"));
            }
        }
    }
}
