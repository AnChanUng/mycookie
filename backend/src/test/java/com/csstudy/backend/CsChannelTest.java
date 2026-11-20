package com.csstudy.backend;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

@SpringBootTest(properties={"app.admin-key=test-admin-key-0123456789abcdef-xyz", "app.cs-channel.webhook-url=https://channel.example.test/hook"})
@AutoConfigureMockMvc @ActiveProfiles("test")
class CsChannelTest {
    @Autowired MockMvc mvc;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
    @Autowired @org.springframework.beans.factory.annotation.Qualifier("csChannelHttp") RestTemplate http;
    static final String KEY="test-admin-key-0123456789abcdef-xyz";
    @Test void channelRequiresAdminAndSuccessfulDailyDeliveryCannotBeRepeated() throws Exception {
        mvc.perform(get("/api/v1/admin/cs-channel")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/cs-channel")).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(false));
        mvc.perform(put("/api/v1/admin/cs-channel").header("X-Admin-Key",KEY).contentType(MediaType.APPLICATION_JSON)
            .content("{\"enabled\":true,\"index\":0,\"joinUrl\":\"https://mattermost.example.test/signup\",\"version\":0}"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/admin/cs-channel/preview").header("X-Admin-Key",KEY))
            .andExpect(status().isOk()).andExpect(jsonPath("$.text").isNotEmpty());
        var mock=MockRestServiceServer.bindTo(http).build();
        try {
            mock.expect(requestTo("https://channel.example.test/hook")).andRespond(withSuccess());
            for(int i=0;i<2;i++) mvc.perform(post("/api/v1/admin/cs-channel/send").header("X-Admin-Key",KEY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SENT"));
            mock.verify();
            mock.reset();
            mvc.perform(put("/api/v1/admin/cs-channel").header("X-Admin-Key",KEY).contentType(MediaType.APPLICATION_JSON)
                .content("{\"enabled\":false,\"index\":0,\"joinUrl\":\"https://mattermost.example.test/signup\",\"version\":0}"))
                .andExpect(status().isOk());
            mock.expect(requestTo("https://channel.example.test/hook")).andRespond(withBadRequest());
            var failed=mvc.perform(post("/api/v1/admin/cs-channel/test").header("X-Admin-Key",KEY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("FAILED"));
            String id=json.readTree(failed.andReturn().getResponse().getContentAsString()).get("id").asText();
            mock.verify();mock.reset();
            mock.expect(requestTo("https://channel.example.test/hook")).andRespond(withSuccess());
            mvc.perform(post("/api/v1/admin/cs-channel/retry/"+id).header("X-Admin-Key",KEY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SENT"));
            mvc.perform(post("/api/v1/admin/cs-channel/retry/"+id).header("X-Admin-Key",KEY))
                .andExpect(status().isBadRequest());
            mock.verify();mock.reset();
            mock.expect(requestTo("https://channel.example.test/hook")).andRespond(request->{throw new java.net.SocketTimeoutException("secret-hook-address");});
            mvc.perform(post("/api/v1/admin/cs-channel/test").header("X-Admin-Key",KEY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UNKNOWN"))
                .andExpect(jsonPath("$.error",org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("secret-hook-address"))));
            mock.verify();
        } finally { mock.reset(); }
    }
}
