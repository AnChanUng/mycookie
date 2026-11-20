package com.csstudy.backend.service;
import com.csstudy.backend.entity.*;
import com.csstudy.backend.repository.*;
import com.csstudy.backend.exception.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.client.*;
import java.net.URI;
import java.time.*;
import java.util.*;

@Service
public class CsChannelService {
 private final CsChannelSettingsRepository settings;
 private final CsChannelDeliveryRepository deliveries;
 private final NewsletterLetter letters;
 private final RestTemplate http;
 private final TransactionTemplate tx;
 private final String webhook, base;
 public CsChannelService(CsChannelSettingsRepository settings, CsChannelDeliveryRepository deliveries,
   NewsletterLetter letters, @org.springframework.beans.factory.annotation.Qualifier("csChannelHttp") RestTemplate http, TransactionTemplate tx,
   @Value("${app.cs-channel.webhook-url:}") String webhook,
   @Value("${app.base-url:http://localhost:3000}") String base) {
  this.settings=settings; this.deliveries=deliveries; this.letters=letters; this.http=http; this.tx=tx;
  this.webhook=webhook.trim(); this.base=base.replaceAll("/+$", "");
 }
 public Map<String,Object> info(boolean admin) {
  var c=settings.findById(1L).orElseGet(CsChannelSettings::new);
  var out=new LinkedHashMap<String,Object>();
  out.put("enabled",c.isEnabled() && !webhook.isEmpty()); out.put("joinUrl",c.getJoinUrl());
  if(admin) {
   out.put("enabled",c.isEnabled()); out.put("configured",!webhook.isEmpty());
   out.put("index",c.getContentIndex()); out.put("version",c.getVersion()==null?0:c.getVersion());
   out.put("catalog",letters.catalog()); out.put("deliveries",deliveries.findTop30ByOrderByUpdatedAtDesc());
  }
  return out;
 }
 public Map<String,Object> update(boolean enabled,int index,String joinUrl,long version) {
  if(index<0 || index>=letters.size()) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
  if(joinUrl.length()>1000) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
  if(!joinUrl.isBlank()) try {
   URI uri=URI.create(joinUrl);
   if(!"https".equals(uri.getScheme()) || uri.getHost()==null || uri.getUserInfo()!=null) throw new IllegalArgumentException();
  } catch(IllegalArgumentException e) {throw new CookieException(CookieErrorCode.INVALID_REQUEST,"참여 링크는 HTTPS 주소로 입력해 주세요.");}
  tx.executeWithoutResult(s->{
   var c=settings.locked().orElseGet(CsChannelSettings::new);
   if((c.getVersion()==null?0:c.getVersion())!=version) throw new CookieException(CookieErrorCode.CONFLICT,"다른 관리자가 수정했습니다. 새로고침 후 다시 저장해 주세요.");
   if(enabled && (webhook.isEmpty() || joinUrl.isBlank())) throw new CookieException(CookieErrorCode.INVALID_REQUEST,"웹훅과 참여 링크를 준비한 후 활성화해 주세요.");
   c.setEnabled(enabled); c.setContentIndex(index); c.setJoinUrl(joinUrl); settings.saveAndFlush(c);
  });
  return info(true);
 }
 public Map<String,String> preview() {
  int index=settings.findById(1L).map(CsChannelSettings::getContentIndex).orElse(0);
  return preview(index);
 }
 private Map<String,String> preview(int index) {
  var item=letters.catalog().get(index);
  String link=base+"/web-essentials#"+item.id();
  return Map.of("title",item.title(),"text","### 오늘의 CS · "+item.topic()+"\n\n**"+item.title()+"**\n\n"+item.question()+"\n\n"+item.answer()+"\n\n확인 질문: 이 개념을 내 프로젝트에 적용한다면 어떤 문제를 해결할까요?\n\n[원문에서 학습하기]("+link+")");
 }
 private record Claim(CsChannelDelivery delivery, boolean send) {}
 public CsChannelDelivery send(boolean test,String retryId) {
  if(webhook.isEmpty()) throw new CookieException(CookieErrorCode.SERVICE_UNAVAILABLE,"CS 채널 웹훅이 설정되지 않았습니다.");
  Claim claim=tx.execute(s->{
   var c=settings.locked().orElseThrow(()->new CookieException(CookieErrorCode.INVALID_REQUEST,"채널 설정을 먼저 저장해 주세요."));
   String id=retryId!=null?retryId:(test?"test-"+UUID.randomUUID():LocalDate.now(ZoneId.of("Asia/Seoul")).toString());
   var d=deliveries.findById(id).orElse(null);
   boolean retryTest=retryId!=null && d!=null && d.getId().startsWith("test-");
   if(!test && !retryTest && !c.isEnabled()) throw new CookieException(CookieErrorCode.INVALID_REQUEST,"발송이 중지되어 있습니다.");
   if(retryId!=null && (d==null || !"FAILED".equals(d.getStatus()))) throw new CookieException(CookieErrorCode.INVALID_REQUEST,"거절된 발송만 재시도할 수 있습니다.");
   if(d!=null && retryId==null) return new Claim(d,false);
   if(d==null) { d=new CsChannelDelivery(); d.setId(id); d.setContentIndex(c.getContentIndex()); }
   d.setAttempts(d.getAttempts()+1); d.setStatus("PENDING"); d.setError(null); d.setUpdatedAt(Instant.now());
   return new Claim(deliveries.saveAndFlush(d),true);
  });
  if(!claim.send()) return claim.delivery();
  // 네트워크 요청 전에 발송 예약을 확정한다. 프로세스가 중단돼도 같은 일일 발송을 재전송하지 않는다.
  var d=claim.delivery();
  try {
   http.postForEntity(webhook,Map.of("username","나의쿠키 CS","text",preview(d.getContentIndex()).get("text")),String.class);
   d.setStatus("SENT"); d.setError(null);
  } catch(HttpClientErrorException e) {
   d.setStatus("FAILED"); d.setError("채널이 요청을 거절했습니다. 웹훅 권한과 설정을 확인해 주세요.");
  } catch(RestClientException e) {
   d.setStatus("UNKNOWN"); d.setError("수신 여부를 확인할 수 없습니다. 채널에서 실제 게시 여부를 확인해 주세요. 중복 방지를 위해 재시도는 잠깁니다.");
  }
  d.setUpdatedAt(Instant.now());
  return tx.execute(s->deliveries.saveAndFlush(d));
 }
 @Scheduled(cron="${app.cs-channel.cron:0 30 8 * * MON-FRI}",zone="Asia/Seoul")
 public void scheduled() {
  if(webhook.isEmpty() || !settings.findById(1L).map(CsChannelSettings::isEnabled).orElse(false)) return;
  send(false,null);
 }
}
