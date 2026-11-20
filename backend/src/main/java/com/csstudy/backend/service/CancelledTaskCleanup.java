package com.csstudy.backend.service;
import com.csstudy.backend.repository.DevLogEntryRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;

// 취소된 과제 한 건만 정리한다. 같은 날짜의 다른 일정·메모는 그대로 보존한다.
@Component @RequiredArgsConstructor @Slf4j
public class CancelledTaskCleanup {
 private final DevLogEntryRepository logs;
 private final ObjectMapper json;
 @EventListener(ApplicationReadyEvent.class) @Transactional
 public void cleanup() {
  logs.findByLogDate(LocalDate.of(2026,11,23)).ifPresent(row->{
   try {
    var value=json.readTree(row.getItemsJson());
    if(!(value instanceof ArrayNode items)) return;
    var kept=json.createArrayNode();
    for(var item:items) if(!"cs-channel-102".equals(item.path("id").asText())) kept.add(item);
    if(kept.size()==items.size()) return;
    row.setItemsJson(json.writeValueAsString(kept)); row.setUpdatedAt(Instant.now()); row.setUpdatedBy("일정 정리");
    logs.save(row);
   } catch(JsonProcessingException e) { log.warn("취소 과제 정리: 개발 일지 형식을 확인해 주세요."); }
  });
 }
}
