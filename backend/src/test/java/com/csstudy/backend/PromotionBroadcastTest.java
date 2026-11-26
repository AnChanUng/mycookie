package com.csstudy.backend;
import com.csstudy.backend.service.*;
import com.csstudy.backend.entity.UserTier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class PromotionBroadcastTest {
    @Autowired MockMvc mvc;
    @Autowired PromotionStreamService stream;
    @Autowired org.springframework.context.ApplicationEventPublisher publisher;
    @Autowired PlatformTransactionManager transactions;
    @Test void broadcastsToTwoConnectedBrowsersAfterCommitButNotLateArrivalsOrOnRollback() throws Exception {
        var first=mvc.perform(get("/api/v1/promotions/stream")).andExpect(request().asyncStarted()).andReturn();
        var other=mvc.perform(get("/api/v1/promotions/stream")).andExpect(request().asyncStarted()).andReturn();
        var tx=new TransactionTemplate(transactions);
        var event=new PromotionNoticeService.Promoted("user:private-test-id",15,
                new PromotionNoticeService.Notice("broadcast-test-id","승급한사람","다이아 Ⅴ",true));
        tx.executeWithoutResult(s->publisher.publishEvent(event));
        awaitText(first,"broadcast-test-id");awaitText(other,"broadcast-test-id");
        for(var result:new MvcResult[]{first,other}) {
            String body=result.getResponse().getContentAsString(StandardCharsets.UTF_8);
            assertTrue(body.contains("승급한사람"));assertTrue(body.contains("다이아 Ⅴ"));
            assertFalse(body.contains("private-test-id"));assertFalse(body.contains("대전"));
        }
        var late=mvc.perform(get("/api/v1/promotions/stream")).andExpect(request().asyncStarted()).andReturn();
        awaitText(late,"connected");
        // Retry/duplicate delivery is ignored for every current subscriber, including a late arrival.
        stream.promoted(event);stream.heartbeat();awaitText(late,"heartbeat");
        assertFalse(late.getResponse().getContentAsString().contains("broadcast-test-id"));
        String content=first.getResponse().getContentAsString();
        assertEquals(content.indexOf("broadcast-test-id"),content.lastIndexOf("broadcast-test-id"));
        tx.executeWithoutResult(s->{publisher.publishEvent(new PromotionNoticeService.Promoted("rollback-test",16,
                new PromotionNoticeService.Notice("rollback-notice-id","rollback","다이아 Ⅳ",false)));s.setRollbackOnly();});
        assertFalse(first.getResponse().getContentAsString().contains("rollback-notice-id"));
        for(var result:new MvcResult[]{first,other,late}) result.getRequest().getAsyncContext().complete();
    }
    private void awaitText(MvcResult result,String text) throws Exception {
        long deadline=System.nanoTime()+2_000_000_000L;
        while(!result.getResponse().getContentAsString(StandardCharsets.UTF_8).contains(text)&&System.nanoTime()<deadline)Thread.sleep(10);
        assertTrue(result.getResponse().getContentAsString(StandardCharsets.UTF_8).contains(text));
    }
    @Test void onlyUpwardChangesProduceAnAnnouncement() {
        var events=mock(org.springframework.context.ApplicationEventPublisher.class);
        var notices=new PromotionNoticeService(events);
        var below=MembershipService.describe(UserTier.GOLD,299).withNickname("nickname");
        var promoted=MembershipService.describe(UserTier.GOLD,300).withNickname("nickname");
        notices.announce("user:1",below,below);notices.announce("user:1",promoted,below);
        verifyNoInteractions(events);
        notices.announce("user:1",below,promoted);
        verify(events).publishEvent(argThat((Object value)->value instanceof PromotionNoticeService.Promoted event
                && event.notice().tierName().equals("다이아 쿠키 Ⅴ")&&event.notice().nickname().equals("nickname")&&event.notice().major()));
    }
    @Test void onlyATierChangeIsMajor() {
        var events=mock(org.springframework.context.ApplicationEventPublisher.class);
        var notices=new PromotionNoticeService(events);
        var low=MembershipService.describe(UserTier.DIAMOND,300).withNickname("nickname");
        var high=MembershipService.describe(UserTier.DIAMOND,350).withNickname("nickname");
        assertEquals(low.tier(),high.tier());assertTrue(high.division()<low.division());
        notices.announce("user:1",low,high);
        verify(events).publishEvent(argThat((Object value)->value instanceof PromotionNoticeService.Promoted event
                && !event.notice().major()));
    }
}
