package com.csstudy.backend.config;
import org.springframework.context.annotation.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
@Configuration
public class CsChannelConfig {
 @Bean("csChannelHttp") public RestTemplate csChannelHttp() {
  var factory=new SimpleClientHttpRequestFactory();
  factory.setConnectTimeout(5000); factory.setReadTimeout(15000);
  return new RestTemplate(factory);
 }
}
