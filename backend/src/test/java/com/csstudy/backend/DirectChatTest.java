package com.csstudy.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.Map;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class DirectChatTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    String register(String name) throws Exception {
        var result = mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("nickname", name, "password", "test-password"))))
            .andExpect(status().isOk()).andReturn();
        return "Bearer " + json.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }
    @Test void privateConversationFriendConsentAndRetry() throws Exception {
        String a=register("dm-test-a"), b=register("dm-test-b"), c=register("dm-test-c");
        mvc.perform(get("/api/v1/direct")).andExpect(status().isUnauthorized());
        var created=mvc.perform(post("/api/v1/direct").header("Authorization",a)
            .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"dm-test-b\"}"))
            .andExpect(status().isOk()).andReturn();
        long id=json.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        String path="/api/v1/direct/"+id;
        mvc.perform(post("/api/v1/direct").header("Authorization",b).contentType(MediaType.APPLICATION_JSON)
            .content("{\"nickname\":\"dm-test-a\"}")).andExpect(jsonPath("$.id").value(id));
        mvc.perform(get(path+"/messages").header("Authorization",c)).andExpect(status().isNotFound());
        mvc.perform(post(path+"/friend").header("Authorization",a).contentType(MediaType.APPLICATION_JSON)
            .content("{\"action\":\"request\"}")).andExpect(jsonPath("$.friendship").value("sent"));
        mvc.perform(post(path+"/friend").header("Authorization",a).contentType(MediaType.APPLICATION_JSON)
            .content("{\"action\":\"accept\"}")).andExpect(status().isConflict());
        mvc.perform(post(path+"/friend").header("Authorization",c).contentType(MediaType.APPLICATION_JSON)
            .content("{\"action\":\"accept\"}")).andExpect(status().isNotFound());
        mvc.perform(post(path+"/friend").header("Authorization",b).contentType(MediaType.APPLICATION_JSON)
            .content("{\"action\":\"accept\"}")).andExpect(jsonPath("$.friendship").value("friends"));
        for(int i=0;i<2;i++) mvc.perform(post(path+"/messages").header("Authorization",a)
            .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"private hello\",\"clientId\":\"one-send\"}"))
            .andExpect(status().isOk());
        mvc.perform(get(path+"/messages").header("Authorization",b)).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].mine").value(false));
        mvc.perform(get("/api/v1/direct").header("Authorization",b)).andExpect(jsonPath("$[0].unread").value(1));
        mvc.perform(post(path+"/read").header("Authorization",c).contentType(MediaType.APPLICATION_JSON)
            .content("{\"last\":999999}" )).andExpect(status().isNotFound());
        mvc.perform(post(path+"/read").header("Authorization",b).contentType(MediaType.APPLICATION_JSON)
            .content("{\"last\":999999}" )).andExpect(status().isOk());
        mvc.perform(get("/api/v1/direct").header("Authorization",b)).andExpect(jsonPath("$[0].unread").value(0));
        mvc.perform(get("/api/v1/direct").header("Authorization",c)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(post(path+"/friend").header("Authorization",b).contentType(MediaType.APPLICATION_JSON)
            .content("{\"action\":\"remove\"}")).andExpect(jsonPath("$.friendship").value("none"));
    }
}
