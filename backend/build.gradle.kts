plugins {
    java
    id("org.springframework.boot") version "3.5.16"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.csstudy"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

configurations {
    compileOnly {
        extendsFrom(configurations.annotationProcessor.get())
    }
}

repositories {
    mavenCentral()
}

// Spring AI 1.1.x는 Spring Boot 3.5 계열을 기준으로 한다
extra["springAiVersion"] = "1.1.8"

dependencyManagement {
    imports {
        mavenBom("org.springframework.ai:spring-ai-bom:${property("springAiVersion")}")
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    // API 문서(Swagger UI). 운영에서는 /api/docs 로 열리고 아이디 · 비밀번호(SWAGGER_USER · SWAGGER_PASSWORD)로 막는다
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.17")
    // HikariCP 커넥션 풀 지표(active · idle · pending · 획득 시간)를 Micrometer로 본다
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.security:spring-security-crypto")
    // 비밀번호 재설정 · 이메일 인증 메일. 온프레미스 SMTP 서버를 그대로 쓴다
    implementation("org.springframework.boot:spring-boot-starter-mail")
    // 홈서버: 접속자 수, 요청 제한 같은 짧게 사는 상태는 Redis에, 제보 처리 같은 비동기 작업은 Kafka 이벤트로
    // (REDIS_ENABLED, KAFKA_ENABLED가 꺼져 있으면 지금처럼 메모리와 바로 처리로 동작한다)
    implementation("org.springframework.boot:spring-boot-starter-data-redis")
    implementation("org.springframework.kafka:spring-kafka")

    // RAG 학습 도우미: ChromaDB 벡터 저장소, OpenAI 호환 임베딩(로컬 TEI의 bge-m3), Gemini 답변 생성, RAG 어드바이저
    implementation("org.springframework.ai:spring-ai-starter-vector-store-chroma")
    implementation("org.springframework.ai:spring-ai-starter-model-openai")
    implementation("org.springframework.ai:spring-ai-starter-model-google-genai")
    implementation("org.springframework.ai:spring-ai-rag")

    runtimeOnly("org.postgresql:postgresql")

    compileOnly("org.projectlombok:lombok")
    annotationProcessor("org.projectlombok:lombok")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("com.h2database:h2")
    // 동시성 검증은 운영과 같은 PostgreSQL에서 한다. Docker가 없으면 해당 테스트는 건너뛴다
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:postgresql")
    testImplementation("org.testcontainers:kafka")
}

tasks.withType<Test> {
    useJUnitPlatform()
    // 전체 통합 테스트의 Spring 컨텍스트와 검색 인덱스를 담을 테스트 JVM 메모리.
    // 운영 앱이나 Gradle 데몬의 메모리 설정에는 영향을 주지 않는다.
    maxHeapSize = "1g"
}
