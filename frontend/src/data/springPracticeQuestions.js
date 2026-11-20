// 자체 제작 4지선다. Spring Boot 3 / Spring Framework 6 / Security 6 / MyBatis 3 / JUnit 5 기준.
export const SPRING_PRACTICE_SECTIONS = {
  "core": {
    "name": "Spring 핵심·IoC/DI",
    "short": "Spring 핵심",
    "sub": "Spring 핵심·IoC/DI",
    "count": 9
  },
  "boot": {
    "name": "Boot·로깅·테스트",
    "short": "Boot",
    "sub": "Boot·로깅·테스트",
    "count": 5
  },
  "aop": {
    "name": "AOP·트랜잭션",
    "short": "AOP",
    "sub": "AOP·트랜잭션",
    "count": 6
  },
  "mvc": {
    "name": "MVC·웹 계층",
    "short": "MVC",
    "sub": "MVC·웹 계층",
    "count": 8
  },
  "mybatis": {
    "name": "MyBatis·동적 SQL",
    "short": "MyBatis",
    "sub": "MyBatis·동적 SQL",
    "count": 6
  },
  "security": {
    "name": "Security 기초",
    "short": "Security 기초",
    "sub": "Security 기초",
    "count": 6
  }
};

export const SPRING_PRACTICE_QUESTIONS = [
  {
    "id": "sppractice01",
    "sec": "core",
    "topic": "프레임워크와 라이브러리",
    "q": "프레임워크와 라이브러리의 일반적인 차이로 가장 적절한 것은?",
    "o": [
      "프레임워크는 전체 실행 흐름을 관리하며 필요한 사용자 코드를 호출한다",
      "라이브러리는 항상 애플리케이션 전체 생명주기를 관리한다",
      "프레임워크에서는 개발자가 작성한 코드를 실행할 수 없다",
      "라이브러리를 사용하면 반드시 DI 컨테이너가 생성된다"
    ],
    "a": 0,
    "e": "프레임워크는 정해진 실행 흐름 안에서 사용자 코드를 호출하는 구조를 제공한다. 라이브러리는 보통 사용자 코드가 필요한 기능을 호출한다. 이 제어권의 차이가 제어의 역전을 설명하는 출발점이다."
  },
  {
    "id": "sppractice02",
    "sec": "core",
    "topic": "IoC·AOP·PSA",
    "q": "Spring의 대표 특징과 설명을 올바르게 연결한 것은?",
    "o": [
      "IoC는 SQL 자동 생성, AOP는 객체 직렬화이다",
      "DI는 객체가 필요한 의존 객체를 직접 검색하는 것이다",
      "AOP는 공통 관심사를 분리하고, PSA는 기술별 구현을 일관된 추상화로 다루도록 돕는다",
      "PSA를 사용하면 어떤 DB에서도 모든 SQL 문법이 같아진다"
    ],
    "a": 2,
    "e": "AOP는 로깅·트랜잭션 등의 공통 관심사를 분리한다. PSA는 PlatformTransactionManager 같은 추상화로 구현 기술의 차이를 감싼다. DI는 의존 객체를 외부에서 주입하는 방식이며 PSA가 SQL 방언까지 통일하지는 않는다."
  },
  {
    "id": "sppractice03",
    "sec": "core",
    "topic": "POJO",
    "q": "POJO에 대한 설명으로 가장 적절한 것은?",
    "o": [
      "특정 프레임워크 클래스를 반드시 상속한 객체",
      "특정 실행 기술의 상속 구조 등에 강하게 묶이지 않은 일반 Java 객체",
      "필드와 메서드가 없는 객체",
      "반드시 static 메서드만 사용하는 객체"
    ],
    "a": 1,
    "e": "POJO는 Plain Old Java Object를 뜻한다. 비즈니스 로직이 특정 컨테이너 API에 과도하게 종속되지 않도록 구성하는 취지다. Spring 어노테이션이 붙었다는 이유만으로 비즈니스 객체의 POJO 지향 설계가 불가능해지는 것은 아니다."
  },
  {
    "id": "sppractice04",
    "sec": "core",
    "topic": "명시적 빈 등록",
    "q": "외부 라이브러리 Client 객체를 직접 생성해 빈으로 등록하려 한다. 적절한 방법은?",
    "o": [
      "Client의 모든 메서드에 @Autowired를 붙인다",
      "new Client()를 호출하면 자동 등록된다",
      "Client 클래스를 수정할 수 없으면 빈 등록도 불가능하다",
      "설정 클래스의 @Bean 메서드에서 Client 객체를 반환한다"
    ],
    "a": 3,
    "e": "@Bean은 개발자가 생성 방법을 명시하여 반환 객체를 컨테이너에 등록할 때 사용한다. 특히 수정할 수 없는 외부 라이브러리 객체에 적합하다. 단순한 new 호출만으로는 컨테이너에 등록되지 않는다."
  },
  {
    "id": "sppractice05",
    "sec": "core",
    "topic": "@Configuration 싱글톤",
    "q": "다음 설정을 컨테이너에 등록했다. A는 생성자로 받은 B를 보관하며 추가 설정은 없다. a가 보관한 B와 getBean(B.class)의 참조 비교 결과는?\n```java\n@Configuration\nclass Config {\n  @Bean A a() { return new A(b()); }\n  @Bean B b() { return new B(); }\n}\n```",
    "o": [
      "false, b()는 항상 일반 Java 호출이다",
      "true, 기본 @Configuration 프록시가 빈 간 호출에 관리 중인 B를 반환한다",
      "컴파일 오류, @Bean 메서드끼리는 호출할 수 없다",
      "true, Java가 같은 클래스의 new 호출을 자동 캐싱한다"
    ],
    "a": 1,
    "e": "기본 proxyBeanMethods=true인 @Configuration은 설정 클래스를 프록시로 만들어 @Bean 메서드 간 호출에도 관리 중인 싱글톤을 사용하게 한다. proxyBeanMethods=false에서 직접 b()를 호출하면 일반 메서드 호출이 되어 새 B가 만들어질 수 있다. Java 자체의 캐싱 기능이 아니다."
  },
  {
    "id": "sppractice06",
    "sec": "core",
    "topic": "생명주기",
    "q": "일반적인 빈에서 생성자 주입, @Autowired 필드 주입, @PostConstruct의 순서는?",
    "o": [
      "필드 주입 → @PostConstruct → 생성자",
      "@PostConstruct → 생성자 → 필드 주입",
      "생성자 실행 시 생성자 주입 → 필드 주입 → @PostConstruct",
      "필드 주입과 생성자 주입은 항상 @PostConstruct 이후"
    ],
    "a": 2,
    "e": "생성자 의존성을 해결해 객체를 생성한 다음 필드·세터 등 프로퍼티 주입을 수행하고 초기화 콜백을 호출한다. 따라서 필드 주입 대상은 생성자 안에서는 아직 주입되지 않았을 수 있다. @PostConstruct에서는 일반적으로 주입된 의존성을 사용할 수 있다."
  },
  {
    "id": "sppractice07",
    "sec": "core",
    "topic": "빈 스코프",
    "q": "동일 컨테이너에서 동일 빈 이름으로 두 번 조회한다. 싱글톤과 프로토타입의 일반적인 동작은?",
    "o": [
      "싱글톤은 동일 인스턴스, 프로토타입은 조회할 때마다 새 인스턴스를 반환한다",
      "싱글톤은 모든 JVM에 하나만 존재한다",
      "프로토타입은 모든 요청에서 동일 객체를 공유한다",
      "싱글톤 빈의 필드는 자동으로 스레드 안전하다"
    ],
    "a": 0,
    "e": "싱글톤은 컨테이너와 빈 정의를 기준으로 공유된다. 프로토타입은 컨테이너에 생성 요청할 때마다 새 객체를 만든다. 싱글톤 자체가 가변 상태의 동시 접근을 보호하지는 않는다."
  },
  {
    "id": "sppractice08",
    "sec": "core",
    "topic": "프로토타입 주입",
    "q": "싱글톤 Service의 생성자에 프로토타입 Worker를 직접 주입했다. Service 메서드를 두 번 호출할 때 Worker는?",
    "o": [
      "메서드 호출마다 새로 주입된다",
      "스레드가 바뀔 때마다 새로 주입된다",
      "프로토타입을 싱글톤에 주입하면 시작이 실패한다",
      "별도 조회가 없다면 Service 생성 때 주입된 동일 Worker를 사용한다"
    ],
    "a": 3,
    "e": "의존성 주입은 Service를 생성할 때 일어난다. 이후 Service가 보관하는 Worker 참조는 동일하다. 매번 새 Worker가 필요하면 ObjectProvider.getObject() 등으로 컨테이너에 새 조회를 요청하는 방법을 사용할 수 있다."
  },
  {
    "id": "sppractice09",
    "sec": "core",
    "topic": "@Qualifier",
    "q": "Pay 구현 빈 cardPay와 bankPay가 있고 둘 다 후보이다. 생성자에서 cardPay를 명시적으로 선택하려면?",
    "o": [
      "@Qualifier(\"cardPay\") Pay pay",
      "@Scope(\"cardPay\") Pay pay",
      "@Bean(\"cardPay\") Pay pay",
      "@PostConstruct Pay pay"
    ],
    "a": 0,
    "e": "@Qualifier는 타입으로 찾은 주입 후보를 한정한다. 생성자 매개변수에 @Qualifier(\"cardPay\")를 붙여 원하는 후보를 선택할 수 있다. @Scope는 빈 범위, @PostConstruct는 초기화 콜백을 지정한다."
  },
  {
    "id": "sppractice10",
    "sec": "boot",
    "topic": "Boot 핵심 구성",
    "q": "@SpringBootApplication의 핵심 구성을 올바르게 묶은 것은?",
    "o": [
      "@Controller, @Service, @Repository",
      "@SpringBootConfiguration, @EnableAutoConfiguration, @ComponentScan",
      "@EnableWebMvc, @MapperScan, @Transactional",
      "@Entity, @Table, @Id"
    ],
    "a": 1,
    "e": "@SpringBootApplication은 설정 클래스 역할, 자동 설정, 컴포넌트 스캔을 결합한다. @SpringBootConfiguration은 @Configuration을 바탕으로 한다. MyBatis 매퍼 스캔이나 엔티티 선언을 자동으로 합성한 어노테이션은 아니다."
  },
  {
    "id": "sppractice11",
    "sec": "boot",
    "topic": "외부 설정 바인딩",
    "q": "등록된 설정 빈에 app.retry-count=3과 app.base-url 값을 묶어 바인딩하려 한다. 적합한 어노테이션은?",
    "o": [
      "@ResponseBody",
      "@RequestParam(\"app\")",
      "@ConfigurationProperties(prefix=\"app\")",
      "@Pointcut(\"app\")"
    ],
    "a": 2,
    "e": "@ConfigurationProperties는 공통 접두사를 갖는 외부 설정을 객체에 묶어 타입 안전하게 바인딩한다. retry-count를 retryCount로 연결하는 relaxed binding도 지원한다. 해당 클래스는 스캔이나 @EnableConfigurationProperties 등으로 등록해야 한다."
  },
  {
    "id": "sppractice12",
    "sec": "boot",
    "topic": "SLF4J·Logback",
    "q": "SLF4J와 Logback의 관계로 옳은 것은?",
    "o": [
      "SLF4J는 DB 드라이버이고 Logback은 SQL 매퍼이다",
      "둘은 반드시 동시에 직접 호출해야 한다",
      "Logback은 Spring MVC 컨트롤러이다",
      "SLF4J는 로깅 API이고 Logback은 이를 구현하는 로깅 구현체 중 하나이다"
    ],
    "a": 3,
    "e": "코드는 보통 SLF4J Logger API에 의존하고 실제 출력은 Logback 같은 구현체가 담당한다. API와 구현체를 분리하면 호출 코드를 크게 바꾸지 않고 로깅 구현을 교체하기 쉽다."
  },
  {
    "id": "sppractice13",
    "sec": "boot",
    "topic": "로그 레벨",
    "q": "유효 로그 레벨이 WARN인 로거에서 일반적으로 출력되는 수준은?",
    "o": [
      "WARN, ERROR",
      "TRACE, DEBUG, INFO",
      "INFO, WARN, ERROR",
      "ERROR만"
    ],
    "a": 0,
    "e": "일반적인 심각도 순서는 TRACE < DEBUG < INFO < WARN < ERROR다. WARN을 임계값으로 설정하면 WARN과 ERROR가 출력 대상이다. 실제 출력은 별도 필터나 appender 설정에 의해 추가로 제한될 수 있다."
  },
  {
    "id": "sppractice14",
    "sec": "boot",
    "topic": "JUnit 5",
    "q": "JUnit Jupiter 기본 PER_METHOD 생명주기에서 테스트 메서드 2개가 정상 실행된다. @BeforeAll 1개와 @BeforeEach 1개의 호출 횟수는?",
    "o": [
      "각각 2회, 1회",
      "각각 1회, 2회",
      "각각 2회, 2회",
      "각각 1회, 1회"
    ],
    "a": 1,
    "e": "@BeforeAll은 해당 테스트 클래스의 전체 테스트 실행 전에 한 번, @BeforeEach는 각 테스트 전에 한 번 실행된다. 기본 PER_METHOD에서 @BeforeAll은 일반적으로 static이어야 한다. @AfterEach와 @AfterAll은 각각 테스트 후와 클래스 전체 실행 후에 대응한다."
  },
  {
    "id": "sppractice15",
    "sec": "aop",
    "topic": "AOP 용어",
    "q": "AOP 용어의 설명으로 옳은 것은?",
    "o": [
      "Target은 부가 기능이 들어 있는 Advice 코드 자체이다",
      "Pointcut은 DB 트랜잭션을 저장하는 테이블이다",
      "Aspect는 공통 관심사의 모듈이고 Pointcut은 Advice를 적용할 Join Point를 고르는 조건이다",
      "Proxy는 항상 원본 객체와 같은 참조이다"
    ],
    "a": 2,
    "e": "Aspect는 부가 기능과 적용 지점 등의 관심사를 모듈화한 것이다. Join Point는 부가 기능을 적용할 수 있는 실행 지점이며 Spring AOP에서는 메서드 실행이다. Target은 실제 업무 객체, Proxy는 호출을 가로채 부가 기능을 연결하는 객체다."
  },
  {
    "id": "sppractice16",
    "sec": "aop",
    "topic": "execution 표현식",
    "q": "다음 포인트컷의 의미는?\n```java\nexecution(public * com.example.service.*Service.*(..))\n```",
    "o": [
      "모든 패키지의 private 생성자",
      "service 패키지와 모든 하위 패키지의 모든 필드",
      "반환형이 Service인 메서드만",
      "com.example.service 패키지의 이름이 Service로 끝나는 타입의 모든 public 메서드"
    ],
    "a": 3,
    "e": "public은 접근 제한자, 첫 *는 모든 반환형, *Service는 타입 이름 패턴, 마지막 *는 메서드 이름, (..)는 인자 개수와 타입에 제한이 없음을 뜻한다. 패키지에 단일 점을 썼으므로 하위 패키지까지 포함하는 .. 패턴과 구분해야 한다."
  },
  {
    "id": "sppractice17",
    "sec": "aop",
    "topic": "Advice 종류",
    "q": "정상 반환에만 실행되는 Advice와 예외 발생에 대응하는 Advice는?",
    "o": [
      "@AfterReturning과 @AfterThrowing",
      "@Before와 @AfterReturning",
      "@After와 @Before",
      "@Around와 @Pointcut"
    ],
    "a": 0,
    "e": "@AfterReturning은 정상 반환 시, @AfterThrowing은 조건에 맞는 예외가 던져질 때 실행된다. @After는 finally 성격으로 정상·예외 완료 모두에서 실행된다. @Pointcut은 적용 조건을 선언하며 Advice 자체가 아니다."
  },
  {
    "id": "sppractice18",
    "sec": "aop",
    "topic": "Around 실행 제어",
    "q": "반환형이 String인 대상에 다음 Advice가 적용된다. 결과는?\n```java\n@Around(\"serviceMethods()\")\npublic Object around(ProceedingJoinPoint pjp) {\n  return \"cached\";\n}\n```",
    "o": [
      "대상 메서드가 무조건 한 번 실행된다",
      "대상 메서드는 호출되지 않고 cached가 반환된다",
      "proceed()가 없으므로 반드시 컴파일 오류다",
      "대상 메서드가 두 번 실행된다"
    ],
    "a": 1,
    "e": "@Around는 proceed() 호출 여부와 시점, 반환값을 제어할 수 있다. 여기서는 proceed()를 호출하지 않아 대상 메서드를 실행하지 않고 cached를 반환한다. 이 제어는 캐싱 등에 활용할 수 있지만 대상 호출을 누락하는 실수도 주의해야 한다."
  },
  {
    "id": "sppractice19",
    "sec": "aop",
    "topic": "트랜잭션 롤백",
    "q": "Spring 6의 기본 롤백 규칙을 사용하며 별도 전역 설정은 없다. 프록시를 통해 호출된 @Transactional 메서드 밖으로 예외가 전파될 때 옳은 것은?",
    "o": [
      "모든 checked 예외는 기본적으로 롤백한다",
      "RuntimeException은 기본적으로 커밋한다",
      "RuntimeException과 Error는 기본 롤백 대상이고 checked 예외는 기본 롤백 대상이 아니다",
      "예외의 이름에 Exception이 있으면 모두 롤백한다"
    ],
    "a": 2,
    "e": "기본 규칙은 unchecked 예외인 RuntimeException과 Error를 롤백 대상으로 삼는다. checked 예외에도 롤백이 필요하면 rollbackFor 등으로 지정한다. 이 문제는 별도 롤백 정책 변경이 없는 조건이며, 예외를 내부에서 처리해 밖으로 내보내지 않는 경우와 구분해야 한다."
  },
  {
    "id": "sppractice20",
    "sec": "aop",
    "topic": "내부 호출",
    "q": "기본 프록시 방식에서 외부가 비트랜잭션 outer()를 호출하고 outer()가 같은 객체의 this.inner()를 호출한다. inner()에만 @Transactional이 있다면?",
    "o": [
      "반드시 새 트랜잭션이 시작된다",
      "private 여부와 관계없이 항상 가로챈다",
      "@Transactional이 컴파일 시 모든 호출부를 바꾼다",
      "내부 호출이 프록시를 거치지 않아 해당 어노테이션으로 트랜잭션이 시작되지 않는다"
    ],
    "a": 3,
    "e": "Spring AOP 기본 프록시 방식은 프록시를 통과하는 외부 호출을 가로챈다. this.inner()는 대상 내부의 직접 호출이므로 inner의 트랜잭션 Advice가 적용되지 않는다. 별도 빈으로 분리해 프록시를 통해 호출하는 방식 등을 고려한다."
  },
  {
    "id": "sppractice21",
    "sec": "mvc",
    "topic": "MVC 요청 흐름",
    "q": "일반적인 동기 Spring MVC의 처리 흐름으로 적절한 것은?",
    "o": [
      "Filter → DispatcherServlet → HandlerMapping으로 핸들러 조회 → HandlerAdapter로 핸들러 실행",
      "Controller → Filter → HandlerMapping → DispatcherServlet",
      "HandlerAdapter → 브라우저 → HandlerMapping",
      "DispatcherServlet → DB 드라이버 → Filter"
    ],
    "a": 0,
    "e": "서블릿 필터 체인을 통과한 요청을 DispatcherServlet이 받는다. HandlerMapping이 핸들러와 인터셉터를 찾고 HandlerAdapter가 해당 핸들러를 실행한다. 응답은 반환 형태에 따라 뷰 렌더링이나 HttpMessageConverter 등으로 처리된다."
  },
  {
    "id": "sppractice22",
    "sec": "mvc",
    "topic": "요청 바인딩",
    "q": "GET /users/7?detail=true 에서 7과 true를 각각 받는 적합한 선언은?",
    "o": [
      "@RequestBody Long id, @PathVariable boolean detail",
      "@PathVariable(\"id\") Long id, @RequestParam(\"detail\") boolean detail (매핑은 /users/{id})",
      "@RequestParam(\"id\") Long id, @RequestBody boolean detail",
      "둘 다 @ResponseBody"
    ],
    "a": 1,
    "e": "경로 템플릿의 변수는 @PathVariable, 쿼리 파라미터는 @RequestParam으로 받는다. @RequestBody는 요청 본문을 메시지 변환기로 읽는 용도이고 @ResponseBody는 응답에 적용된다."
  },
  {
    "id": "sppractice23",
    "sec": "mvc",
    "topic": "JSON 본문",
    "q": "POST /users의 JSON 본문을 DTO로 변환해 받으려 한다. 적절한 선언은?",
    "o": [
      "@PathVariable UserDto dto",
      "@RequestParam UserDto dto만 사용하면 모든 JSON 본문이 자동 변환된다",
      "@RequestBody UserDto dto",
      "@ResponseBody UserDto dto"
    ],
    "a": 2,
    "e": "@RequestBody는 HttpMessageConverter를 사용해 본문을 읽는다. JSON 변환기가 있으면 JSON을 DTO로 역직렬화할 수 있다. 올바른 Content-Type과 변환 가능한 DTO 구조가 필요하며 검증이 필요하면 @Valid 등을 함께 사용한다."
  },
  {
    "id": "sppractice24",
    "sec": "mvc",
    "topic": "redirect 동작",
    "q": "@Controller 메서드가 별도 @ResponseBody 없이 \"redirect:/login\"을 반환한다. 일반적인 결과는?",
    "o": [
      "서버 내부 forward이며 URL이 유지된다",
      "문자열 redirect:/login을 응답 본문으로 쓴다",
      "request 속성이 새 요청에 자동으로 그대로 공유된다",
      "리다이렉트 응답 후 브라우저가 /login으로 새 요청을 보낸다"
    ],
    "a": 3,
    "e": "redirect: 접두사는 뷰 처리 과정에서 리다이렉트로 해석된다. 브라우저가 새 요청을 보내 URL이 바뀌며 기존 request 속성은 자동 공유되지 않는다. 일회성 데이터를 넘기려면 flash attribute 등을 사용할 수 있다."
  },
  {
    "id": "sppractice25",
    "sec": "mvc",
    "topic": "Interceptor 생명주기",
    "q": "인터셉터 한 개, preHandle=true, 핸들러 정상 반환 및 뷰 렌더링 성공인 동기 요청에서 콜백 순서는?",
    "o": [
      "preHandle → 핸들러 → postHandle → 뷰 렌더링 → afterCompletion",
      "postHandle → 핸들러 → preHandle → afterCompletion",
      "afterCompletion → preHandle → 핸들러",
      "preHandle → afterCompletion → 핸들러 → postHandle"
    ],
    "a": 0,
    "e": "preHandle은 핸들러 실행 전, postHandle은 핸들러 정상 처리 후 뷰 렌더링 전에 실행된다. afterCompletion은 렌더링을 포함한 요청 처리가 완료된 뒤 실행된다. 예외 발생이나 비동기 요청에서는 호출 조건과 흐름이 달라질 수 있다."
  },
  {
    "id": "sppractice26",
    "sec": "mvc",
    "topic": "Filter와 Interceptor",
    "q": "Filter와 HandlerInterceptor의 실행 위치와 대표 역할을 올바르게 설명한 것은?",
    "o": [
      "둘 다 서비스 메서드 실행만 가로챈다",
      "Filter는 서블릿 컨테이너 계층에서 요청·응답 래핑 등에, Interceptor는 Spring MVC 핸들러 실행 전후 처리 등에 쓰인다",
      "Interceptor가 DispatcherServlet보다 먼저 모든 정적 자원을 반드시 가로챈다",
      "Filter는 반드시 Spring MVC 핸들러의 어노테이션을 직접 제공받는다"
    ],
    "a": 1,
    "e": "Filter는 DispatcherServlet 바깥 서블릿 필터 체인에서 인코딩·요청 래핑·보안 처리 등에 쓰인다. Interceptor는 Spring MVC가 찾은 핸들러를 기준으로 전후 처리를 수행한다. AOP는 웹 요청에 한정되지 않고 서비스 빈 등의 메서드 공통 관심사에도 적용된다."
  },
  {
    "id": "sppractice27",
    "sec": "mvc",
    "topic": "Controller 비교",
    "q": "@Controller와 @RestController의 차이로 옳은 것은?",
    "o": [
      "@Controller는 JSON을 절대로 반환할 수 없다",
      "@RestController의 String 반환은 항상 뷰 이름이다",
      "@RestController는 @Controller와 @ResponseBody를 결합하며 기본적으로 반환값을 응답 본문으로 처리한다",
      "@ResponseBody는 요청 본문을 읽는 어노테이션이다"
    ],
    "a": 2,
    "e": "@Controller의 일반 String 반환은 뷰 이름으로 해석한다. 메서드에 @ResponseBody를 붙이면 응답 본문으로 처리할 수 있다. @RestController는 클래스 수준에서 이 의미를 제공하며 실제 JSON 등 출력 형식은 변환기와 협상 결과에 따라 결정된다."
  },
  {
    "id": "sppractice28",
    "sec": "mvc",
    "topic": "preHandle 반환값",
    "q": "단일 인터셉터의 preHandle에서 응답을 작성하고 false를 반환했다. 옳은 것은?",
    "o": [
      "핸들러가 무조건 실행된다",
      "postHandle만 실행된다",
      "동일 인터셉터의 afterCompletion이 항상 실행된다",
      "핸들러 실행이 중단되고 해당 인터셉터의 postHandle·afterCompletion은 호출되지 않는다"
    ],
    "a": 3,
    "e": "false는 후속 핸들러 실행을 중단한다. afterCompletion은 preHandle을 성공적으로 true로 마친 인터셉터에 대해 호출된다. 여러 인터셉터 중 앞에서 true를 반환한 인터셉터가 있다면 그 인터셉터에는 afterCompletion이 호출될 수 있다."
  },
  {
    "id": "sppractice29",
    "sec": "mybatis",
    "topic": "매퍼 등록",
    "q": "MyBatis-Spring에서 매퍼 인터페이스를 스캔해 Spring 빈으로 등록하는 적절한 방법은?",
    "o": [
      "@MapperScan으로 매퍼 패키지를 지정한다",
      "모든 메서드에 @Entity를 붙인다",
      "인터페이스를 new로 직접 생성한다",
      "XML 파일을 저장하면 어떤 설정에서도 자동 등록된다"
    ],
    "a": 0,
    "e": "@MapperScan은 지정 패키지의 매퍼 인터페이스를 스캔해 프록시 빈으로 등록한다. Boot 스타터에서는 @Mapper 기반 자동 스캔도 사용할 수 있다. XML 매핑은 namespace와 statement id 등을 인터페이스에 맞춰 연결해야 한다."
  },
  {
    "id": "sppractice30",
    "sec": "mybatis",
    "topic": "where·if",
    "q": "name=null, age=20일 때 생성되는 SQL은?\n```xml\nSELECT * FROM users\n<where>\n  <if test=\"name != null\">AND name = #{name}</if>\n  <if test=\"age != null\">AND age = #{age}</if>\n</where>\n```",
    "o": [
      "SELECT * FROM users WHERE AND age = ?",
      "SELECT * FROM users WHERE age = ?",
      "SELECT * FROM users WHERE name = ? AND age = ?",
      "SELECT * FROM users"
    ],
    "a": 1,
    "e": "name 조건은 제외되고 age 조건만 남는다. <where>는 내용이 있을 때 WHERE를 붙이고 선행 AND 또는 OR를 제거한다. #{age}는 PreparedStatement 바인딩 파라미터가 되므로 SQL 표현에서는 ?로 나타낸다."
  },
  {
    "id": "sppractice31",
    "sec": "mybatis",
    "topic": "choose",
    "q": "title과 author가 모두 null이 아닐 때 결과는?\n```xml\nSELECT * FROM posts WHERE active = 1\n<choose>\n <when test=\"title != null\">AND title = #{title}</when>\n <when test=\"author != null\">AND author = #{author}</when>\n <otherwise>AND featured = 1</otherwise>\n</choose>\n```",
    "o": [
      "title·author·featured 조건을 모두 붙인다",
      "author 조건만 붙인다",
      "title 조건만 붙인다",
      "featured 조건만 붙인다"
    ],
    "a": 2,
    "e": "choose는 조건이 맞는 첫 when 하나를 선택한다. title이 먼저 일치하므로 author와 otherwise는 실행하지 않는다. 여러 if를 나열했을 때 조건이 각각 독립적으로 추가되는 것과 다르다."
  },
  {
    "id": "sppractice32",
    "sec": "mybatis",
    "topic": "set",
    "q": "name=null, age=20일 때 적절한 SQL은?\n```xml\nUPDATE users\n<set>\n <if test=\"name != null\">name = #{name},</if>\n <if test=\"age != null\">age = #{age},</if>\n</set>\nWHERE id = #{id}\n```",
    "o": [
      "UPDATE users SET age = ?, WHERE id = ?",
      "UPDATE users WHERE id = ? SET age = ?",
      "UPDATE users name = ?, age = ? WHERE id = ?",
      "UPDATE users SET age = ? WHERE id = ?"
    ],
    "a": 3,
    "e": "<set>은 SET을 붙이고 마지막 불필요한 쉼표를 제거한다. 따라서 age 대입만 남는다. 모든 갱신 조건이 빠져 빈 SET이 되는 입력은 별도로 처리해야 하며 이 예제는 age가 존재하는 조건이다."
  },
  {
    "id": "sppractice33",
    "sec": "mybatis",
    "topic": "foreach",
    "q": "ids=[2,5,8]일 때 다음 절의 결과는?\n```xml\nWHERE id IN\n<foreach collection=\"ids\" item=\"id\" open=\"(\" separator=\",\" close=\")\">\n #{id}\n</foreach>\n```",
    "o": [
      "WHERE id IN (?, ?, ?)에 2,5,8을 각각 바인딩한다",
      "WHERE id IN (?)에 문자열 \"2,5,8\" 하나를 바인딩한다",
      "WHERE id IN ()가 된다",
      "foreach는 SELECT에서 사용할 수 없다"
    ],
    "a": 0,
    "e": "foreach는 컬렉션 항목마다 본문을 반복하고 separator로 구분한다. 세 항목에 대해 바인딩 자리도 세 개 생긴다. 빈 리스트의 문법 오류나 의도치 않은 전체 조회는 별도로 방지해야 한다."
  },
  {
    "id": "sppractice34",
    "sec": "mybatis",
    "topic": "1:N 매핑",
    "q": "주문 하나에 여러 주문 항목을 조인 조회해 Order.items에 모으려 한다. 적절한 resultMap 구성은?",
    "o": [
      "items에 <association>만 지정하고 부모 식별자는 생략해야 한다",
      "부모 주문에 <id>, items에 <collection>을 두고 자식 식별자와 필드를 매핑한다",
      "resultType을 String으로 지정하면 자동 그룹화된다",
      "<collection>은 반드시 별도 쿼리 방식으로만 사용할 수 있다"
    ],
    "a": 1,
    "e": "1:N은 <collection>, 단일 연관 객체는 <association>으로 표현한다. 조인 결과에서 부모·자식 id 매핑은 객체 식별과 중복 행 통합에 중요하다. 별도 SELECT를 사용하는 중첩 조회와 조인 결과를 중첩 매핑하는 방식 모두 가능하다."
  },
  {
    "id": "sppractice35",
    "sec": "security",
    "topic": "인증과 인가",
    "q": "인증과 인가를 올바르게 구분한 것은?",
    "o": [
      "인증은 접근 권한 확인, 인가는 비밀번호 해싱이다",
      "인증과 인가는 완전히 같은 처리다",
      "인증은 사용자가 누구인지 확인하고 인가는 해당 자원에 접근할 권한이 있는지 판단한다",
      "인가에 성공하면 어떤 사용자라도 관리자이다"
    ],
    "a": 2,
    "e": "로그인 자격을 검증해 신원을 확인하는 것이 인증이다. 인증된 사용자의 권한 등으로 관리자 페이지 접근 가능 여부를 판단하는 것이 인가다. 익명 접근을 허용하는 자원도 있으므로 모든 인가 판단에 로그인이 필수인 것은 아니다."
  },
  {
    "id": "sppractice36",
    "sec": "security",
    "topic": "보안 구조",
    "q": "서블릿 기반 Spring Security의 구조로 적절한 것은?",
    "o": [
      "모든 보안 처리는 Controller 반환 후에만 실행된다",
      "SecurityFilterChain은 JUnit 테스트 순서를 정의한다",
      "FilterChainProxy는 DB 연결 풀이다",
      "FilterChainProxy가 요청에 맞는 SecurityFilterChain을 선택해 보안 필터들을 실행한다"
    ],
    "a": 3,
    "e": "Spring Security는 서블릿 필터 기반으로 동작한다. DelegatingFilterProxy가 Spring 빈인 FilterChainProxy에 위임하고, FilterChainProxy는 조건에 맞는 보안 체인을 선택한다. 체인이 여러 개면 우선순위와 매칭 범위가 중요하다."
  },
  {
    "id": "sppractice37",
    "sec": "security",
    "topic": "URL 접근 제어",
    "q": "별도의 인증·CSRF 조건은 제외하고 아래 URL 인가 규칙만 판단한다. 익명 사용자의 GET /public/help와 ROLE_USER 사용자의 GET /admin/log 접근은?\n```java\nhttp.authorizeHttpRequests(auth -> auth\n .requestMatchers(\"/public/**\").permitAll()\n .requestMatchers(\"/admin/**\").hasRole(\"ADMIN\")\n .anyRequest().authenticated());\n```",
    "o": [
      "전자는 허용, 후자는 거부",
      "둘 다 허용",
      "전자는 거부, 후자는 허용",
      "둘 다 거부"
    ],
    "a": 0,
    "e": "/public/**는 permitAll이므로 익명 접근이 허용된다. /admin/**는 ADMIN 역할이 필요하므로 ROLE_USER만 가진 사용자는 접근할 수 없다. anyRequest는 앞선 규칙에 매칭되지 않은 요청에 적용된다."
  },
  {
    "id": "sppractice38",
    "sec": "security",
    "topic": "Role 접두사",
    "q": "기본 역할 접두사를 사용하는 경우 hasRole(\"ADMIN\")을 만족하는 권한과 hasAuthority(\"ADMIN\")을 만족하는 권한은?",
    "o": [
      "각각 ADMIN, ROLE_ADMIN",
      "각각 ROLE_ADMIN, ADMIN",
      "둘 다 ROLE_ADMIN",
      "둘 다 ROLE_ROLE_ADMIN"
    ],
    "a": 1,
    "e": "기본 hasRole은 ROLE_ 접두사를 붙여 ROLE_ADMIN 권한을 확인한다. hasAuthority는 전달한 문자열 그대로 비교한다. 기본 설정의 hasRole 인자에는 ROLE_를 중복해서 적지 않는다."
  },
  {
    "id": "sppractice39",
    "sec": "security",
    "topic": "비밀번호 해싱",
    "q": "Spring Security에서 비밀번호 저장용 단방향 변환과 검증을 추상화하는 표준 인터페이스는?",
    "o": [
      "Cipher",
      "UserDetails",
      "PasswordEncoder",
      "SecurityFilterChain"
    ],
    "a": 2,
    "e": "PasswordEncoder는 encode와 matches를 제공한다. BCryptPasswordEncoder 같은 구현체는 salt를 사용하므로 같은 비밀번호도 encode 결과가 달라질 수 있다. 따라서 다시 encode한 문자열끼리 비교하지 않고 matches(raw, encoded)로 검증한다."
  },
  {
    "id": "sppractice40",
    "sec": "security",
    "topic": "인가 규칙 순서",
    "q": "다음 규칙의 URL 인가만 고려한다. 일반 ROLE_USER 사용자가 GET /admin/users에 접근하면?\n```java\n.requestMatchers(\"/**\").authenticated()\n.requestMatchers(\"/admin/**\").hasRole(\"ADMIN\")\n```",
    "o": [
      "구체적인 패턴이 항상 우선하므로 거부된다",
      "뒤의 규칙이 앞의 규칙을 덮어써 거부된다",
      "모든 규칙을 AND로 결합하므로 거부된다",
      "첫 매칭 규칙이 적용되어 인증된 ROLE_USER도 허용된다"
    ],
    "a": 3,
    "e": "authorizeHttpRequests의 규칙은 선언 순서대로 평가하여 첫 매칭을 적용한다. /**가 먼저 모든 경로에 매칭되면 뒤의 관리자 제한이 적용되지 않는다. 구체적인 경로 규칙을 먼저 두고 나머지 경로를 뒤에서 처리해야 한다."
  }
];
