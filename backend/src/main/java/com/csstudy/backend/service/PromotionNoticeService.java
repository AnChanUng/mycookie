package com.csstudy.backend.service;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import java.util.UUID;
@Service @RequiredArgsConstructor
public class PromotionNoticeService {
    private final ApplicationEventPublisher events;
    // major: 등급 자체가 바뀐 승급(은→금, 금→다이아 등). 화면은 이것만 모두에게 띄우고, 단계만 오른 승급은 본인에게만 띄운다
    public record Notice(String id,String nickname,String tierName,boolean major) {}
    public record Promoted(String subjectKey,int level,Notice notice) {}
    public void announce(String key,MembershipService.Membership before,MembershipService.Membership after) {
        int oldLevel=before.tier().ordinal()*5+5-before.division();
        int newLevel=after.tier().ordinal()*5+5-after.division();
        boolean major=after.tier().ordinal()>before.tier().ordinal();
        if(newLevel>oldLevel) events.publishEvent(new Promoted(key,newLevel,
                new Notice(UUID.randomUUID().toString(),after.nickname(),after.tierName(),major)));
    }
}
