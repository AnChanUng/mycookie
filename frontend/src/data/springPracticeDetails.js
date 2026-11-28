// Spring 핵심 문제의 풍부한 해설. wrong: 오답 보기(0부터)별 이유, fix: 바로잡은 코드(있을 때만), tips: 더 알아 둘 점
export const SPRING_PRACTICE_DETAILS = {
  spq01: {
    wrong: {
      0: '방향을 거꾸로 본 경우입니다. 개발자 코드를 부르는 쪽이 프레임워크입니다.',
      2: '흐름을 누가 쥐느냐가 핵심 차이이지 크기 차이가 아닙니다.',
      3: '라이브러리는 스스로 개발자 코드를 부르지 않고, 라이선스와도 관계없습니다.',
    },
    tips: ['한 문장으로: "내가 라이브러리를 부르면 라이브러리, 프레임워크가 나를 부르면 프레임워크." Spring이 컨트롤러 메서드를 알아서 호출하는 게 대표 예입니다.'],
  },
  spq02: {
    wrong: {
      0: 'new로 직접 만드는 건 오히려 IoC가 아닌 방식이고, 포함 관계도 반대입니다.',
      1: 'DI와 AOP는 별개의 개념이라 한쪽이 다른 쪽의 선행 단계가 아닙니다.',
      2: 'DI는 IoC를 구현하는 방법이라 서로 깊이 관련 있습니다.',
    },
    tips: ['IoC를 구현하는 방법에는 DI 말고도 서비스 로케이터, 템플릿 메서드 같은 패턴이 있습니다. 면접에서 "IoC와 DI의 차이"로 자주 묻습니다.'],
  },
  spq03: {
    wrong: {
      1: '객체 생성과 연결을 컨테이너가 맡는 건 IoC와 DI입니다.',
      2: '기술이 달라도 같은 방식으로 쓰게 하는 건 PSA입니다.',
      3: '요청을 컨트롤러에 연결하는 건 Spring MVC의 HandlerMapping입니다.',
    },
    tips: ['@Transactional이 AOP의 대표 예입니다. 비즈니스 메서드에 트랜잭션 시작과 커밋 코드를 쓰지 않아도 프록시가 앞뒤에 끼워 넣습니다.'],
  },
  spq04: {
    wrong: {
      0: '프록시로 공통 코드를 끼워 넣는 건 AOP입니다.',
      1: '생성자로 의존 객체를 받는 건 DI입니다.',
      3: 'URL 패턴을 컨트롤러에 연결하는 건 MVC 매핑 기능입니다.',
    },
    tips: ['@Transactional 하나로 JDBC든 JPA든 같은 방식으로 트랜잭션을 쓰는 것, @Cacheable로 캐시 구현을 바꿔 끼우는 것이 PSA입니다.'],
  },
  spq05: {
    wrong: {
      0: 'Serializable이나 엔티티 애너테이션 같은 특정 기술 요구가 없어야 POJO입니다.',
      1: '컨테이너가 관리하는 객체는 빈이라고 부르고, POJO는 관리 여부와 무관합니다.',
      3: '정적 메서드만 있는 클래스는 유틸리티 클래스일 뿐 POJO의 정의가 아닙니다.',
    },
    tips: ['EJB처럼 프레임워크 클래스를 상속해야 했던 시절의 반성에서 나온 말입니다. Spring은 평범한 클래스에 애너테이션만 붙여도 동작하게 해 POJO 방식을 지킵니다.'],
  },
  spq06: {
    wrong: {
      1: '자바에서 같은 메서드를 부르면 보통 매번 새 객체가 만들어집니다. 프록시가 가로채기 때문에 같아지는 것입니다.',
      2: '@Bean 메서드를 static으로 바꾸지 않습니다. static @Bean은 오히려 프록시의 가로채기를 받지 못합니다.',
      3: '두 번째 생성을 무시하는 게 아니라, 처음부터 이미 만든 빈을 돌려줍니다.',
    },
    tips: ['@Configuration(proxyBeanMethods = false)로 두면 프록시를 만들지 않아 시작이 빨라지지만, @Bean 메서드끼리 호출하면 새 객체가 만들어집니다.'],
  },
  spq07: {
    wrong: {
      0: '생성자보다 먼저 호출될 수는 없습니다. 객체가 있어야 메서드를 부를 수 있습니다.',
      1: '종료 직전에 호출되는 건 @PreDestroy입니다.',
      2: '처음 호출될 때 실행되는 게 아니라 빈을 만들 때 바로 실행됩니다.',
    },
    tips: ['생성자에서는 주입이 끝나지 않은 필드(필드 주입, setter 주입)를 쓸 수 없어서, 주입된 값을 쓰는 초기화는 @PostConstruct에서 합니다.'],
  },
  spq08: {
    wrong: {
      0: '생성자 주입끼리 순환 참조가 있으면 오히려 시작할 때 오류가 나서 문제를 빨리 알 수 있습니다.',
      2: '실행 속도 차이는 거의 없습니다. 장점은 안전성과 테스트 편의입니다.',
      3: '생성자가 하나면 @Autowired를 생략해도 주입됩니다.',
    },
    fix: '@Service\n@RequiredArgsConstructor\npublic class OrderService {\n    private final OrderRepository orderRepository; // final로 불변\n}',
    tips: ['생성자 주입이면 테스트에서 new OrderService(가짜 저장소)처럼 스프링 없이도 객체를 만들 수 있습니다.'],
  },
  spq09: {
    wrong: {
      0: '주입할 때마다 새로 만드는 건 prototype 스코프입니다.',
      2: '요청마다 새로 만드는 건 request 스코프입니다.',
      3: '스레드마다 따로 두는 기본 스코프는 없습니다.',
    },
    tips: ['싱글톤 빈은 여러 스레드가 함께 쓰므로, 요청마다 달라지는 값을 필드에 저장하면 다른 사용자 값과 섞입니다. 상태는 지역 변수나 매개변수로 다룹니다.'],
  },
  spq10: {
    wrong: {
      0: '주입은 한 번뿐이라 호출할 때마다 다시 주입되지 않습니다.',
      1: '스코프가 달라도 주입은 가능해 예외 없이 시작합니다.',
      2: 'prototype 빈의 스코프가 바뀌지는 않습니다. 같은 인스턴스를 계속 쓸 뿐입니다.',
    },
    fix: '@Autowired\nprivate ObjectProvider<Task> taskProvider;\n\npublic void run() {\n    Task task = taskProvider.getObject(); // 부를 때마다 새 prototype\n}',
    tips: ['ObjectProvider 말고도 @Lookup 메서드나 스코프 프록시(proxyMode)로 매번 새 객체를 받을 수 있습니다.'],
  },
  spq11: {
    wrong: {
      1: '@Primary는 주입 지점이 아니라 빈 쪽에 붙여 "기본으로 고를 빈"을 정합니다.',
      2: '@Lazy는 빈을 늦게 만들 뿐 어떤 빈을 고를지와 관계없습니다.',
      3: '타입을 Object로 바꾸면 후보가 더 많아질 뿐입니다.',
    },
    tips: ['우선순위는 @Qualifier가 @Primary보다 높습니다. 기본은 @Primary로 정해 두고, 특별한 곳에서만 @Qualifier로 다른 빈을 고르는 식으로 씁니다.'],
  },
  spq12: {
    wrong: {
      0: '@EnableWebMvc는 포함되지 않습니다. 붙이면 Boot의 MVC 자동 설정이 꺼집니다.',
      1: '@EnableWebMvc와 @Repository는 포함되지 않습니다.',
      3: '@Service와 @EnableAspectJAutoProxy는 포함되지 않습니다.',
    },
    tips: ['Boot 프로젝트에 @EnableWebMvc를 함부로 붙이면 정적 자원, 메시지 변환기 같은 자동 설정이 꺼져 "갑자기 안 된다"는 문제가 생깁니다.'],
  },
  spq13: {
    wrong: {
      0: '스캔 범위 밖이면 등록되지 않습니다.',
      1: '경고 없이 그냥 등록되지 않습니다.',
      3: '등록 자체가 안 되므로 스코프가 바뀔 일도 없습니다.',
    },
    fix: '@SpringBootApplication(scanBasePackages = {"com.app", "com.common"})',
    tips: ['그래서 메인 클래스는 최상위 패키지(com.app)에 두는 것이 관례입니다.'],
  },
  spq14: {
    wrong: {
      1: '@ConfigurationProperties로 여러 값을 객체로 묶을 수 있습니다.',
      2: '@PropertySource는 설정 파일을 추가로 읽을 뿐 객체에 자동으로 넣어 주지 않습니다.',
      3: 'Environment를 상속할 필요 없이 애너테이션만으로 바인딩합니다.',
    },
    fix: '@ConfigurationProperties(prefix = "app.mail")\npublic record MailProperties(String host, int port) { }',
    tips: ['@Value는 하나씩 꺼내 쓸 때, @ConfigurationProperties는 관련 값을 묶고 검증(@Validated)까지 할 때 좋습니다.'],
  },
  spq15: {
    wrong: {
      0: '설정 파일보다 명령행 인수가 우선합니다.',
      1: '충돌하면 우선순위가 높은 값이 쓰일 뿐 시작은 정상입니다.',
      2: '같은 키는 하나의 값만 씁니다.',
    },
    tips: ['환경 변수(SERVER_PORT)도 설정 파일보다 우선합니다. 그래서 운영에서는 파일을 고치지 않고 환경 변수로 값을 바꿉니다.'],
  },
  spq16: {
    wrong: {
      0: '역할을 거꾸로 본 경우입니다. SLF4J가 추상화, Logback이 구현체입니다.',
      2: 'Logback은 SLF4J를 대체하지 않고 그 구현체로 동작합니다.',
      3: '서로 다른 역할의 라이브러리입니다.',
    },
    tips: ['코드는 SLF4J API만 쓰므로 구현체를 Log4j2로 바꿔도 코드를 고칠 필요가 없습니다. log.info("id={}", id)처럼 자리표시자를 쓰면 레벨이 꺼져 있을 때 문자열을 만들지 않습니다.'],
  },
  spq17: {
    wrong: {
      0: 'trace와 debug는 INFO보다 낮은 레벨이라 출력되지 않습니다.',
      2: 'debug는 INFO보다 낮아 출력되지 않고, error가 빠졌습니다.',
      3: '설정한 레벨 이상(INFO, WARN, ERROR)이 모두 출력됩니다.',
    },
    tips: ['운영은 INFO, 문제를 볼 때만 특정 패키지를 DEBUG로 올리는 식으로 씁니다(logging.level.com.app=debug).'],
  },
  spq18: {
    wrong: {
      0: '@BeforeAll과 @AfterAll은 테스트마다가 아니라 클래스 전체에서 한 번씩입니다.',
      1: '@BeforeAll이 가장 먼저, @AfterAll이 가장 나중에 실행됩니다.',
      2: '@BeforeEach와 @AfterEach는 테스트마다 실행되어 두 번씩 돕니다.',
    },
    tips: ['@BeforeAll은 static이어야 합니다(테스트 인스턴스가 메서드마다 새로 만들어지기 때문). @TestInstance(PER_CLASS)를 쓰면 static이 아니어도 됩니다.'],
  },
  spq19: {
    wrong: {
      1: 'Join Point는 Advice가 끼어들 수 있는 실행 지점 하나하나입니다. 그중 고르는 조건이 Pointcut입니다.',
      2: 'Aspect는 Advice와 Pointcut을 묶은 모듈입니다.',
      3: 'Target은 Advice가 적용되는 실제 객체입니다.',
    },
    tips: ['정리: 무엇을(Advice), 어디에(Pointcut), 둘을 묶으면(Aspect), 적용 대상(Target), 끼어들 수 있는 지점(Join Point).'],
  },
  spq20: {
    wrong: {
      0: '실제 비즈니스 로직을 가진 객체는 Target입니다.',
      1: '호출을 가로채는 객체는 Proxy입니다.',
      3: '끼어들 수 있는 실행 지점은 Join Point입니다.',
    },
    tips: ['Spring에서는 @Aspect를 붙인 클래스가 Aspect이고, 그 안의 @Around 같은 메서드가 Advice, 애너테이션 안의 표현식이 Pointcut입니다.'],
  },
  spq21: {
    wrong: {
      0: '컴파일할 때 바이트코드를 바꾸는 건 AspectJ의 컴파일 타임 위빙입니다.',
      1: '클래스를 통째로 바꾸지 않고, 대상 앞에 프록시를 세웁니다.',
      3: 'JVM 에이전트로 필드 접근까지 감시하는 방식은 Spring AOP의 기본이 아닙니다.',
    },
    tips: ['프록시 기반이라 같은 클래스 안의 this 호출과 private 메서드에는 적용되지 않습니다. @Transactional이 내부 호출에서 안 먹는 이유와 같습니다.'],
  },
  spq22: {
    wrong: {
      1: '하위 패키지까지 포함하려면 com.app.service..*처럼 점 두 개를 써야 합니다.',
      2: 'execution은 메서드 실행에 대한 표현식이라 필드 접근은 대상이 아닙니다.',
      3: '(..)는 인자 0개 이상이라 인자가 있는 메서드도 매칭합니다. 인자 없음은 ()입니다.',
    },
    tips: ['포인트컷은 넓게 잡으면 예상치 못한 빈까지 걸립니다. 실무에서는 @annotation(com.app.Loggable)처럼 애너테이션으로 대상을 고르는 방식을 많이 씁니다.'],
  },
  spq23: {
    wrong: {
      0: '인자 타입이 String이라 Long과 맞지 않습니다.',
      1: 'private 메서드는 접근 제어자 조건(public)에 맞지 않고, 프록시로 가로챌 수도 없습니다.',
      2: '클래스 이름이 *Service 패턴에 맞지 않습니다.',
    },
    tips: ['com.app..은 com.app과 그 하위 패키지 전체를 뜻합니다. 점 하나와 둘의 차이가 시험과 실무 모두에서 자주 헷갈립니다.'],
  },
  spq24: {
    wrong: {
      0: '@AfterReturning은 정상 반환 때만 실행됩니다.',
      2: '@AfterThrowing은 예외가 났을 때만 실행됩니다.',
      3: '@Before는 대상 메서드보다 먼저 실행됩니다.',
    },
    tips: ['반환값을 보거나 바꾸고 예외까지 다뤄야 한다면 @Around 하나로 처리하는 경우가 많습니다.'],
  },
  spq25: {
    wrong: {
      0: '@Around에서는 proceed()를 불러야만 대상 메서드가 실행됩니다.',
      2: '문법 오류가 아니라 정상 컴파일됩니다. 그래서 실수를 알아채기 어렵습니다.',
      3: '다음 Advice뿐 아니라 대상 메서드까지 실행되지 않습니다.',
    },
    fix: '@Around("@annotation(Timed)")\npublic Object time(ProceedingJoinPoint pjp) throws Throwable {\n    long start = System.nanoTime();\n    try {\n        return pjp.proceed(); // 빼먹으면 대상이 실행되지 않는다\n    } finally {\n        log.info("took {}ns", System.nanoTime() - start);\n    }\n}',
    tips: ['proceed()의 반환값을 돌려주지 않으면 호출한 쪽은 null을 받습니다. 캐시처럼 일부러 실행을 건너뛰는 용도로도 씁니다.'],
  },
  spq26: {
    wrong: {
      0: 'Checked 예외는 기본으로 롤백하지 않고 커밋합니다.',
      1: '반환값과 롤백은 관계없습니다. 예외 없이 끝나면 커밋입니다.',
      2: 'rollbackFor 없이 Checked 예외만 나면 커밋됩니다.',
    },
    tips: ['예외를 catch로 삼키고 정상 반환하면 롤백되지 않습니다. 롤백이 필요하면 다시 던지거나 TransactionAspectSupport로 롤백 표시를 합니다.'],
  },
  spq27: {
    wrong: {
      1: 'rollbackFor에 Exception을 지정했으므로 IOException도 롤백 대상입니다.',
      2: '예외가 난다고 읽기 전용으로 바뀌지 않습니다.',
      3: '새 트랜잭션을 시작하지 않습니다. 전파 속성과는 별개의 문제입니다.',
    },
    tips: ['반대로 noRollbackFor로 특정 런타임 예외에서는 커밋하게 만들 수도 있습니다.'],
  },
  spq28: {
    wrong: {
      0: '새 트랜잭션은커녕 트랜잭션 자체가 적용되지 않습니다.',
      1: 'this 호출은 평범한 메서드 호출이라 컴파일 오류가 없습니다.',
      3: 'readOnly로 바뀌는 일은 없습니다.',
    },
    tips: ['해결책은 트랜잭션 메서드를 다른 빈으로 옮기거나, 바깥 메서드에 @Transactional을 붙이는 것입니다. 실무형 문제의 "트랜잭션이 안 걸리는 저장"과 같은 원리입니다.'],
  },
  spq29: {
    wrong: {
      0: 'HandlerAdapter는 찾은 핸들러를 실행하는 역할입니다.',
      1: 'ViewResolver는 뷰 이름을 실제 뷰로 바꿉니다.',
      3: 'HttpMessageConverter는 요청과 응답 본문을 객체와 JSON 등으로 변환합니다.',
    },
    tips: ['@RequestMapping을 읽어 URL과 메서드를 연결하는 RequestMappingHandlerMapping이 가장 많이 쓰이는 구현체입니다.'],
  },
  spq30: {
    wrong: {
      1: '실행할 핸들러를 먼저 찾아야 실행할 수 있으니 HandlerMapping이 먼저입니다.',
      2: 'ViewResolver는 컨트롤러가 뷰 이름을 돌려준 뒤에 동작합니다.',
      3: 'ViewResolver가 맨 앞에 올 수 없습니다.',
    },
    tips: ['@RestController는 뷰를 찾지 않고 HttpMessageConverter가 반환값을 JSON으로 바꿔 바로 응답합니다. ViewResolver 단계를 건너뛰는 셈입니다.'],
  },
  spq31: {
    wrong: {
      0: '@PathVariable은 /users/kim처럼 경로 안의 값을 받습니다.',
      1: '@RequestBody는 요청 본문(JSON 등)을 받습니다. GET의 쿼리 문자열은 본문이 아닙니다.',
      2: '@RequestHeader는 HTTP 헤더 값을 받습니다.',
    },
    tips: ['값이 없을 수도 있으면 @RequestParam(required = false)나 defaultValue를 씁니다. 그렇지 않으면 400이 납니다.'],
  },
  spq32: {
    wrong: {
      0: '@RequestParam은 ?id=10 같은 쿼리 문자열을 받습니다.',
      2: '"/users/id"는 고정 문자열이라 10을 담을 자리가 없습니다.',
      3: 'GET 요청에는 보통 본문이 없고, 경로 값은 @PathVariable로 받습니다.',
    },
    tips: ['자원을 식별하는 값은 경로(/users/10), 검색이나 정렬 조건은 쿼리 문자열(?sort=name)에 두는 것이 REST에서 흔한 관례입니다.'],
  },
  spq33: {
    wrong: {
      0: '@RequestParam은 쿼리 문자열과 폼 값을 받습니다.',
      2: '@ResponseBody는 반환값을 응답 본문에 쓰는 쪽입니다.',
      3: '@ModelAttribute는 쿼리 문자열과 폼 값을 객체에 묶습니다. JSON 본문은 다루지 않습니다.',
    },
    tips: ['JSON 필드가 객체에 매핑되지 않으면 Jackson이 기본 생성자나 setter, record 생성자를 찾지 못한 경우가 많습니다.'],
  },
  spq34: {
    wrong: {
      0: '서버 안에서 이동하고 URL이 그대로인 건 forward입니다.',
      1: '같은 요청 안에서 뷰를 그리는 건 일반적인 뷰 반환입니다.',
      2: '새 요청이라 기존 요청 속성은 사라집니다. 넘기려면 RedirectAttributes를 씁니다.',
    },
    tips: ['폼 제출 뒤 redirect로 목록 화면에 보내면 새로고침해도 POST가 다시 전송되지 않습니다(PRG 패턴).'],
  },
  spq35: {
    wrong: {
      1: 'postHandle이 preHandle보다 먼저일 수 없습니다.',
      2: 'postHandle은 컨트롤러가 끝난 뒤에 호출됩니다.',
      3: 'preHandle은 컨트롤러보다 먼저 호출됩니다.',
    },
    tips: ['컨트롤러에서 예외가 나면 postHandle은 호출되지 않고, afterCompletion은 예외와 함께 호출됩니다. 그래서 정리 작업은 afterCompletion에 둡니다.'],
  },
  spq36: {
    wrong: {
      0: 'false면 컨트롤러도 실행되지 않습니다.',
      1: '자동으로 예외나 500이 나지 않습니다. 응답은 인터셉터가 직접 써야 합니다.',
      3: '다음 인터셉터뿐 아니라 컨트롤러까지 멈춥니다.',
    },
    fix: '@Override\npublic boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) throws Exception {\n    if (req.getSession(false) == null) {\n        res.sendRedirect("/login"); // false를 돌려주기 전에 응답을 직접 정한다\n        return false;\n    }\n    return true;\n}',
    tips: ['false만 돌려주고 응답을 쓰지 않으면 클라이언트는 빈 200 응답을 받게 되니 주의합니다.'],
  },
  spq37: {
    wrong: {
      0: '두 단계를 서로 바꿔 쓴 경우입니다.',
      1: 'Filter와 Interceptor 모두 컨트롤러 실행 전에도 동작합니다.',
      3: '동작하는 계층 자체가 다릅니다.',
    },
    tips: ['Filter는 Spring MVC 밖이라 @ControllerAdvice로 예외를 처리할 수 없습니다. Spring Security도 Filter 체인으로 동작하기 때문에 인증 예외 처리는 따로 설정합니다.'],
  },
  spq38: {
    wrong: {
      1: '핸들러 정보를 아는 쪽은 Interceptor이고, 인코딩 같은 서블릿 요청 전반은 Filter가 맡습니다.',
      2: '트랜잭션 경계는 서비스 계층에서 @Transactional(AOP)로 정합니다.',
      3: '둘 다 그런 전용 용도로 쓰지 않습니다.',
    },
    tips: ['Interceptor의 preHandle은 handler를 HandlerMethod로 바꿔 메서드에 붙은 애너테이션(@LoginRequired 등)을 읽을 수 있습니다.'],
  },
  spq39: {
    wrong: {
      0: '세 대상을 섞어 쓴 경우입니다.',
      1: '세 대상을 섞어 쓴 경우입니다.',
      2: 'AOP는 웹 요청이 아니어도 빈 메서드 호출이면 적용됩니다.',
    },
    tips: ['배치 작업처럼 HTTP 요청이 없는 곳에서도 동작해야 하는 공통 기능(로깅, 트랜잭션)은 AOP로 만듭니다.'],
  },
  spq40: {
    wrong: {
      0: '@RequestBody가 아니라 @ResponseBody를 합친 것입니다.',
      2: '문자열을 뷰 이름으로 해석하는 건 @Controller입니다.',
      3: '@RestController도 @Controller를 포함하므로 스캔 대상이고 빈으로 등록됩니다.',
    },
    tips: ['@RestController에서 문자열을 반환하면 그 문자열이 그대로 응답 본문이 됩니다.'],
  },
  spq41: {
    wrong: {
      0: '본문에 그대로 쓰려면 @ResponseBody나 @RestController가 필요합니다.',
      2: 'HttpMessageConverter를 거치는 건 @ResponseBody가 있을 때입니다.',
      3: '뷰 이름은 무시되지 않습니다. 뷰를 못 찾을 때 오류가 날 뿐입니다.',
    },
    tips: ['Thymeleaf를 쓰면 home이 templates/home.html로 연결됩니다.'],
  },
  spq42: {
    wrong: {
      0: '구현 클래스를 직접 만들 필요가 없습니다. MyBatis가 프록시 구현체를 만듭니다.',
      1: '매퍼 인터페이스가 있어야 그 프록시를 만들 수 있습니다.',
      2: '@Component를 붙인다고 MyBatis 구현체가 생기지는 않습니다.',
    },
    tips: ['Spring Boot에서는 mybatis-spring-boot-starter가 @Mapper가 붙은 인터페이스를 자동으로 찾아 등록합니다.'],
  },
  spq43: {
    wrong: {
      1: 'XML 파일 이름이나 클래스 이름이 아니라 인터페이스 전체 이름과 메서드 이름으로 연결됩니다.',
      2: 'namespace에는 패키지를 포함한 인터페이스 이름 전체를, id에는 메서드 이름을 그대로 써야 합니다.',
      3: '테이블, 컬럼 이름과는 관계없습니다.',
    },
    tips: ['이름이 하나라도 틀리면 실행할 때 "Invalid bound statement (not found)" 오류가 납니다.'],
  },
  spq44: {
    wrong: {
      0: 'age는 null이라 조건이 붙지 않고, 참인 name 조건이 빠졌습니다.',
      1: 'age는 null이라 age 조건은 붙지 않습니다.',
      3: 'name이 null이 아니라 name 조건은 붙습니다.',
    },
    tips: ['WHERE 1=1은 뒤의 AND를 편하게 붙이려는 요령입니다. <where> 태그를 쓰면 이런 요령 없이 깔끔하게 처리됩니다.'],
  },
  spq45: {
    wrong: {
      0: '<where>가 맨 앞의 AND를 지워 주므로 WHERE AND가 남지 않습니다.',
      1: '조건이 하나라도 있으면 WHERE를 붙입니다.',
      3: 'name은 null이라 name 조건이 붙지 않습니다.',
    },
    tips: ['UPDATE에서는 <set>이 같은 역할을 해 마지막에 남는 쉼표를 지워 줍니다.'],
  },
  spq46: {
    wrong: {
      1: '요소마다 본문을 반복하므로 자리표시자가 세 개입니다.',
      2: '요소는 세 개라 자리표시자도 세 개입니다.',
      3: '#{}는 값을 직접 넣지 않고 ?로 바인딩하며, separator인 쉼표도 붙습니다.',
    },
    tips: ['#{}는 PreparedStatement 바인딩이라 SQL 인젝션에 안전하고, ${}는 문자열을 그대로 붙여 위험합니다. 정렬 컬럼처럼 꼭 필요할 때만 ${}를 씁니다.', '빈 리스트를 넘기면 IN ()가 되어 SQL 오류가 나니, 미리 걸러야 합니다.'],
  },
  spq47: {
    wrong: {
      0: '<association>은 1:1 관계(주문의 회원 하나 등)를 매핑합니다.',
      1: '<discriminator>는 값에 따라 다른 resultMap을 고르는 기능입니다.',
      2: '<constructor>는 생성자로 값을 넣을 때 씁니다.',
    },
    tips: ['조인 결과를 <collection>으로 묶으려면 <id>를 꼭 지정해야 같은 주문의 행을 하나로 합칩니다.'],
  },
  spq48: {
    wrong: {
      0: '두 개념을 거꾸로 본 경우입니다.',
      2: '비밀번호 저장은 해시(PasswordEncoder)의 문제로 별개입니다.',
      3: '로그인 처리가 인증, URL 접근 제어가 인가로, 반대로 짝지었습니다.',
    },
    tips: ['HTTP 상태로는 인증 실패가 401(Unauthorized), 인가 실패가 403(Forbidden)입니다. 이름과 반대 느낌이라 헷갈리기 쉽습니다.'],
  },
  spq49: {
    wrong: {
      0: 'WebSecurityConfigurerAdapter는 Spring Security 6에서 제거됐습니다.',
      2: '자바 설정으로 충분히 할 수 있습니다.',
      3: '필터 체인 설정과 @PreAuthorize(메서드 보안) 둘 다 쓸 수 있습니다.',
    },
    fix: '@Bean\nSecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n    http.authorizeHttpRequests(auth -> auth\n        .requestMatchers("/admin/**").hasRole("ADMIN")\n        .anyRequest().authenticated());\n    return http.build();\n}',
    tips: ['예전 블로그 글은 Adapter 방식이 많아 그대로 따라 하면 컴파일되지 않습니다. 버전을 꼭 확인합니다.'],
  },
  spq50: {
    wrong: {
      0: '먼저 일치한 /admin/** 규칙에서 결정되므로 anyRequest까지 가지 않습니다.',
      1: '규칙을 합치거나 읽기만 허용하는 동작은 없습니다.',
      2: '마지막이 아니라 처음 일치한 규칙이 적용됩니다.',
    },
    tips: ['그래서 좁은 규칙을 위에, anyRequest()는 맨 아래에 둡니다. anyRequest 뒤에 다른 규칙을 두면 시작할 때 오류가 납니다.'],
  },
  spq51: {
    wrong: {
      1: 'hasRole은 ROLE_ 접두사를 붙여 검사합니다. ADMIN 그대로 검사하는 건 hasAuthority("ADMIN")입니다.',
      2: 'USER 권한이 아니라 ADMIN 권한을 검사합니다.',
      3: 'ROLE_를 직접 쓸 필요가 없고, 쓰면 오히려 오류가 납니다.',
    },
    tips: ['권한을 DB에 ADMIN으로 저장했다면 hasAuthority("ADMIN"), ROLE_ADMIN으로 저장했다면 hasRole("ADMIN")을 씁니다. 둘이 어긋나 403이 나는 경우가 많습니다.'],
  },
  spq52: {
    wrong: {
      0: 'UserDetailsService는 사용자 정보를 불러오는 인터페이스입니다.',
      1: 'AuthenticationManager는 인증 과정 전체를 맡는 인터페이스입니다.',
      3: 'SecurityContextHolder는 인증된 사용자 정보를 담아 두는 곳입니다.',
    },
    tips: ['BCrypt는 매번 다른 솔트를 넣어 같은 비밀번호도 해시가 달라집니다. 일부러 느리게 만들어 무차별 대입을 어렵게 합니다.'],
  },
  spq53: {
    wrong: {
      0: '단방향 해시는 복호화할 수 없습니다.',
      1: 'BCrypt는 솔트가 매번 달라 같은 입력도 encode 결과가 달라지므로 equals로 비교하면 항상 실패합니다.',
      3: '원문 저장은 유출되면 그대로 피해가 나는 가장 위험한 방식입니다.',
    },
    fix: 'boolean ok = passwordEncoder.matches(rawPassword, member.getPasswordHash());',
    tips: ['matches는 저장된 해시 안의 솔트를 꺼내 입력값을 같은 방식으로 해시해 비교합니다.'],
  },
};
