// 실무형 문제: 상황과 실제 코드를 읽고 무엇이 문제인지 고른다. 신입 백엔드 기준.
// 기준 버전: Spring Boot 3.x, Spring Framework 6.2, Spring Data JPA 3.x, Hibernate 6, Apache Kafka 3.x.
// 문항마다 ref에 근거가 되는 공식 문서를 적는다. 정답 위치는 고르게, 정답이 가장 긴 보기로 쏠리지 않게 쓴다(scripts/check-practical.mjs).
// 학습 메일 문제와는 따로 만든다(메일 구독자만 받는 문제를 웹에 다시 쓰지 않는다)
export const PRACTICAL_SECTIONS = {
  tx: { name: '트랜잭션', short: '트랜잭션', sub: '전파, 자기 호출, 롤백 규칙', count: 3 },
  jpa: { name: 'JPA', short: 'JPA', sub: 'N+1, 지연 로딩, 변경 감지', count: 3 },
  conc: { name: '동시성', short: '동시성', sub: '갱신 분실, 락, 재시도', count: 3 },
  api: { name: 'API 설계', short: 'API', sub: '검증, 예외 응답, 응답 DTO', count: 3 },
  cache: { name: '캐시와 메시지', short: '캐시, 메시지', sub: 'Redis 캐시, Kafka 순서', count: 3 },
};

const TX_DOC = 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html';

export const PRACTICAL_QUESTIONS = [
  {
    id: 'prq01', sec: 'tx', topic: '자기 호출',
    ctx: '결제가 실패하면 주문도 롤백되어야 하는데, 결제 예외가 난 뒤에도 주문이 DB에 남습니다. 기본 프록시 방식의 트랜잭션을 씁니다.',
    code: `@Service
public class OrderService {
    public void placeOrder(Order order) {
        validate(order);
        saveWithPayment(order);
    }

    @Transactional
    public void saveWithPayment(Order order) {
        orderRepository.save(order);
        paymentClient.charge(order); // 여기서 RuntimeException
    }
}`,
    q: '주문이 롤백되지 않는 가장 직접적인 원인은?',
    o: [
      '같은 객체 안에서 호출해 프록시를 거치지 않았다',
      'save 뒤에 flush를 직접 부르지 않았다',
      'RuntimeException은 기본 롤백 대상이 아니다',
      'public 메서드에는 @Transactional을 쓸 수 없다',
    ],
    a: 0,
    e: '프록시 방식에서는 프록시를 거쳐 들어온 외부 호출만 트랜잭션이 걸립니다. placeOrder가 같은 객체의 saveWithPayment를 부르면 프록시를 지나지 않아 트랜잭션 없이 실행되고, save가 바로 반영됩니다. placeOrder에 @Transactional을 붙이거나 트랜잭션 메서드를 다른 빈으로 옮깁니다. RuntimeException은 기본 롤백 대상입니다.',
    ref: { label: 'Spring Framework 6.2, Using @Transactional', url: TX_DOC },
  },
  {
    id: 'prq02', sec: 'tx', topic: '롤백 규칙',
    ctx: '파일 업로드가 실패하면 게시글 저장도 취소되어야 하는데, 업로드에서 IOException이 나도 게시글이 저장됩니다.',
    code: `@Transactional
public void write(PostRequest req, MultipartFile file) throws IOException {
    postRepository.save(req.toEntity());
    storage.upload(file); // IOException 발생
}`,
    q: '게시글이 남는 이유와 고치는 방법으로 옳은 것은?',
    o: [
      '업로드가 트랜잭션 밖이라 save를 맨 뒤로 옮겨야 한다',
      'IOException은 체크 예외라 rollbackFor로 지정해야 한다',
      'save가 영속성 컨텍스트에 없어서 saveAndFlush를 써야 한다',
      'throws를 선언한 메서드는 트랜잭션이 시작되지 않는다',
    ],
    a: 1,
    e: '선언적 트랜잭션은 기본으로 RuntimeException과 Error에서만 롤백하고, 체크 예외에서는 커밋합니다. IOException은 체크 예외라 게시글이 커밋됩니다. @Transactional(rollbackFor = IOException.class)로 지정하거나 런타임 예외로 감싸 던집니다.',
    ref: { label: 'Spring Framework 6.2, Rolling Back a Declarative Transaction', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/rolling-back.html' },
  },
  {
    id: 'prq03', sec: 'tx', topic: '전파',
    ctx: '송금이 실패해도 "실패 기록"은 남겨야 합니다. 그런데 송금이 롤백되면 실패 기록도 함께 사라집니다. AuditService는 별도 빈입니다.',
    code: `@Transactional
public void transfer(TransferRequest req) {
    try {
        accountService.withdraw(req);
    } catch (RuntimeException e) {
        auditService.saveFailure(req, e); // 실패 기록
        throw e;
    }
}

// AuditService
@Transactional
public void saveFailure(TransferRequest req, Exception e) { ... }`,
    q: '실패 기록까지 사라지는 이유로 옳은 것은?',
    o: [
      'catch 안에서는 다른 빈의 메서드를 부를 수 없다',
      '예외를 다시 던져서 saveFailure가 실행되지 않았다',
      '기본 전파 REQUIRED라 바깥 트랜잭션과 함께 롤백된다',
      'AuditService에 readOnly가 기본으로 켜져 있다',
    ],
    a: 2,
    e: '기본 전파 속성 REQUIRED는 이미 진행 중인 트랜잭션에 참여합니다. saveFailure는 transfer의 트랜잭션 안에서 실행되고, 예외를 다시 던지면 전체가 롤백되며 실패 기록도 사라집니다. saveFailure에 propagation = REQUIRES_NEW를 주면 별도 트랜잭션으로 커밋됩니다.',
    ref: { label: 'Spring Framework 6.2, Transaction Propagation', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-propagation.html' },
  },
  {
    id: 'prq04', sec: 'jpa', topic: 'N+1',
    ctx: '주문 목록 100건을 보여 주는 API에서 SQL이 101번 실행됩니다. Order의 member는 지연 로딩(LAZY)입니다.',
    code: `@Transactional(readOnly = true)
public List<OrderResponse> list() {
    return orderRepository.findAll().stream()
        .map(o -> new OrderResponse(o.getId(), o.getMember().getName()))
        .toList();
}`,
    q: '쿼리 수를 줄이는 방법으로 가장 알맞은 것은?',
    o: [
      'member를 즉시 로딩(EAGER)으로 바꾸면 항상 한 번에 온다',
      'readOnly를 빼면 회원을 함께 가져온다',
      'stream 대신 for문을 쓰면 쿼리가 한 번으로 준다',
      '페치 조인이나 @EntityGraph로 회원을 함께 조회한다',
    ],
    a: 3,
    e: '주문 1번 조회 뒤 주문마다 회원을 따로 불러 N+1 문제가 생깁니다. JPQL 페치 조인이나 Spring Data JPA의 @EntityGraph로 회원을 함께 가져오면 한 번에 조회됩니다. EAGER로 바꿔도 findAll 같은 JPQL에서는 회원을 따로 조회할 수 있어 해결책이 되지 않습니다.',
    ref: { label: 'Spring Data JPA, Using @EntityGraph', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/query-methods.html#jpa.entity-graph' },
  },
  {
    id: 'prq05', sec: 'jpa', topic: '지연 로딩',
    ctx: 'spring.jpa.open-in-view를 false로 바꾼 뒤, 팀 상세 API에서 LazyInitializationException이 납니다.',
    code: `// TeamService
@Transactional(readOnly = true)
public Team find(Long id) {
    return teamRepository.findById(id).orElseThrow();
}

// TeamController
@GetMapping("/teams/{id}")
public TeamResponse detail(@PathVariable Long id) {
    Team team = teamService.find(id);
    return new TeamResponse(team.getName(), team.getMembers().size());
}`,
    q: '예외가 나는 이유로 옳은 것은?',
    o: [
      '트랜잭션이 끝난 뒤 컨트롤러에서 지연 로딩을 시도했다',
      'readOnly 트랜잭션에서는 컬렉션을 읽을 수 없다',
      'size()는 컬렉션이 비어 있으면 예외를 던진다',
      'open-in-view를 끄면 지연 로딩 자체가 꺼진다',
    ],
    a: 0,
    e: 'open-in-view를 끄면 영속성 컨텍스트가 트랜잭션과 함께 닫힙니다. 서비스가 반환한 뒤 컨트롤러에서 members를 처음 읽으면 초기화할 세션이 없어 예외가 납니다. 서비스 안에서 DTO로 바꿔 반환하거나 페치 조인으로 미리 가져옵니다.',
    ref: { label: 'Spring Boot, spring.jpa.open-in-view 속성', url: 'https://docs.spring.io/spring-boot/appendix/application-properties/index.html#application-properties.data.spring.jpa.open-in-view' },
  },
  {
    id: 'prq06', sec: 'jpa', topic: '변경 감지',
    ctx: '신입 동료가 "save를 안 불렀는데 닉네임이 DB에 바뀌었다"며 버그라고 합니다.',
    code: `@Transactional
public void rename(Long id, String nickname) {
    Member member = memberRepository.findById(id).orElseThrow();
    member.changeNickname(nickname);
    // save 호출 없음
}`,
    q: '이 동작에 대한 설명으로 옳은 것은?',
    o: [
      'findById가 끝나면 엔티티가 곧바로 DB에 다시 저장된다',
      '영속 상태 엔티티의 변경을 커밋 때 감지해 UPDATE한다',
      'changeNickname 안에서 자동으로 save를 호출한다',
      '버그이므로 엔티티에 @Immutable을 붙여야 한다',
    ],
    a: 1,
    e: '트랜잭션 안에서 조회한 엔티티는 영속성 컨텍스트가 관리합니다. 커밋 직전 flush에서 처음 상태와 비교해 바뀐 값이 있으면 UPDATE를 보냅니다(변경 감지). 정상 동작이며, 의도하지 않은 수정을 막으려면 조회 전용 메서드에 readOnly를 쓰거나 엔티티 변경 메서드를 함부로 부르지 않습니다.',
    ref: { label: 'Hibernate ORM 6, Persistence Context', url: 'https://docs.jboss.org/hibernate/orm/6.6/userguide/html_single/Hibernate_User_Guide.html#pc' },
  },
  {
    id: 'prq07', sec: 'conc', topic: '갱신 분실',
    ctx: '재고가 10개인 상품에 주문 두 건이 동시에 들어왔는데, 끝나고 보니 재고가 8이 아니라 9입니다.',
    code: `@Transactional
public void order(Long productId) {
    Product p = productRepository.findById(productId).orElseThrow();
    p.decrease(1); // stock = stock - 1
}`,
    q: '원인과 해결 방향으로 가장 알맞은 것은?',
    o: [
      '변경 감지가 동시 요청에서는 꺼져서 save를 불러야 한다',
      '트랜잭션 격리 수준을 READ UNCOMMITTED로 낮춘다',
      '두 요청이 같은 값을 읽고 덮어썼으니 @Version이나 락을 쓴다',
      '재고 필드를 Integer 대신 int로 바꾸면 해결된다',
    ],
    a: 2,
    e: '두 트랜잭션이 모두 10을 읽고 9로 덮어쓰는 갱신 분실입니다. @Version으로 낙관적 락을 걸어 충돌을 감지하거나, 비관적 락(SELECT FOR UPDATE), 또는 UPDATE product SET stock = stock - 1 같은 원자적 쿼리로 막습니다.',
    ref: { label: 'Spring Data JPA, Locking', url: 'https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html' },
  },
  {
    id: 'prq08', sec: 'conc', topic: 'synchronized와 트랜잭션',
    ctx: '동시 주문을 막으려고 메서드에 synchronized를 붙였는데, 서버 한 대에서도 재고가 가끔 틀립니다.',
    code: `@Transactional
public synchronized void order(Long productId) {
    Product p = productRepository.findById(productId).orElseThrow();
    p.decrease(1);
}`,
    q: '서버 한 대인데도 재고가 틀리는 이유로 옳은 것은?',
    o: [
      'synchronized는 static 메서드에서만 동작한다',
      '@Transactional이 붙으면 synchronized가 무시된다',
      'JPA는 멀티 스레드에서 영속성 컨텍스트를 공유한다',
      '락이 풀린 뒤 프록시가 커밋해 그 사이에 옛 값을 읽는다',
    ],
    a: 3,
    e: '트랜잭션 프록시는 메서드 호출 전에 트랜잭션을 열고, 메서드가 끝난 뒤 커밋합니다. synchronized 락은 메서드가 끝날 때 풀리므로, 커밋 전에 다른 스레드가 들어와 아직 반영되지 않은 재고를 읽습니다. 서버가 여러 대면 더욱 소용없으니 DB 락이나 원자적 쿼리를 씁니다.',
    ref: { label: 'Spring Framework 6.2, Understanding the Spring Framework Declarative Transaction Implementation', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/tx-decl-explained.html' },
  },
  {
    id: 'prq09', sec: 'conc', topic: '낙관적 락 충돌',
    ctx: '갱신 분실을 막으려고 엔티티에 @Version을 붙였더니, 동시 요청 중 하나가 500 오류로 끝납니다.',
    code: `@Entity
public class Product {
    @Id Long id;
    int stock;
    @Version Long version;
}`,
    q: '이 상황을 바르게 이해한 것은?',
    o: [
      '충돌을 감지한 정상 동작이라 예외를 잡아 재시도하거나 안내한다',
      '@Version은 Long이 아니라 String이어야 한다',
      '낙관적 락은 읽기 요청에서만 쓰는 기능이다',
      '버전 값이 저장되지 않아 생긴 버그라 직접 올려야 한다',
    ],
    a: 0,
    e: '@Version이 있으면 UPDATE할 때 버전을 비교하고, 그 사이 다른 트랜잭션이 바꿨다면 예외(Spring에서는 ObjectOptimisticLockingFailureException)가 납니다. 갱신 분실 대신 충돌을 알려 주는 정상 동작입니다. 예외를 잡아 다시 읽고 재시도하거나, 사용자에게 다시 시도하라고 안내합니다. 버전 값은 JPA가 자동으로 올립니다.',
    ref: { label: 'Spring Framework 6.2, ObjectOptimisticLockingFailureException', url: 'https://docs.spring.io/spring-framework/docs/6.2.x/javadoc-api/org/springframework/orm/ObjectOptimisticLockingFailureException.html' },
  },
  {
    id: 'prq10', sec: 'api', topic: '요청 검증',
    ctx: '이메일이 비어 있으면 400을 돌려주도록 DTO에 @NotBlank를 달았는데, 빈 이메일로도 회원가입이 됩니다.',
    code: `public record SignupRequest(@NotBlank String email, @NotBlank String password) {}

@PostMapping("/members")
public ResponseEntity<Void> signup(@RequestBody SignupRequest req) {
    memberService.join(req);
    return ResponseEntity.status(201).build();
}`,
    q: '검증이 동작하지 않는 이유로 옳은 것은?',
    o: [
      'record에는 검증 애너테이션을 붙일 수 없다',
      '@RequestBody 앞에 @Valid가 없어 검증하지 않는다',
      '201 응답을 쓰면 검증 단계가 생략된다',
      '@NotBlank는 문자열이 null일 때만 실패한다',
    ],
    a: 1,
    e: 'Spring MVC는 @RequestBody 인자에 @Valid나 @Validated가 있을 때만 Bean Validation을 실행합니다. 붙이면 검증 실패 시 MethodArgumentNotValidException이 나고 기본으로 400을 돌려줍니다. @NotBlank는 null, 빈 문자열, 공백만 있는 문자열을 모두 거절합니다.',
    ref: { label: 'Spring Framework 6.2, Spring MVC Validation', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html' },
  },
  {
    id: 'prq11', sec: 'api', topic: '예외 응답',
    ctx: '없는 회원을 조회하면 404를 주고 싶은데, 지금은 500과 함께 스택 트레이스 같은 정보가 나간다는 제보가 왔습니다.',
    code: `@GetMapping("/members/{id}")
public MemberResponse get(@PathVariable Long id) {
    Member m = memberRepository.findById(id)
        .orElseThrow(() -> new IllegalArgumentException("no member " + id));
    return MemberResponse.from(m);
}`,
    q: '가장 알맞은 개선 방향은?',
    o: [
      'orElseThrow 대신 null을 돌려주면 자동으로 404가 된다',
      '컨트롤러 메서드마다 try-catch로 감싸 문자열을 반환한다',
      '전용 예외를 만들고 @RestControllerAdvice에서 404로 바꾼다',
      'IllegalArgumentException은 원래 404로 바뀌니 설정만 켠다',
    ],
    a: 2,
    e: '처리하지 않은 예외는 500이 됩니다. 회원 없음 같은 예외를 전용 클래스로 만들고 @RestControllerAdvice의 @ExceptionHandler에서 404와 정해진 응답 모양으로 바꾸면 모든 컨트롤러에 한 번에 적용됩니다. 응답에는 내부 정보를 넣지 않습니다.',
    ref: { label: 'Spring Framework 6.2, Controller Advice', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-advice.html' },
  },
  {
    id: 'prq12', sec: 'api', topic: '응답 DTO',
    ctx: '회원 조회 API 응답에 비밀번호 해시와 내부 권한 필드까지 보인다는 보안 점검 결과가 나왔습니다.',
    code: `@GetMapping("/members/{id}")
public Member get(@PathVariable Long id) {
    return memberRepository.findById(id).orElseThrow();
}`,
    q: '근본적인 해결 방법으로 가장 알맞은 것은?',
    o: [
      '응답 직전에 엔티티의 password에 null을 넣는다',
      'HTTPS를 쓰면 응답 필드가 자동으로 가려진다',
      '프런트엔드에서 password 필드를 화면에 그리지 않는다',
      '보여 줄 필드만 담은 응답 DTO를 만들어 반환한다',
    ],
    a: 3,
    e: '@RestController가 반환한 객체는 HttpMessageConverter(기본 Jackson)가 게터 기준으로 JSON을 만들어, 엔티티의 모든 필드가 나갈 수 있습니다. 응답 전용 DTO에 필요한 필드만 담으면 노출을 막고, 엔티티 구조가 바뀌어도 API가 흔들리지 않습니다. 엔티티에 null을 넣으면 변경 감지로 DB까지 바뀔 수 있습니다.',
    ref: { label: 'Spring Framework 6.2, @ResponseBody', url: 'https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods/responsebody.html' },
  },
  {
    id: 'prq13', sec: 'cache', topic: '캐시 자기 호출',
    ctx: '상품 조회에 Redis 캐시를 붙였는데, 목록 API를 불러도 매번 DB 쿼리가 나갑니다. 기본 프록시 방식입니다.',
    code: `@Service
public class ProductService {
    public List<ProductResponse> list(List<Long> ids) {
        return ids.stream().map(this::find).toList();
    }

    @Cacheable("product")
    public ProductResponse find(Long id) {
        return ProductResponse.from(productRepository.findById(id).orElseThrow());
    }
}`,
    q: '캐시가 쓰이지 않는 이유로 옳은 것은?',
    o: [
      '같은 객체 안의 호출이라 캐시 프록시를 거치지 않는다',
      '@Cacheable은 List를 반환하는 메서드에만 붙일 수 있다',
      'Redis 캐시는 Long 키를 저장할 수 없다',
      '캐시 이름은 반드시 클래스 이름과 같아야 한다',
    ],
    a: 0,
    e: '캐시 애너테이션도 트랜잭션처럼 프록시로 동작해, 같은 객체 안에서 this로 부르면 캐시를 거치지 않습니다. 목록을 다른 빈에서 부르거나 캐시 메서드를 별도 빈으로 옮깁니다.',
    ref: { label: 'Spring Framework 6.2, Declarative Annotation-based Caching', url: 'https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html' },
  },
  {
    id: 'prq14', sec: 'cache', topic: '캐시 무효화',
    ctx: '상품 가격을 바꿨는데 상세 화면에는 한참 동안 옛 가격이 보입니다.',
    code: `@Cacheable(value = "product", key = "#id")
public ProductResponse find(Long id) { ... }

@Transactional
public void changePrice(Long id, int price) {
    productRepository.findById(id).orElseThrow().changePrice(price);
}`,
    q: '가장 알맞은 해결 방법은?',
    o: [
      '캐시 이름을 바꾸면 기존 값이 자동으로 갱신된다',
      '가격을 바꾸는 메서드에 @CacheEvict로 해당 키를 지운다',
      'find에 @Transactional을 붙이면 캐시가 최신으로 바뀐다',
      '변경 감지가 캐시까지 함께 갱신하니 flush만 부른다',
    ],
    a: 1,
    e: '@Cacheable은 값이 캐시에 있으면 메서드를 실행하지 않고 그 값을 돌려줍니다. 데이터를 바꾸는 쪽에서 @CacheEvict(value = "product", key = "#id")로 지우거나 @CachePut으로 갱신해야 합니다. JPA 변경 감지는 DB만 바꾸고 캐시는 모릅니다.',
    ref: { label: 'Spring Framework 6.2, Declarative Annotation-based Caching', url: 'https://docs.spring.io/spring-framework/reference/integration/cache/annotations.html' },
  },
  {
    id: 'prq15', sec: 'cache', topic: 'Kafka 순서',
    ctx: '주문 상태 이벤트(생성, 결제, 취소)를 Kafka로 보내는데, 소비 쪽에서 가끔 "취소"가 "결제"보다 먼저 처리됩니다. 토픽 파티션은 3개입니다.',
    code: `kafkaTemplate.send("order-events", event); // 키 없이 보냄`,
    q: '순서를 지키는 방법으로 가장 알맞은 것은?',
    o: [
      '컨슈머 수를 파티션보다 많이 늘린다',
      '토픽을 지우고 다시 만들면 순서가 맞춰진다',
      '주문 ID를 키로 보내 같은 주문은 같은 파티션에 넣는다',
      '프로듀서에서 send를 부르는 간격을 늘린다',
    ],
    a: 2,
    e: 'Kafka는 한 파티션 안에서만 순서를 보장합니다. 키 없이 보내면 이벤트가 여러 파티션에 흩어져 순서가 섞일 수 있습니다. 주문 ID를 키로 주면 같은 주문의 이벤트가 같은 파티션에 들어가 보낸 순서대로 소비됩니다.',
    ref: { label: 'Apache Kafka 문서, Introduction (Concepts and Terms)', url: 'https://kafka.apache.org/documentation/#intro_concepts_and_terms' },
  },
];
