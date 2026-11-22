// 자체 제작 4지선다. Spring Boot 3 / Spring Framework 6 / Security 6 / MyBatis 3 / JUnit 5 기준.
// 정답이 눈에 띄게 길지 않도록 보기 길이를 맞췄고(scripts/check-spring-practice.mjs가 확인), 정답 위치를 고르게 나눴다.
export const SPRING_PRACTICE_SECTIONS = {
  "core": {
    "name": "Spring 핵심·IoC/DI",
    "short": "Spring 핵심",
    "sub": "Spring 핵심·IoC/DI",
    "count": 11
  },
  "boot": {
    "name": "Boot·로깅·테스트",
    "short": "Boot",
    "sub": "Boot·로깅·테스트",
    "count": 7
  },
  "aop": {
    "name": "AOP·트랜잭션",
    "short": "AOP",
    "sub": "AOP·트랜잭션",
    "count": 10
  },
  "mvc": {
    "name": "MVC·웹 계층",
    "short": "MVC",
    "sub": "MVC·웹 계층",
    "count": 13
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
    "id": "spq01",
    "sec": "core",
    "topic": "프레임워크와 라이브러리",
    "q": "제어의 역전(IoC) 관점에서 프레임워크와 라이브러리를 바르게 비교한 것은?",
    "o": [
      "프레임워크는 개발자 코드가 호출하고, 라이브러리는 개발자 코드를 호출한다",
      "라이브러리는 개발자 코드가 호출하고, 프레임워크는 개발자 코드를 호출한다",
      "둘 다 개발자 코드가 호출하며 차이는 패키지 크기뿐이다",
      "둘 다 스스로 개발자 코드를 호출하며 차이는 라이선스뿐이다"
    ],
    "a": 1,
    "e": "라이브러리는 필요할 때 개발자가 직접 호출합니다."
  },
  {
    "id": "spq02",
    "sec": "core",
    "topic": "IoC와 DI",
    "q": "IoC와 DI의 관계를 가장 잘 설명한 것은?",
    "o": [
      "IoC는 DI의 한 종류로 개발자가 객체를 new 연산자로 직접 만드는 방식이다",
      "DI는 AOP를 쓰기 위해 반드시 먼저 적용해야 하는 선행 단계에 해당한다",
      "IoC와 DI는 서로 관련이 없고 각각 다른 프레임워크에서 쓰는 용어이다",
      "DI는 의존 객체를 외부에서 주입하는 방식으로 IoC를 구현하는 한 방법이다"
    ],
    "a": 3,
    "e": "IoC는 객체의 생성과 연결을 개발자가 아닌 컨테이너가 제어한다는 큰 개념이고, DI는 그 제어를 의존 객체 주입으로 구현하는 방법입니다."
  },
  {
    "id": "spq03",
    "sec": "core",
    "topic": "AOP 개념",
    "q": "Spring의 3대 핵심 개념 중 AOP가 해결하려는 문제로 가장 알맞은 것은?",
    "o": [
      "트랜잭션과 로깅 같은 공통 기능을 핵심 로직에서 분리한다",
      "객체의 생성과 의존 관계 연결을 개발자 대신 컨테이너가 맡도록 한다",
      "서로 다른 기술의 API를 같은 방식으로 쓸 수 있게 추상화해 준다",
      "HTTP 요청을 알맞은 컨트롤러 메서드에 연결해 주는 역할을 한다"
    ],
    "a": 0,
    "e": "AOP는 횡단 관심사(로깅, 트랜잭션, 보안 등)를 핵심 로직에서 떼어 한곳에서 관리합니다."
  },
  {
    "id": "spq04",
    "sec": "core",
    "topic": "PSA",
    "q": "다음 중 PSA(Portable Service Abstraction)의 예로 가장 알맞은 것은?",
    "o": [
      "프록시로 메서드 호출 앞뒤에 공통 코드를 끼워 넣어 실행한다",
      "생성자로 의존 객체를 전달받아 클래스 사이 결합도를 낮춘다",
      "트랜잭션 추상화로 JDBC와 JPA를 같은 방식으로 다룬다",
      "정규식으로 URL 패턴을 컨트롤러에 연결하는 방식을 제공한다"
    ],
    "a": 2,
    "e": "PSA는 구현 기술이 달라도 같은 방식으로 쓰게 하는 추상화입니다."
  },
  {
    "id": "spq05",
    "sec": "core",
    "topic": "POJO",
    "q": "POJO에 대한 설명으로 옳은 것은?",
    "o": [
      "반드시 Serializable을 구현하고 엔티티 어노테이션을 가져야 하는 객체이다",
      "Spring 컨테이너가 관리하는 객체만 POJO라고 부른다",
      "특정 프레임워크의 클래스를 상속하지 않아도 되는 평범한 자바 객체이다",
      "인터페이스 없이 정적 메서드만 가진 클래스를 말한다"
    ],
    "a": 2,
    "e": "POJO는 특정 기술이나 프레임워크에 종속되지 않은 순수한 자바 객체입니다."
  },
  {
    "id": "spq06",
    "sec": "core",
    "topic": "명시적 빈 등록과 싱글톤",
    "q": "@Configuration 클래스에서 @Bean 메서드를 서로 호출해도 같은 빈이 돌아오는 이유는?",
    "o": [
      "설정 클래스가 프록시로 감싸져 @Bean 호출이 기존 빈으로 연결되기 때문이다",
      "자바에서는 같은 메서드를 호출하면 항상 같은 객체를 반환하기 때문이다",
      "컨테이너가 @Bean 메서드를 static 메서드로 바꿔 실행하기 때문이다",
      "같은 이름의 빈이 이미 있으면 두 번째 생성이 오류 없이 무시되기 때문이다"
    ],
    "a": 0,
    "e": "@Configuration 클래스는 CGLIB 프록시로 만들어져 @Bean 메서드 호출을 가로챕니다."
  },
  {
    "id": "spq07",
    "sec": "core",
    "topic": "빈 생명주기",
    "q": "@PostConstruct가 붙은 초기화 메서드가 호출되는 시점은?",
    "o": [
      "빈 객체의 생성자가 호출되기 전, 의존성 주입보다 앞선 시점이다",
      "컨테이너가 종료되기 직전에 소멸 콜백과 함께 호출된다",
      "다른 빈이 이 빈을 처음 호출하는 순간에 지연되어 실행된다",
      "의존성 주입이 끝난 뒤, 빈이 사용되기 전이다"
    ],
    "a": 3,
    "e": "생성자 호출 → 의존성 주입 → @PostConstruct 초기화 → 사용 → @PreDestroy 소멸 순서입니다."
  },
  {
    "id": "spq08",
    "sec": "core",
    "topic": "의존성 주입 방식",
    "q": "생성자 주입을 권장하는 이유로 가장 알맞은 것은?",
    "o": [
      "순환 참조가 있어도 컨테이너가 항상 자동으로 해결해 준다",
      "필수 의존성이 빠진 객체 생성을 막고 필드를 final로 둘 수 있다",
      "필드 주입보다 애플리케이션 실행 속도가 항상 더 빠르다",
      "생성자가 하나여도 @Autowired를 반드시 붙여야 동작한다"
    ],
    "a": 1,
    "e": "생성자 주입은 의존성이 모두 있어야 객체가 만들어지고 불변으로 둘 수 있습니다."
  },
  {
    "id": "spq09",
    "sec": "core",
    "topic": "빈 스코프",
    "q": "스코프를 따로 지정하지 않은 스프링 빈에 대한 설명으로 옳은 것은?",
    "o": [
      "주입받을 때마다 새 인스턴스가 만들어져 서로 공유하지 않는다",
      "컨테이너 안에서 빈 정의당 하나의 인스턴스를 만들어 공유한다",
      "HTTP 요청이 들어올 때마다 새 인스턴스가 만들어진다",
      "스레드마다 별도의 인스턴스가 만들어져 스레드끼리 공유하지 않는다"
    ],
    "a": 1,
    "e": "기본 스코프는 singleton입니다."
  },
  {
    "id": "spq10",
    "sec": "core",
    "topic": "프로토타입 주입",
    "q": "singleton 빈의 필드에 prototype 빈을 주입했을 때의 동작은?",
    "o": [
      "호출할 때마다 새 prototype 객체가 자동으로 다시 주입된다",
      "스코프가 충돌해 컨테이너가 시작되지 않고 예외가 발생한다",
      "prototype 빈이 싱글톤에 주입되며 자동으로 singleton 스코프로 바뀐다",
      "주입은 싱글톤 생성 때 한 번뿐이라 같은 인스턴스를 계속 쓴다"
    ],
    "a": 3,
    "e": "의존성 주입은 싱글톤이 생성될 때 한 번만 일어납니다."
  },
  {
    "id": "spq11",
    "sec": "core",
    "topic": "@Qualifier",
    "q": "같은 타입의 빈이 둘 이상일 때 주입할 빈을 이름으로 지정하는 방법은?",
    "o": [
      "주입 지점에 @Qualifier(\"빈 이름\")을 붙인다",
      "주입 지점마다 @Primary를 붙인다",
      "필드에 @Lazy를 붙이면 이름이 가까운 빈이 선택된다",
      "필드 타입을 Object로 바꾸면 이름으로 찾아 준다"
    ],
    "a": 0,
    "e": "@Qualifier는 주입 지점에서 대상 빈을 지정합니다."
  },
  {
    "id": "spq12",
    "sec": "boot",
    "topic": "@SpringBootApplication",
    "q": "@SpringBootApplication이 합쳐 놓은 어노테이션의 조합은?",
    "o": [
      "@Configuration, @EnableAutoConfiguration, @ComponentScan, @EnableWebMvc",
      "@SpringBootConfiguration, @EnableWebMvc, @ComponentScan, @Repository",
      "@SpringBootConfiguration, @EnableAutoConfiguration, @ComponentScan",
      "@Configuration, @EnableAutoConfiguration, @Service, @EnableAspectJAutoProxy"
    ],
    "a": 2,
    "e": "설정 클래스 역할(@SpringBootConfiguration), 자동 설정(@EnableAutoConfiguration), 컴포넌트 스캔(@ComponentScan) 세 가지가 합쳐진 것입니다."
  },
  {
    "id": "spq13",
    "sec": "boot",
    "topic": "컴포넌트 스캔 범위",
    "q": "@SpringBootApplication이 붙은 클래스의 패키지 밖에 있는 @Component 클래스는 기본 설정에서 어떻게 되는가?",
    "o": [
      "패키지와 상관없이 항상 빈으로 등록된다",
      "빈으로 등록되지만 경고 로그가 출력된다",
      "스캔 범위 밖이라 빈으로 등록되지 않는다",
      "빈으로 등록되지만 singleton이 아닌 prototype이 된다"
    ],
    "a": 2,
    "e": "컴포넌트 스캔은 메인 클래스가 속한 패키지와 그 하위만 대상으로 합니다."
  },
  {
    "id": "spq14",
    "sec": "boot",
    "topic": "외부 설정 바인딩",
    "q": "application.yml의 값을 타입 안전한 객체로 묶어 받는 방법으로 알맞은 것은?",
    "o": [
      "@ConfigurationProperties를 붙인 클래스에 prefix로 묶어 바인딩한다",
      "@Value만 쓸 수 있고 여러 값을 객체로 묶는 기능은 지원하지 않는다",
      "@PropertySource를 붙이면 설정 파일의 모든 값이 자동으로 setter에 들어간다",
      "Environment 인터페이스를 상속한 설정 클래스를 직접 만들어야 한다"
    ],
    "a": 0,
    "e": "@ConfigurationProperties는 같은 접두사의 설정을 하나의 클래스 필드(또는 record)에 묶어 바인딩합니다."
  },
  {
    "id": "spq15",
    "sec": "boot",
    "topic": "설정 우선순위",
    "q": "application.properties에 server.port=8081이 있고 실행 시 --server.port=9090을 주면 어떤 값이 적용되는가?",
    "o": [
      "properties 파일이 우선하므로 8081이 적용된다",
      "값이 충돌하면 애플리케이션이 시작되지 않는다",
      "두 값을 합쳐 두 포트를 모두 연다",
      "명령행 인수가 우선하므로 9090이 적용된다"
    ],
    "a": 3,
    "e": "Spring Boot는 명령행 인수가 설정 파일보다 우선합니다."
  },
  {
    "id": "spq16",
    "sec": "boot",
    "topic": "SLF4J와 Logback",
    "q": "SLF4J와 Logback의 관계로 옳은 것은?",
    "o": [
      "SLF4J는 구현체이고 Logback은 그 구현체를 감싼 추상화 계층이다",
      "SLF4J는 로깅 추상화이고 Logback은 Boot의 기본 구현체이다",
      "Logback은 SLF4J를 대체하기 위해 만들어진 하위 호환 모듈이다",
      "둘은 같은 라이브러리의 옛 이름과 새 이름일 뿐 기능은 같다"
    ],
    "a": 1,
    "e": "SLF4J는 로그 호출 API(파사드)이고 실제 출력은 구현체가 맡습니다."
  },
  {
    "id": "spq17",
    "sec": "boot",
    "topic": "로그 레벨",
    "q": "로그 레벨을 INFO로 설정했을 때 출력되는 로그 호출만 모은 것은?",
    "o": [
      "trace, debug, info",
      "info, warn, error",
      "debug, info, warn",
      "info만 출력된다"
    ],
    "a": 1,
    "e": "레벨은 TRACE < DEBUG < INFO < WARN < ERROR 순입니다."
  },
  {
    "id": "spq18",
    "sec": "boot",
    "topic": "JUnit 5 라이프사이클",
    "q": "@BeforeAll, @BeforeEach, @AfterEach, @AfterAll이 있고 테스트 메서드가 2개일 때 실행 순서로 옳은 것은? (@BeforeAll과 @AfterAll은 static)",
    "o": [
      "(BeforeAll → BeforeEach → 테스트 → AfterEach → AfterAll) × 2",
      "BeforeEach × 2 → 테스트 × 2 → AfterEach × 2 → BeforeAll → AfterAll",
      "BeforeAll → BeforeEach → 테스트 × 2 → AfterEach → AfterAll",
      "BeforeAll → (BeforeEach → 테스트 → AfterEach) × 2 → AfterAll"
    ],
    "a": 3,
    "e": "@BeforeAll과 @AfterAll은 클래스 전체에서 한 번, @BeforeEach와 @AfterEach는 테스트 메서드마다 실행됩니다."
  },
  {
    "id": "spq19",
    "sec": "aop",
    "topic": "Pointcut",
    "q": "다음 설명에 해당하는 AOP 용어는? \"Advice를 적용할 메서드를 골라내는 조건(표현식)\"",
    "o": [
      "Pointcut",
      "Join Point",
      "Aspect",
      "Target"
    ],
    "a": 0,
    "e": "Pointcut은 어디에 적용할지를 정하는 조건입니다."
  },
  {
    "id": "spq20",
    "sec": "aop",
    "topic": "Aspect",
    "q": "Aspect에 대한 설명으로 옳은 것은?",
    "o": [
      "Advice의 적용 대상이 되는 실제 비즈니스 로직을 가진 객체이다",
      "Advice 호출을 대신 가로채 전달하는 프록시 객체를 가리키는 말이다",
      "Advice와 Pointcut을 묶어 하나의 공통 관심사로 모듈화한 것이다",
      "Advice가 끼어들 수 있는 모든 실행 지점을 모아 놓은 집합이다"
    ],
    "a": 2,
    "e": "적용 대상 객체는 Target, 호출을 가로채는 객체는 Proxy, 끼어들 수 있는 지점은 Join Point입니다."
  },
  {
    "id": "spq21",
    "sec": "aop",
    "topic": "Proxy",
    "q": "Spring AOP가 Advice를 적용하는 기본 방식은?",
    "o": [
      "컴파일할 때 Target의 바이트코드를 직접 수정해 코드를 끼워 넣는다",
      "런타임에 Target 클래스를 다른 구현 클래스로 통째로 교체한다",
      "Target을 감싸는 프록시를 만들어 메서드 호출을 가로챈다",
      "JVM 에이전트가 모든 필드 접근을 감시하며 Advice를 실행한다"
    ],
    "a": 2,
    "e": "Spring AOP는 프록시 기반이며 스프링 빈의 메서드 호출에만 적용됩니다."
  },
  {
    "id": "spq22",
    "sec": "aop",
    "topic": "execution 표현식",
    "q": "execution(* com.app.service.*.*(..))가 매칭하는 대상으로 알맞은 것은?",
    "o": [
      "com.app.service 패키지 클래스에 있는 모든 메서드",
      "com.app.service와 그 하위 패키지의 모든 메서드",
      "com.app.service 패키지의 모든 필드 접근",
      "인자가 없는 com.app.service 패키지의 메서드만"
    ],
    "a": 0,
    "e": "*.*(..)에서 앞의 *는 클래스, 뒤의 *는 메서드, (..)는 인자 0개 이상입니다."
  },
  {
    "id": "spq23",
    "sec": "aop",
    "topic": "execution 표현식 해석",
    "q": "execution(public String com.app..*Service.find*(Long))에 매칭되는 메서드는?",
    "o": [
      "com.app.user.UserService의 public String findName(String id)",
      "com.app.user.UserService의 private String findName(Long id)",
      "com.app.user.UserRepository의 public String findName(Long id)",
      "com.app.user.UserService의 public String findName(Long id)"
    ],
    "a": 3,
    "e": "접근 제어자 public, 반환 타입 String, 클래스 이름 *Service, 메서드 find*, 인자 Long을 모두 만족해야 합니다."
  },
  {
    "id": "spq24",
    "sec": "aop",
    "topic": "Advice 종류",
    "q": "대상 메서드가 정상 종료되든 예외로 끝나든 상관없이 항상 실행되는 Advice는?",
    "o": [
      "@AfterReturning (정상 반환 때만 실행)",
      "@After (finally와 같은 성격)",
      "@AfterThrowing (예외 발생 때만 실행)",
      "@Before (대상 메서드 실행 전에 실행)"
    ],
    "a": 1,
    "e": "@After는 결과와 무관하게 마지막에 실행됩니다."
  },
  {
    "id": "spq25",
    "sec": "aop",
    "topic": "@Around 실행 제어",
    "q": "@Around Advice에서 proceed()를 호출하지 않으면 어떻게 되는가?",
    "o": [
      "proceed()를 호출하지 않아도 대상 메서드가 자동으로 실행된다",
      "대상 메서드가 실행되지 않고 Advice의 반환값이 전달된다",
      "proceed() 미호출은 컴파일 오류를 일으켜 빌드가 실패한다",
      "다음 Advice만 건너뛰고 대상 메서드는 정상적으로 실행된다"
    ],
    "a": 1,
    "e": "@Around는 대상 메서드의 호출 여부를 직접 제어합니다."
  },
  {
    "id": "spq26",
    "sec": "aop",
    "topic": "트랜잭션 롤백 규칙",
    "q": "@Transactional 기본 설정에서 롤백되는 경우는?",
    "o": [
      "IOException 같은 Checked 예외가 하나라도 발생했을 때",
      "예외 없이 정상 종료되었지만 반환값이 null일 때",
      "Checked 예외만 발생했고 rollbackFor를 쓰지 않았을 때",
      "RuntimeException이나 Error 같은 Unchecked 예외가 발생했을 때"
    ],
    "a": 3,
    "e": "기본 롤백 대상은 RuntimeException과 Error입니다."
  },
  {
    "id": "spq27",
    "sec": "aop",
    "topic": "rollbackFor",
    "q": "@Transactional(rollbackFor = Exception.class)가 붙은 메서드에서 IOException이 발생하면?",
    "o": [
      "롤백된다",
      "예외가 전파되며 커밋된다",
      "읽기 전용 트랜잭션으로 바뀐다",
      "새 트랜잭션이 시작되어 원래 작업이 커밋된다"
    ],
    "a": 0,
    "e": "rollbackFor에 지정한 예외는 Checked 예외라도 롤백 대상이 됩니다."
  },
  {
    "id": "spq28",
    "sec": "aop",
    "topic": "트랜잭션 내부 호출",
    "q": "같은 클래스 안에서 this로 @Transactional 메서드를 호출했을 때의 결과는?",
    "o": [
      "항상 새 트랜잭션이 시작되어 독립적으로 커밋된다",
      "컴파일 시점에 순환 호출 오류가 발생해 빌드되지 않는다",
      "프록시를 거치지 않아 트랜잭션이 적용되지 않는다",
      "자동으로 readOnly 트랜잭션이 되어 쓰기가 막힌다"
    ],
    "a": 2,
    "e": "트랜잭션은 프록시가 가로채서 적용합니다."
  },
  {
    "id": "spq29",
    "sec": "mvc",
    "topic": "DispatcherServlet 구성요소",
    "q": "DispatcherServlet이 요청에 맞는 컨트롤러(핸들러)를 찾을 때 사용하는 컴포넌트는?",
    "o": [
      "HandlerAdapter",
      "ViewResolver",
      "HandlerMapping",
      "HttpMessageConverter"
    ],
    "a": 2,
    "e": "HandlerMapping이 핸들러를 찾고, HandlerAdapter가 그 핸들러를 실행하며, ViewResolver가 뷰 이름을 뷰로 바꿉니다."
  },
  {
    "id": "spq30",
    "sec": "mvc",
    "topic": "DispatcherServlet 처리 순서",
    "q": "DispatcherServlet의 처리 순서로 옳은 것은?",
    "o": [
      "HandlerMapping → HandlerAdapter → 컨트롤러 → ViewResolver",
      "HandlerAdapter → HandlerMapping → 컨트롤러 → ViewResolver",
      "HandlerMapping → ViewResolver → 컨트롤러 → HandlerAdapter",
      "ViewResolver → HandlerMapping → HandlerAdapter → 컨트롤러"
    ],
    "a": 0,
    "e": "핸들러를 찾고(HandlerMapping), 실행하고(HandlerAdapter → 컨트롤러), 반환된 뷰 이름으로 뷰를 찾는(ViewResolver) 순서입니다."
  },
  {
    "id": "spq31",
    "sec": "mvc",
    "topic": "쿼리 파라미터 바인딩",
    "q": "GET /users?name=kim 요청에서 name 값을 받는 컨트롤러 파라미터는?",
    "o": [
      "@PathVariable String name",
      "@RequestBody String name",
      "@RequestHeader String name",
      "@RequestParam String name"
    ],
    "a": 3,
    "e": "쿼리 문자열과 폼 값은 @RequestParam으로 받습니다."
  },
  {
    "id": "spq32",
    "sec": "mvc",
    "topic": "경로 변수 바인딩",
    "q": "GET /users/10에서 10을 받도록 매핑과 파라미터가 알맞게 짝지어진 것은?",
    "o": [
      "@GetMapping(\"/users/{id}\")와 @RequestParam Long id",
      "@GetMapping(\"/users/{id}\")와 @PathVariable Long id",
      "@GetMapping(\"/users/id\")와 @PathVariable Long id",
      "@GetMapping(\"/users/{id}\")와 @RequestBody Long id"
    ],
    "a": 1,
    "e": "경로에 {id}로 자리를 만들고 @PathVariable로 받습니다."
  },
  {
    "id": "spq33",
    "sec": "mvc",
    "topic": "요청 본문 바인딩",
    "q": "JSON 요청 본문을 자바 객체로 변환해 받는 어노테이션은?",
    "o": [
      "@RequestParam",
      "@RequestBody",
      "@ResponseBody",
      "@ModelAttribute"
    ],
    "a": 1,
    "e": "@RequestBody는 HttpMessageConverter로 본문을 객체로 바꿉니다."
  },
  {
    "id": "spq34",
    "sec": "mvc",
    "topic": "redirect",
    "q": "컨트롤러가 \"redirect:/list\"를 반환했을 때 일어나는 일은?",
    "o": [
      "서버 내부에서 /list 핸들러로 이동하고 URL은 그대로이다",
      "list 뷰를 서버가 곧바로 렌더링해 같은 요청 안에서 응답한다",
      "기존 요청의 속성이 그대로 유지되어 /list에서 읽을 수 있다",
      "브라우저가 /list로 새 요청을 보내 주소창 URL이 바뀐다"
    ],
    "a": 3,
    "e": "redirect:는 302 응답으로 새 요청을 유도합니다."
  },
  {
    "id": "spq35",
    "sec": "mvc",
    "topic": "HandlerInterceptor 호출 순서",
    "q": "HandlerInterceptor 메서드와 컨트롤러의 호출 순서로 옳은 것은?",
    "o": [
      "preHandle → 컨트롤러 → postHandle → 뷰 렌더링 → afterCompletion",
      "postHandle → preHandle → 컨트롤러 → afterCompletion → 뷰 렌더링",
      "preHandle → postHandle → 컨트롤러 → 뷰 렌더링 → afterCompletion",
      "컨트롤러 → preHandle → 뷰 렌더링 → postHandle → afterCompletion"
    ],
    "a": 0,
    "e": "preHandle은 컨트롤러 전, postHandle은 컨트롤러 뒤 뷰 렌더링 전, afterCompletion은 요청이 모두 끝난 뒤에 호출됩니다."
  },
  {
    "id": "spq36",
    "sec": "mvc",
    "topic": "preHandle의 반환값",
    "q": "HandlerInterceptor의 preHandle이 false를 반환하면?",
    "o": [
      "컨트롤러는 그대로 실행되고 postHandle 호출만 건너뛴다",
      "항상 예외가 발생하며 500 응답이 클라이언트에 반환된다",
      "컨트롤러와 이후 인터셉터가 실행되지 않고 요청 처리가 멈춘다",
      "다음 인터셉터만 건너뛰고 컨트롤러는 정상적으로 실행된다"
    ],
    "a": 2,
    "e": "false는 여기서 처리를 끝내라는 뜻입니다."
  },
  {
    "id": "spq37",
    "sec": "mvc",
    "topic": "Filter와 Interceptor 비교(실행 위치)",
    "q": "Filter와 HandlerInterceptor를 실행 위치로 비교한 설명으로 옳은 것은?",
    "o": [
      "Filter는 DispatcherServlet 이후 Spring MVC 단계에서, Interceptor는 서블릿 컨테이너 단계에서 동작한다",
      "Filter와 Interceptor는 모두 컨트롤러가 실행된 뒤 응답을 가공하는 단계에서만 동작한다",
      "Filter는 서블릿 컨테이너 단계에서, Interceptor는 DispatcherServlet 이후 Spring MVC 단계에서 동작한다",
      "Filter와 Interceptor는 동작하는 계층이 같고 등록하는 설정 방법만 서로 다르다"
    ],
    "a": 2,
    "e": "Filter는 서블릿 스펙의 기능으로 DispatcherServlet 앞에서 동작하고, Interceptor는 Spring MVC가 핸들러를 호출하기 전후에 동작합니다."
  },
  {
    "id": "spq38",
    "sec": "mvc",
    "topic": "Filter와 Interceptor 비교(역할)",
    "q": "Filter와 HandlerInterceptor의 대표적인 용도가 알맞게 짝지어진 것은?",
    "o": [
      "Filter는 인코딩·보안 처리, Interceptor는 로그인 확인·핸들러 정보를 쓰는 권한 확인",
      "Filter는 핸들러 메서드 어노테이션을 읽는 권한 확인, Interceptor는 문자 인코딩 설정",
      "Filter와 Interceptor 모두 서비스 계층의 트랜잭션 경계를 설정하고 롤백 여부를 결정한다",
      "Filter는 뷰 렌더링 결과 가공 전용, Interceptor는 서블릿 컨테이너 시작 설정 전용"
    ],
    "a": 0,
    "e": "Filter는 서블릿 요청/응답 전반(인코딩, CORS, 보안 필터 등)을, Interceptor는 어떤 핸들러가 호출되는지 알 수 있어 로그인·권한 확인에 많이 씁니다."
  },
  {
    "id": "spq39",
    "sec": "mvc",
    "topic": "Filter, Interceptor, AOP 비교",
    "q": "Filter, Interceptor, AOP가 적용되는 대상으로 옳은 것은?",
    "o": [
      "Filter는 스프링 빈 메서드, Interceptor는 서블릿 요청, AOP는 핸들러 호출",
      "Filter는 핸들러 호출, Interceptor는 스프링 빈 메서드, AOP는 서블릿 요청",
      "Filter, Interceptor, AOP 모두 서블릿 요청 단위에만 적용되고 계층 구분은 없다",
      "Filter는 서블릿 요청, Interceptor는 핸들러 호출, AOP는 빈 메서드 호출"
    ],
    "a": 3,
    "e": "웹 요청의 바깥쪽부터 Filter → Interceptor → AOP 순으로 안쪽 계층에 적용됩니다."
  },
  {
    "id": "spq40",
    "sec": "mvc",
    "topic": "@RestController",
    "q": "@RestController에 대한 설명으로 옳은 것은?",
    "o": [
      "@Controller와 @RequestBody를 합친 것으로 요청 본문을 객체로 받는다",
      "@Controller와 @ResponseBody를 합친 것으로 반환값을 응답 본문에 쓴다",
      "반환 문자열을 항상 뷰 이름으로 해석해 ViewResolver에 넘긴다",
      "@Controller와 달리 컴포넌트 스캔 대상이 되지 않아 빈으로 등록되지 않는다"
    ],
    "a": 1,
    "e": "@RestController는 모든 핸들러 메서드에 @ResponseBody를 적용한 것과 같습니다."
  },
  {
    "id": "spq41",
    "sec": "mvc",
    "topic": "@Controller의 반환",
    "q": "@ResponseBody 없이 @Controller 메서드가 문자열 \"home\"을 반환하면?",
    "o": [
      "문자열 home이 응답 본문에 그대로 쓰여 클라이언트에 전송된다",
      "ViewResolver가 home 뷰를 찾아 렌더링한다",
      "home이 HttpMessageConverter를 거쳐 JSON 문자열로 전송된다",
      "뷰 이름은 무시되고 항상 404 응답이 반환된다"
    ],
    "a": 1,
    "e": "@Controller의 문자열 반환은 뷰 이름으로 해석됩니다."
  },
  {
    "id": "spq42",
    "sec": "mybatis",
    "topic": "매퍼 인터페이스 등록",
    "q": "MyBatis 매퍼 인터페이스를 스프링 빈으로 등록하는 방법으로 알맞은 것은?",
    "o": [
      "구현 클래스를 직접 만들고 @Repository를 붙여야만 한다",
      "매퍼 XML만 작성하면 인터페이스 없이도 빈으로 자동 등록된다",
      "인터페이스에 @Component를 붙이면 구현체가 자동 생성된다",
      "@MapperScan으로 패키지를 지정하거나 @Mapper를 붙인다"
    ],
    "a": 3,
    "e": "MyBatis는 매퍼 인터페이스의 프록시 구현체를 만들어 줍니다."
  },
  {
    "id": "spq43",
    "sec": "mybatis",
    "topic": "매퍼 XML 연결",
    "q": "매퍼 XML과 매퍼 인터페이스가 연결되는 규칙으로 알맞은 것은?",
    "o": [
      "namespace는 인터페이스의 전체 이름, id는 메서드 이름과 같다",
      "namespace는 XML 파일 이름, id는 클래스 이름과 같아야 한다",
      "namespace는 패키지 이름만 쓰고 id는 임의의 값이어도 된다",
      "namespace와 id는 각각 DB 테이블 이름과 컬럼 이름이어야 한다"
    ],
    "a": 0,
    "e": "인터페이스의 패키지를 포함한 이름이 namespace, 메서드 이름이 SQL id와 대응되어 호출이 연결됩니다."
  },
  {
    "id": "spq44",
    "sec": "mybatis",
    "topic": "동적 SQL: if",
    "q": "매퍼가 다음과 같고 name이 \"kim\", age가 null일 때 실행되는 쿼리는?\n\nSELECT * FROM users WHERE 1=1\n<if test=\"name != null\"> AND name = #{name} </if>\n<if test=\"age != null\"> AND age = #{age} </if>",
    "o": [
      "SELECT * FROM users WHERE 1=1 AND age = ?",
      "SELECT * FROM users WHERE 1=1 AND name = ? AND age = ?",
      "SELECT * FROM users WHERE 1=1 AND name = ?",
      "SELECT * FROM users WHERE 1=1"
    ],
    "a": 2,
    "e": "<if>의 조건이 참인 부분만 SQL에 붙습니다."
  },
  {
    "id": "spq45",
    "sec": "mybatis",
    "topic": "동적 SQL: where",
    "q": "다음 매퍼에서 name이 null, age가 20일 때 실행되는 쿼리는?\n\nSELECT * FROM users\n<where>\n  <if test=\"name != null\"> AND name = #{name} </if>\n  <if test=\"age != null\"> AND age = #{age} </if>\n</where>",
    "o": [
      "SELECT * FROM users WHERE AND age = ?",
      "SELECT * FROM users age = ?",
      "SELECT * FROM users WHERE age = ?",
      "SELECT * FROM users WHERE name = ? AND age = ?"
    ],
    "a": 2,
    "e": "<where>는 조건이 하나라도 있으면 WHERE를 붙이고 맨 앞에 남는 AND/OR를 제거합니다."
  },
  {
    "id": "spq46",
    "sec": "mybatis",
    "topic": "동적 SQL: foreach",
    "q": "ids가 [1, 2, 3]일 때 다음 매퍼가 만드는 쿼리는?\n\nSELECT * FROM users WHERE id IN\n<foreach collection=\"ids\" item=\"id\" open=\"(\" separator=\",\" close=\")\"> #{id} </foreach>",
    "o": [
      "SELECT * FROM users WHERE id IN (?, ?, ?)",
      "SELECT * FROM users WHERE id IN (?)",
      "SELECT * FROM users WHERE id IN (?, ?, ?, ?)",
      "SELECT * FROM users WHERE id IN (1 2 3)"
    ],
    "a": 0,
    "e": "<foreach>는 컬렉션의 요소마다 본문을 반복하고 open, separator, close를 붙입니다."
  },
  {
    "id": "spq47",
    "sec": "mybatis",
    "topic": "1:N 컬렉션 매핑",
    "q": "주문(Order) 하나에 주문 항목(Item) 목록을 담는 1:N 관계를 resultMap으로 매핑할 때 쓰는 요소는?",
    "o": [
      "<association>",
      "<discriminator>",
      "<constructor>",
      "<collection>"
    ],
    "a": 3,
    "e": "1:N 관계의 List 필드는 <collection>으로 매핑합니다."
  },
  {
    "id": "spq48",
    "sec": "security",
    "topic": "인증과 인가",
    "q": "인증(Authentication)과 인가(Authorization)에 대한 설명으로 옳은 것은?",
    "o": [
      "인증은 접근 가능한 범위를 판단하고, 인가는 사용자가 누구인지 확인한다",
      "인증은 사용자가 누구인지 확인하고, 인가는 접근 가능한 범위를 판단한다",
      "둘 다 비밀번호를 암호화해 저장하는 방식을 가리키는 이름이다",
      "인증은 URL 접근 제어이고 인가는 로그인 처리를 가리킨다"
    ],
    "a": 1,
    "e": "먼저 누구인지 확인하는 것이 인증이고, 그 사용자가 무엇을 할 수 있는지 판단하는 것이 인가입니다."
  },
  {
    "id": "spq49",
    "sec": "security",
    "topic": "SecurityFilterChain",
    "q": "Spring Security 6에서 URL별 접근 권한을 설정하는 방법으로 알맞은 것은?",
    "o": [
      "WebSecurityConfigurerAdapter를 상속해 configure를 재정의한다",
      "SecurityFilterChain 빈에서 authorizeHttpRequests로 설정한다",
      "web.xml의 security-constraint만 쓸 수 있고 자바 설정은 불가하다",
      "@PreAuthorize만 쓸 수 있고 필터 체인 설정은 불가능하다"
    ],
    "a": 1,
    "e": "Spring Security 6에서는 WebSecurityConfigurerAdapter가 제거되어 SecurityFilterChain 빈을 등록하는 방식으로 설정합니다."
  },
  {
    "id": "spq50",
    "sec": "security",
    "topic": "인가 규칙 순서",
    "q": "requestMatchers(\"/admin/**\").hasRole(\"ADMIN\") 다음에 anyRequest().authenticated()를 선언했을 때 USER 역할만 가진 로그인 사용자가 /admin/x에 접근하면?",
    "o": [
      "anyRequest 규칙이 적용되어 로그인만 되어 있으면 접근한다",
      "두 규칙이 합쳐져 읽기 요청만 허용된다",
      "순서와 상관없이 마지막 규칙이 항상 우선한다",
      "먼저 선언된 /admin/** 규칙이 적용되어 접근이 거부된다"
    ],
    "a": 3,
    "e": "인가 규칙은 위에서부터 차례로 검사해 처음 일치한 규칙이 적용됩니다."
  },
  {
    "id": "spq51",
    "sec": "security",
    "topic": "역할 기반 인가",
    "q": "hasRole(\"ADMIN\")이 실제로 검사하는 권한 문자열은?",
    "o": [
      "ROLE_ADMIN",
      "ADMIN",
      "ROLE_USER",
      "hasRole 안에 ROLE_를 직접 써야 하며 ADMIN은 검사되지 않는다"
    ],
    "a": 0,
    "e": "hasRole은 접두사 ROLE_을 자동으로 붙여 ROLE_ADMIN 권한을 검사합니다."
  },
  {
    "id": "spq52",
    "sec": "security",
    "topic": "비밀번호 암호화",
    "q": "Spring Security에서 비밀번호 단방향 해시를 위한 표준 인터페이스는?",
    "o": [
      "UserDetailsService",
      "AuthenticationManager",
      "PasswordEncoder",
      "SecurityContextHolder"
    ],
    "a": 2,
    "e": "PasswordEncoder가 encode와 matches를 제공하고 BCryptPasswordEncoder가 대표 구현체입니다."
  },
  {
    "id": "spq53",
    "sec": "security",
    "topic": "비밀번호 검증",
    "q": "가입한 사용자의 비밀번호를 검증하는 방법으로 알맞은 것은?",
    "o": [
      "저장된 해시를 복호화해 원문 비밀번호와 직접 비교한다",
      "입력값을 encode해 저장된 해시와 equals로 비교한다",
      "저장된 해시와 matches(입력값, 해시)로 비교한다",
      "원문 비밀번호를 DB에 저장해 두고 문자열을 그대로 비교한다"
    ],
    "a": 2,
    "e": "단방향 해시는 복호화할 수 없습니다."
  }
];
