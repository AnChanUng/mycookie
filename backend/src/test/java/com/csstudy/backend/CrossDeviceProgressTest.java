package com.csstudy.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class CrossDeviceProgressTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private String token(String mode, String nickname) throws Exception {
        String response = mvc.perform(post("/api/v1/auth/" + mode).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("nickname",nickname,"password","test-password"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).path("token").asText();
    }
    private void save(String token, String company, String record) throws Exception {
        mvc.perform(put("/api/v1/exam/progress/" + company).header("Authorization",token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("data",record))))
                .andExpect(status().isOk());
    }
    private JsonNode read(String token, String company) throws Exception {
        String response = mvc.perform(get("/api/v1/exam/progress/" + company).header("Authorization",token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(json.readTree(response).path("data").asText());
    }
    @Test void twoDeviceSnapshotsPreserveDifferentQuestionsHistoryAndBookmarkRemoval() throws Exception {
        String phone=token("register","two-device-records"), pc=token("login","two-device-records");
        save(phone,"ibk","{\"stats\":{\"q1\":{\"w\":1,\"last\":\"w\",\"at\":100}},\"marks\":{\"q1\":{\"on\":true,\"at\":100}},\"history\":[{\"at\":100,\"mode\":\"exam\"}],\"updatedAt\":100}");
        save(pc,"ibk","{\"stats\":{\"q2\":{\"c\":1,\"last\":\"r\",\"at\":200}},\"marks\":{\"q1\":{\"on\":false,\"at\":200}},\"history\":[{\"at\":200,\"mode\":\"exam\"}],\"updatedAt\":200}");
        // A delayed snapshot must not remove q2 or restore an old bookmark.
        save(phone,"ibk","{\"stats\":{\"q1\":{\"w\":1,\"last\":\"w\",\"at\":100}},\"marks\":{\"q1\":{\"on\":true,\"at\":100}},\"history\":[{\"at\":100,\"mode\":\"exam\"}],\"updatedAt\":100}");
        JsonNode result=read(pc,"ibk");
        assertEquals(2,result.path("stats").size());
        assertEquals("w",result.at("/stats/q1/last").asText());
        assertEquals("r",result.at("/stats/q2/last").asText());
        assertFalse(result.at("/marks/q1/on").asBoolean());
        assertEquals(2,result.path("history").size());
        assertEquals(200,result.path("updatedAt").asLong());
    }
    @Test void notesFromBothDevicesKeepUncheckedTombstones() throws Exception {
        String phone=token("register","two-device-notes"),pc=token("login","two-device-notes");
        save(phone,"cs-notes-v1","{\"completed\":{\"db\":{\"done\":true,\"at\":10}}}");
        save(pc,"cs-notes-v1","{\"completed\":{\"os\":{\"done\":true,\"at\":20},\"db\":{\"done\":false,\"at\":20}}}");
        save(phone,"cs-notes-v1","{\"completed\":{\"db\":{\"done\":true,\"at\":10}}}");
        JsonNode result=read(phone,"cs-notes-v1");
        assertFalse(result.at("/completed/db/done").asBoolean());
        assertTrue(result.at("/completed/os/done").asBoolean());
    }
    @Test void concurrentFirstSavesAreSerializedWithoutLosingAnyDevice() throws Exception {
        String owner=token("register","concurrent-sync");
        var pool=Executors.newFixedThreadPool(4);
        var start=new CountDownLatch(1);
        try {
            List<Future<?>> results=new ArrayList<>();
            for(int i=0;i<8;i++) {
                final int id=i;
                results.add(pool.submit(() -> {
                    start.await();
                    save(owner,"ibk", "{\"stats\":{\"q"+id+"\":{\"c\":1,\"at\":"+(100+id)+"}}}");
                    return null;
                }));
            }
            start.countDown();
            for(Future<?> result:results) result.get(20,TimeUnit.SECONDS);
            assertEquals(8,read(owner,"ibk").path("stats").size());
        } finally { pool.shutdownNow(); }
    }
    @Test void invalidJsonCannotReplaceAnExistingRecord() throws Exception {
        String owner=token("register","invalid-sync");
        save(owner,"ibk","{\"stats\":{\"safe\":{\"c\":1,\"at\":1}}}");
        for(String invalid:List.of("not-json","[]","null")) {
            mvc.perform(put("/api/v1/exam/progress/ibk").header("Authorization",owner).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(Map.of("data",invalid)))).andExpect(status().isBadRequest());
        }
        assertTrue(read(owner,"ibk").path("stats").has("safe"));
    }
}
