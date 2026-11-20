package com.csstudy.backend;
import com.csstudy.backend.service.MattermostService;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;
class MattermostNoticeTest {
 @Test void operationalNoticesStillUseWebhookAndPropagateFailure() {
  var http=new RestTemplate();var mock=MockRestServiceServer.bindTo(http).build();
  var off=new MattermostService(http," ","https://mycookie.dev/");
  assertThat(off.postNotice("제보 접수")).isFalse();
  var service=new MattermostService(http,"https://mm.example.test/hook","https://mycookie.dev/");
  mock.expect(requestTo("https://mm.example.test/hook")).andExpect(content().json("{\"username\":\"나의쿠키\",\"text\":\"제보 접수\"}"))
      .andRespond(withSuccess("ok",MediaType.TEXT_PLAIN));
  assertThat(service.postNotice("제보 접수")).isTrue();assertThat(service.baseUrl()).isEqualTo("https://mycookie.dev");mock.verify();mock.reset();
  mock.expect(requestTo("https://mm.example.test/hook")).andRespond(withServerError());
  assertThatThrownBy(()->service.postNotice("제보 접수")).isInstanceOf(org.springframework.web.client.RestClientException.class);
  mock.verify();
 }
}
