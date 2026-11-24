package com.csstudy.backend.chatbot;

import com.csstudy.backend.security.ClientAddress;
import com.csstudy.backend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ChatbotScopeTest {
    private final GeminiClient parser = new GeminiClient(new ObjectMapper(), "", "", "");
    private final GeminiClient model = mock(GeminiClient.class);
    private final ChatbotIndex index = mock(ChatbotIndex.class);
    private final ChatbotQuota quota = mock(ChatbotQuota.class);
    private final ClientAddress address = mock(ClientAddress.class);
    private final ChatbotController controller = new ChatbotController(index, quota, model,
        mock(AuthService.class), address, mock(ChatbotStats.class));
    private final List<HybridIndex.Chunk> hits = List.of(new HybridIndex.Chunk("cs", "DB", "/db", "인덱스"));

    private java.util.Map<String,Object> ask(String payload) throws Exception {
        when(index.enabled()).thenReturn(true);
        when(index.search("질문", false)).thenReturn(hits);
        when(address.resolve(any())).thenReturn("127.0.0.1");
        when(quota.reserve(anyString(), eq(false))).thenReturn(9);
        when(model.answer("질문", hits)).thenAnswer(call -> parser.parseReply(payload));
        return controller.ask(new ChatbotController.Question("질문"), new MockHttpServletRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"OUT_OF_SCOPE", "CLARIFY"})
    void guidanceReplacesGeneratedTextAndSuppressesSearchHits(String intent) throws Exception {
        var response = ask("{\"intent\":\"" + intent + "\",\"answer\":\"임의의 추천 [1]\"}");
        assertEquals(intent, response.get("status"));
        assertFalse(response.get("answer").toString().contains("임의의 추천"));
        assertEquals(List.of(), response.get("sources"));
        assertEquals(false, response.get("grounded"));
        assertEquals(9, response.get("remainingToday"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"CS", "SITE"})
    void acceptedAnswerKeepsCitations(String intent) throws Exception {
        var response = ask("{\"intent\":\"" + intent + "\",\"answer\":\"문서 참고 [1]\"}");
        assertEquals("ANSWERED", response.get("status"));
        assertEquals("문서 참고 [1]", response.get("answer"));
        assertEquals(true, response.get("grounded"));
        assertEquals(1, ((List<?>)response.get("sources")).size());
    }

    @Test
    void unexpectedClassificationReturnsNoModelTextOrSources() throws Exception {
        var response = ask("{\"intent\":\"UNKNOWN\",\"answer\":\"임의 답변\"}");
        assertEquals("UNAVAILABLE", response.get("status"));
        assertEquals(List.of(), response.get("sources"));
    }
}
