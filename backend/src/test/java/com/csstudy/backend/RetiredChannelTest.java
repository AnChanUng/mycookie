package com.csstudy.backend;
import com.csstudy.backend.entity.DevLogEntry;
import com.csstudy.backend.repository.DevLogEntryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.time.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")
class RetiredChannelTest {
 @Autowired MockMvc mvc;
 @Autowired DevLogEntryRepository logs;
 @Autowired ObjectMapper json;
 @Autowired ApplicationEventPublisher events;
 @Autowired ConfigurableApplicationContext context;
 @Test void retiredPublicChannelEndpointIsUnavailable() throws Exception {
  mvc.perform(get("/api/v1/cs-channel")).andExpect(status().isNotFound());
 }
 @Test void cancelledTaskIsRemovedWithoutDeletingOtherPlans() throws Exception {
  var row=new DevLogEntry();row.setLogDate(LocalDate.of(2026,11,23));row.setTitle("개발 2일차");
  row.setItemsJson("[{\"id\":\"cs-channel-102\",\"text\":\"취소 과제\"},{\"id\":\"keep\",\"text\":\"유지할 과제\"}]");
  row=logs.saveAndFlush(row);
  events.publishEvent(new ApplicationReadyEvent(new SpringApplication(),new String[0],context,Duration.ZERO));
  var updated=logs.findById(row.getId()).orElseThrow();
  assertThat(json.readTree(updated.getItemsJson())).hasSize(1);
  assertThat(json.readTree(updated.getItemsJson()).get(0).path("id").asText()).isEqualTo("keep");
  Long version=updated.getVersion();
  events.publishEvent(new ApplicationReadyEvent(new SpringApplication(),new String[0],context,Duration.ZERO));
  assertThat(logs.findById(row.getId()).orElseThrow().getVersion()).isEqualTo(version);
 }
}
