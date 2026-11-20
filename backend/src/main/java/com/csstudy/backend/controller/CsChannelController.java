package com.csstudy.backend.controller;
import com.csstudy.backend.service.*;
import com.csstudy.backend.exception.*;
import com.csstudy.backend.entity.CsChannelDelivery;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
public class CsChannelController {
 private final CsChannelService channel;
 private final AdminAuth admin;
 private final jakarta.servlet.http.HttpServletRequest request;
 @GetMapping("/cs-channel") public Map<String,Object> publicInfo(){ return channel.info(false); }
 @GetMapping("/admin/cs-channel") public Map<String,Object> info(){admin.require(request.getHeader("X-Admin-Key"),request);return channel.info(true);}
 @PutMapping("/admin/cs-channel") public Map<String,Object> save(@RequestBody Map<String,Object> body){
  admin.require(request.getHeader("X-Admin-Key"),request);
  if(!(body.get("enabled") instanceof Boolean enabled) || !(body.get("index") instanceof Number index) || !(body.get("version") instanceof Number version) || !(body.get("joinUrl") instanceof String url)) throw new CookieException(CookieErrorCode.INVALID_REQUEST);
  return channel.update(enabled,index.intValue(),url.trim(),version.longValue());
 }
 @GetMapping("/admin/cs-channel/preview") public Map<String,String> preview(){admin.require(request.getHeader("X-Admin-Key"),request);return channel.preview();}
 @PostMapping("/admin/cs-channel/send") public CsChannelDelivery send(){admin.require(request.getHeader("X-Admin-Key"),request);return channel.send(false,null);}
 @PostMapping("/admin/cs-channel/test") public CsChannelDelivery test(){admin.require(request.getHeader("X-Admin-Key"),request);return channel.send(true,null);}
 @PostMapping("/admin/cs-channel/retry/{id}") public CsChannelDelivery retry(@PathVariable String id){admin.require(request.getHeader("X-Admin-Key"),request);return channel.send(false,id);}
}
