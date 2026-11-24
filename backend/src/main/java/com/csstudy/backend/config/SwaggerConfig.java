package com.csstudy.backend.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

// API 문서(Swagger UI)의 제목과 인증 방식. 로그인 토큰(Bearer)과 관리자 키(X-Admin-Key)를 문서에서 넣어 볼 수 있다
@Configuration
public class SwaggerConfig {
    @Bean
    OpenAPI mycookieOpenApi() {
        return new OpenAPI()
                .info(new Info().title("나의쿠키 API").version("v1")
                        .description("나의쿠키 백엔드 API 문서입니다. 로그인이 필요한 API는 오른쪽 위 Authorize에 로그인 토큰을 넣고 호출합니다."))
                // 프록시 뒤에서도 https 그대로 호출되게 문서를 연 주소(같은 출처)로 보낸다
                .servers(List.of(new Server().url("/").description("이 서버")))
                .components(new Components()
                        .addSecuritySchemes("login", new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer"))
                        .addSecuritySchemes("adminKey", new SecurityScheme().type(SecurityScheme.Type.APIKEY)
                                .in(SecurityScheme.In.HEADER).name("X-Admin-Key")))
                .addSecurityItem(new SecurityRequirement().addList("login"));
    }
}
