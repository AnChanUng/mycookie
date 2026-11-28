// 실무형 문제 2차(prq16~prq50). 기존 주제에 문제를 더하고, 인덱스와 쿼리, 보안, 외부 연동, 배포와 운영을 새로 다룬다.
// 기준 버전은 practicalQuestions.js와 같다(Spring Boot 3, Spring Framework 6.2, Hibernate 6, MySQL 8, Kafka 3)
export const PRACTICAL_MORE = [
  {
    id: 'prq16', sec: 'tx', topic: '읽기 전용 트랜잭션',
    ctx: '서비스 클래스에 @Transactional(readOnly = true)를 붙인 뒤로, 닉네임 수정 API가 200을 돌려주는데 DB 값이 바뀌지 않습니다.',
    code: `@Service
@Transactional(readOnly = true)
public class MemberService {
    public void rename(Long id, String name) {
        memberRepository.findById(id).orElseThrow().changeName(name);
    }
}`,
    q: '값이 바뀌지 않는 이유로 옳은 것은?',
    o: [
      '변경 감지는 서비스 클래스에서는 동작하지 않는다',
      'findById가 복사본을 돌려줘 원본이 그대로다',
      'changeName 뒤에 save를 부르지 않아 저장되지 않는다',
      '읽기 전용이라 커밋 때 flush가 일어나지 않는다',
    ],
    a: 3,
    e: 'JPA(Hibernate)에서 readOnly = true면 Spring이 플러시 모드를 MANUAL로 바꿔, 커밋할 때 변경 감지 결과를 DB에 보내지 않습니다. 클래스에 readOnly를 걸었다면 쓰기 메서드에는 @Transactional을 따로 붙여 덮어써야 합니다.',
  },
  {
    id: 'prq17', sec: 'tx', topic: '롤백 표시',
    ctx: '쿠폰 발급이 실패해도 주문은 성공시키려고 예외를 잡았는데, 주문까지 실패하며 UnexpectedRollbackException이 납니다. CouponService는 별도 빈이고 @Transactional이 붙어 있습니다.',
    code: `@Transactional
public void order(OrderRequest req) {
    orderRepository.save(req.toOrder());
    try {
        couponService.issue(req.userId()); // 안에서 RuntimeException
    } catch (RuntimeException e) {
        log.warn("쿠폰 발급 실패", e);
    }
}`,
    q: '주문까지 롤백되는 이유로 옳은 것은?',
    o: [
      '안쪽이 같은 트랜잭션에 참여해 롤백 표시를 남겼다',
      'catch에서 로그를 남기면 예외가 다시 던져진다',
      '별도 빈이라 쿠폰 쪽에 트랜잭션이 적용되지 않았다',
      'RuntimeException은 catch로 잡을 수 없는 예외다',
    ],
    a: 0,
    e: '기본 전파 REQUIRED라 issue()는 order()의 트랜잭션에 참여합니다. 런타임 예외가 트랜잭션 프록시를 지나 나오는 순간 전체 트랜잭션에 "롤백만 가능" 표시가 붙고, 바깥에서 잡아도 커밋 시점에 UnexpectedRollbackException이 납니다.',
  },
  {
    id: 'prq18', sec: 'jpa', topic: '고아 객체',
    ctx: '주문 수정 화면에서 항목 하나를 뺐는데 DB의 order_item 행이 그대로 남아 있습니다.',
    code: `@Entity
public class Order {
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    private List<OrderItem> items = new ArrayList<>();

    public void removeItem(OrderItem item) {
        items.remove(item);
    }
}`,
    q: '행이 지워지지 않는 이유와 해결로 알맞은 것은?',
    o: [
      '컬렉션에서 빼면 DELETE가 나가는데 flush를 안 했다',
      '컬렉션에서 뺀 항목을 지우려면 orphanRemoval이 필요하다',
      'cascade = ALL에는 REMOVE가 들어 있지 않아서다',
      'mappedBy 쪽 컬렉션은 수정하면 예외가 나야 정상이다',
    ],
    a: 1,
    e: 'cascade REMOVE는 부모(Order)를 지울 때 자식도 함께 지우는 기능입니다. 부모의 컬렉션에서 떼어 낸 자식(고아)을 지우려면 orphanRemoval = true가 필요합니다. cascade = ALL에는 REMOVE가 포함됩니다.',
  },
  {
    id: 'prq19', sec: 'jpa', topic: '대량 저장',
    ctx: '10만 건을 saveAll로 저장하는데 매우 느립니다. hibernate.jdbc.batch_size를 1000으로 설정했지만 SQL 로그에는 INSERT가 한 건씩 나갑니다. 키 전략은 IDENTITY입니다(MySQL).',
    code: `@Id @GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;

// 서비스
memberRepository.saveAll(members); // 10만 건`,
    q: '배치 INSERT가 되지 않는 이유로 옳은 것은?',
    o: [
      'batch_size는 조회에만 쓰는 설정이라 INSERT와 관계없다',
      'saveAll은 엔티티마다 트랜잭션을 새로 열어 커밋한다',
      'IDENTITY는 키를 받으려고 즉시 INSERT해 묶을 수 없다',
      '엔티티에 @Version이 없으면 배치가 꺼진다',
    ],
    a: 2,
    e: 'IDENTITY는 DB가 INSERT할 때 키를 만들기 때문에, Hibernate는 persist 시점에 바로 INSERT를 보내 키를 받아야 합니다. 그래서 JDBC 배치로 모을 수 없습니다. saveAll은 하나의 트랜잭션에서 실행됩니다.',
  },
  {
    id: 'prq20', sec: 'conc', topic: '중복 발급',
    ctx: '한 사람에게 한 장만 주는 쿠폰이, 버튼을 빠르게 두 번 누른 사용자에게 두 장 발급됐습니다.',
    code: `@Transactional
public void issue(Long userId) {
    if (couponRepository.existsByUserId(userId)) {
        throw new AlreadyIssuedException();
    }
    couponRepository.save(new Coupon(userId));
}`,
    q: '가장 확실한 해결 방법은?',
    o: [
      'existsBy는 트랜잭션 안에서 캐시된 값만 돌려준다',
      'save를 saveAndFlush로 바꾸면 동시 요청도 막힌다',
      '@Transactional을 빼면 요청이 순서대로 처리된다',
      '확인과 저장 사이 틈이 있어 유니크 제약으로 막는다',
    ],
    a: 3,
    e: '두 요청이 동시에 "없음"을 확인한 뒤 각자 저장하는 경쟁 조건입니다. coupon.user_id에 유니크 제약을 두면 DB가 두 번째 저장을 거절하고, 그 예외를 "이미 발급됨"으로 바꿔 응답하면 됩니다.',
  },
  {
    id: 'prq21', sec: 'conc', topic: '분산 락 만료',
    ctx: '정산 작업이 두 서버에서 동시에 돌지 않게 Redis 분산 락(SET key value NX PX 3000)을 걸었습니다. 그런데 작업이 5초쯤 걸리는 날에는 두 서버가 함께 정산했습니다.',
    code: `Boolean ok = redis.opsForValue()
    .setIfAbsent("lock:settle", token, Duration.ofSeconds(3));
if (Boolean.TRUE.equals(ok)) {
    settle();              // 약 5초
    redis.delete("lock:settle");
}`,
    q: '두 서버가 함께 실행된 이유로 옳은 것은?',
    o: [
      '작업이 끝나기 전에 락이 만료돼 다른 서버가 얻었다',
      'SET NX는 서버가 두 대 이상이면 동작하지 않는다',
      'Redis는 단일 스레드라 락을 두 번 줄 수 없다',
      '락 키 이름에 콜론이 있으면 Redis가 무시한다',
    ],
    a: 0,
    e: '3초 뒤 락이 자동으로 풀리면서 다른 서버가 락을 얻었습니다. 게다가 먼저 시작한 서버가 끝날 때 delete로 남의 락까지 지울 수 있습니다. 만료 시간을 작업보다 길게 잡거나 연장하고, 지울 때는 내 토큰인지 확인해야 합니다.',
  },
  {
    id: 'prq22', sec: 'conc', topic: '데드락',
    ctx: 'A에서 B로, B에서 A로 보내는 송금이 동시에 들어오면 가끔 "Deadlock found" 오류가 납니다.',
    code: `@Transactional
public void transfer(Long from, Long to, long amount) {
    Account a = accountRepository.findForUpdate(from); // SELECT ... FOR UPDATE
    Account b = accountRepository.findForUpdate(to);
    a.withdraw(amount);
    b.deposit(amount);
}`,
    q: '데드락이 나는 이유로 옳은 것은?',
    o: [
      'FOR UPDATE는 행이 아니라 테이블 전체를 잠근다',
      '두 요청이 반대 순서로 잠가 서로를 기다린다',
      '금액이 long이라 원자적으로 계산되지 않는다',
      '한 트랜잭션에서 두 번 조회하면 항상 데드락이 난다',
    ],
    a: 1,
    e: '첫 요청은 A를 잠그고 B를 기다리고, 둘째 요청은 B를 잠그고 A를 기다리면서 서로 막힙니다. 계좌 ID가 작은 쪽부터 잠그는 식으로 잠그는 순서를 항상 같게 하면 이런 데드락이 생기지 않습니다.',
  },
  {
    id: 'prq23', sec: 'api', topic: '페이지 크기 제한',
    ctx: '누군가 목록 API에 size=1000000을 넣어 요청한 뒤 서버 메모리가 급증하고 응답이 멈췄습니다.',
    code: `@GetMapping("/posts")
public List<PostResponse> list(@RequestParam int page, @RequestParam int size) {
    return postService.list(PageRequest.of(page, size));
}`,
    q: '원인과 해결로 알맞은 것은?',
    o: [
      'PageRequest는 size가 크면 여러 쿼리로 나눠 가져온다',
      'GET 요청은 서버 메모리를 쓰지 않아 다른 원인이다',
      'size에 상한이 없어 한 번에 너무 많은 행을 읽는다',
      'List 대신 Page를 반환하면 메모리 문제가 사라진다',
    ],
    a: 2,
    e: '클라이언트가 보낸 size를 그대로 쓰면 수십만 행을 한 번에 읽어 메모리에 올립니다. 서버에서 최대값(예: 100)을 정해 넘으면 자르거나 400으로 거절합니다.',
  },
  {
    id: 'prq24', sec: 'api', topic: '부분 수정',
    ctx: '닉네임만 바꾸려고 {"nickname": "새이름"}만 보냈는데, 소개글이 지워졌다는 제보가 왔습니다.',
    code: `@PatchMapping("/me")
public void update(@RequestBody ProfileRequest req) {
    Profile p = profileRepository.findByUserId(currentUserId()).orElseThrow();
    p.setNickname(req.nickname());
    p.setBio(req.bio()); // 요청에 없으면 null
}`,
    q: '소개글이 지워진 이유로 옳은 것은?',
    o: [
      'PATCH는 원래 전체 교체 메서드라 모두 덮어써진다',
      'JSON에 없는 필드는 Jackson이 빈 문자열로 채운다',
      '변경 감지가 null을 무시해야 하는데 버그가 있다',
      '요청에 없는 필드도 null로 덮어써 기존 값이 지워졌다',
    ],
    a: 3,
    e: 'JSON에 없는 필드는 DTO에서 null이 되고, 그대로 setBio(null)을 부르면 변경 감지로 DB 값이 지워집니다. 부분 수정은 값이 들어온 필드만 바꾸도록 만들어야 합니다. 전체 교체는 PUT의 의미입니다.',
  },
  {
    id: 'prq25', sec: 'cache', topic: '캐시 관통',
    ctx: '없는 상품 ID로 요청이 계속 들어오자, 캐시를 붙였는데도 DB 부하가 줄지 않습니다.',
    code: `@Cacheable(value = "product", unless = "#result == null")
public ProductResponse find(Long id) {
    return productRepository.findById(id).map(ProductResponse::from).orElse(null);
}`,
    q: 'DB 부하가 줄지 않는 이유로 옳은 것은?',
    o: [
      '결과가 없을 때는 캐시하지 않아 매번 DB까지 간다',
      'Redis는 숫자 키를 저장하지 못해 매번 실패한다',
      '@Cacheable은 예외가 날 때만 캐시를 쓴다',
      '캐시 이름이 같아 다른 ID의 값과 섞인다',
    ],
    a: 0,
    e: 'unless = "#result == null" 때문에 없는 상품은 캐시에 남지 않아, 같은 ID로 몇 번을 물어도 매번 DB를 조회합니다. 이것을 캐시 관통(cache penetration)이라고 합니다.',
  },
  {
    id: 'prq26', sec: 'cache', topic: '캐시 직렬화',
    ctx: '응답 DTO에 필드를 하나 추가해 배포했더니, Redis 캐시에서 값을 읽을 때 SerializationException이 납니다. 기본 JDK 직렬화를 씁니다.',
    code: `public class ProductResponse implements Serializable {
    private Long id;
    private String name;
    private int discountRate; // 이번에 추가
}`,
    q: '오류가 나는 이유로 옳은 것은?',
    o: [
      'Redis가 재시작되면 값의 타입 정보가 사라진다',
      '캐시에 남은 옛 형식의 값을 새 클래스로 읽으려 했다',
      'TTL이 없는 캐시는 역직렬화가 항상 실패한다',
      '@Cacheable은 Serializable 클래스를 저장하지 못한다',
    ],
    a: 1,
    e: '배포 전에 저장된 값은 옛 클래스 구조로 직렬화돼 있습니다. serialVersionUID가 바뀐 새 클래스로 읽으면 역직렬화에 실패합니다. 캐시는 배포를 넘어 살아남는다는 점을 잊기 쉽습니다.',
  },
  {
    id: 'prq27', sec: 'db', topic: '함수와 인덱스',
    ctx: 'created_at에 인덱스가 있는데, 오늘 주문을 찾는 쿼리가 주문 테이블 전체를 훑습니다.',
    code: `SELECT * FROM orders
WHERE DATE(created_at) = '2026-11-28';`,
    q: '인덱스를 쓰지 못하는 이유로 옳은 것은?',
    o: [
      'DATE 함수는 MySQL에서 지원하지 않는다',
      'created_at 인덱스는 날짜 조건에 쓸 수 없는 종류다',
      '열에 함수를 씌워 인덱스 순서대로 찾을 수 없다',
      '문자열과 비교해서 결과가 틀리게 나온다',
    ],
    a: 2,
    e: '인덱스는 created_at 값 자체의 순서로 정렬돼 있습니다. DATE()를 씌우면 행마다 함수 결과를 계산해야 해서 그 순서를 쓸 수 없습니다. 열은 그대로 두고 범위 조건으로 바꿉니다.',
  },
  {
    id: 'prq28', sec: 'db', topic: '복합 인덱스 순서',
    ctx: '(status, created_at) 복합 인덱스를 만들었는데, 최근 일주일 주문을 찾는 쿼리가 여전히 느립니다.',
    code: `CREATE INDEX idx_status_created ON orders (status, created_at);

SELECT * FROM orders
WHERE created_at >= NOW() - INTERVAL 7 DAY;`,
    q: '느린 이유로 가장 알맞은 것은?',
    o: [
      '복합 인덱스는 열이 둘 이상이면 조회에 쓰이지 않는다',
      'created_at이 두 번째 열이라 거꾸로 정렬돼 있다',
      '인덱스를 쓰려면 SELECT *를 써야 한다',
      '맨 앞 열 status 조건이 없어 범위 탐색을 잘 못 한다',
    ],
    a: 3,
    e: '복합 인덱스는 맨 앞 열(status)로 먼저 정렬되고, 같은 status 안에서 created_at으로 정렬됩니다. status 조건 없이 created_at만 찾으면 이 정렬을 제대로 쓸 수 없습니다(맨 왼쪽 접두 규칙).',
  },
  {
    id: 'prq29', sec: 'db', topic: '앞쪽 와일드카드',
    ctx: '회원 이름 검색이 데이터가 늘면서 점점 느려집니다. name에는 인덱스가 있습니다.',
    code: `SELECT * FROM members
WHERE name LIKE '%민수';`,
    q: '인덱스를 쓰지 못하는 이유로 옳은 것은?',
    o: [
      '앞에 %가 있어 인덱스의 정렬 순서를 쓸 수 없다',
      'LIKE는 인덱스가 있는 열에 쓸 수 없는 문법이다',
      '검색어가 한글이라 인덱스가 무시된다',
      '% 기호가 뒤에도 있어야 인덱스를 쓸 수 있다',
    ],
    a: 0,
    e: '인덱스는 앞 글자부터 정렬돼 있어, 시작 글자를 모르는 "%민수" 검색은 처음부터 끝까지 훑어야 합니다. "민수%"처럼 앞부분이 정해진 검색만 인덱스 범위 탐색을 쓸 수 있습니다.',
  },
  {
    id: 'prq30', sec: 'db', topic: '타입 불일치',
    ctx: 'phone(VARCHAR) 열에 인덱스가 있는데, 전화번호로 회원을 찾는 쿼리가 전체를 훑습니다.',
    code: `SELECT * FROM members
WHERE phone = 01012345678;`,
    q: '인덱스를 쓰지 못하는 이유로 옳은 것은?',
    o: [
      '앞의 0이 사라져 결과는 늘 비지만 속도는 같다',
      '문자열 열을 숫자와 비교해 행마다 변환이 일어난다',
      'VARCHAR 열에는 인덱스를 만들 수 없다',
      '= 비교는 인덱스 대신 항상 해시로 처리된다',
    ],
    a: 1,
    e: 'MySQL은 문자열 열과 숫자를 비교할 때 열 값을 숫자로 바꿔 비교합니다. 행마다 변환이 필요해 인덱스를 쓸 수 없습니다. 값을 문자열(\'01012345678\')로 넘기면 해결됩니다.',
  },
  {
    id: 'prq31', sec: 'db', topic: '깊은 페이지',
    ctx: '게시판 맨 뒤쪽 페이지를 열면 몇 초씩 걸립니다. 앞쪽 페이지는 빠릅니다.',
    code: `SELECT * FROM posts
ORDER BY id DESC
LIMIT 20 OFFSET 200000;`,
    q: '뒤쪽 페이지가 느린 이유로 옳은 것은?',
    o: [
      'LIMIT을 쓰면 정렬에 인덱스를 쓸 수 없다',
      'ORDER BY가 있으면 항상 테이블 전체를 정렬한다',
      '건너뛸 20만 행을 실제로 읽고 버리기 때문이다',
      'OFFSET이 크면 DB가 결과를 압축하느라 느려진다',
    ],
    a: 2,
    e: 'OFFSET은 "건너뛰기"라도 DB가 그 행들을 순서대로 읽은 뒤 버립니다. 페이지가 뒤로 갈수록 읽는 양이 늘어납니다. 마지막으로 본 id를 기준으로 이어 읽는 커서 방식으로 바꿉니다.',
  },
  {
    id: 'prq32', sec: 'db', topic: '실행 계획 읽기',
    ctx: '느린 쿼리에 EXPLAIN을 걸었더니 type이 ALL, rows가 1200000으로 나왔습니다.',
    code: `EXPLAIN SELECT * FROM orders WHERE memo = '빠른 배송';
-- type: ALL, key: NULL, rows: 1200000`,
    q: '이 결과를 바르게 읽은 것은?',
    o: [
      '인덱스를 모두 써서 가장 빠른 방식으로 읽는다',
      '결과로 정확히 120만 행이 반환된다는 뜻이다',
      '쿼리 결과가 캐시돼 다음에는 바로 나온다는 뜻이다',
      '전체를 훑으며 약 120만 행을 읽을 거라는 추정이다',
    ],
    a: 3,
    e: 'type: ALL은 테이블 전체 스캔, key: NULL은 쓴 인덱스가 없다는 뜻입니다. rows는 읽을 것으로 추정한 행 수이지 결과 행 수가 아닙니다. 자주 쓰는 조건이라면 인덱스를 검토합니다.',
  },
  {
    id: 'prq33', sec: 'sec', topic: '남의 데이터 조회',
    ctx: '주소창의 주문 번호를 다른 숫자로 바꾸면 남의 주문 내역이 보인다는 제보가 왔습니다. 로그인한 사용자만 이 API를 부를 수 있습니다.',
    code: `@GetMapping("/orders/{id}")
public OrderResponse get(@PathVariable Long id) {
    return OrderResponse.from(orderRepository.findById(id).orElseThrow());
}`,
    q: '근본 원인으로 옳은 것은?',
    o: [
      '주문이 요청한 사용자의 것인지 확인하지 않는다',
      '주문 번호가 숫자라 추측하기 쉬운 것이 근본 원인이다',
      'GET 요청이라 인증 정보가 전달되지 않는다',
      '응답에 DTO를 써서 정보가 새어 나간다',
    ],
    a: 0,
    e: '로그인 여부(인증)만 보고, 이 주문이 그 사용자의 것인지(인가)를 확인하지 않았습니다. 이런 취약점을 IDOR(Insecure Direct Object Reference)라고 합니다. 조회 조건에 사용자 ID를 함께 넣습니다.',
  },
  {
    id: 'prq34', sec: 'sec', topic: '로그의 민감 정보',
    ctx: '로그 수집 도구에서 사용자 비밀번호가 평문으로 보인다는 보안 점검 결과가 나왔습니다.',
    code: `public record LoginRequest(String email, String password) {}

@PostMapping("/login")
public TokenResponse login(@RequestBody LoginRequest req) {
    log.info("login request: {}", req);
    return authService.login(req);
}`,
    q: '평문이 남는 이유로 옳은 것은?',
    o: [
      '로그 레벨이 INFO라 민감 정보가 그대로 보인다',
      'record의 기본 toString이 password까지 출력한다',
      '비밀번호를 BCrypt로 저장하지 않아서 생겼다',
      'HTTPS를 쓰지 않아 로그에 평문이 남았다',
    ],
    a: 1,
    e: 'record는 모든 컴포넌트를 담은 toString을 자동으로 만들어, 로그에 req를 그대로 찍으면 password까지 출력됩니다. 저장 방식(BCrypt)이나 전송 암호화(HTTPS)와는 별개로 로그에서 새어 나간 것입니다.',
  },
  {
    id: 'prq35', sec: 'sec', topic: '노출된 서명 키',
    ctx: '공개 저장소의 application.yml에 JWT 서명 키(jwt.secret)가 그대로 올라가 있었습니다.',
    code: `jwt:
  secret: my-super-secret-key-for-jwt-signing-2026
  expiration: 3600000`,
    q: '가장 먼저 해야 할 조치와 이유로 옳은 것은?',
    o: [
      '키가 충분히 길면 공개돼도 안전해 그대로 둔다',
      '커밋을 지우면 이미 공개된 키도 안전해진다',
      '누구나 유효한 토큰을 만들 수 있어 키를 교체한다',
      '토큰 만료 시간을 늘리면 위험이 줄어든다',
    ],
    a: 2,
    e: '서명 키를 알면 누구나 관리자 권한이 담긴 토큰도 위조할 수 있습니다. 커밋을 지워도 이미 복제된 기록이나 캐시에 남으므로, 키를 새로 만들어 교체하고 기존 토큰을 무효화해야 합니다.',
  },
  {
    id: 'prq36', sec: 'sec', topic: '파일 이름과 경로',
    ctx: '프로필 사진 업로드 기능을 만들었습니다. 보안 점검에서 업로드 폴더 밖에 파일을 쓸 수 있다는 지적을 받았습니다.',
    code: `@PostMapping("/profile/image")
public void upload(@RequestParam MultipartFile file) throws IOException {
    Path target = uploadDir.resolve(file.getOriginalFilename());
    file.transferTo(target);
}`,
    q: '지적받은 이유로 옳은 것은?',
    o: [
      '파일 크기를 검사하지 않은 것이 유일한 문제다',
      'transferTo는 덮어쓰기를 막아 주므로 안전하다',
      '원래 이름을 쓰면 한글 파일 이름만 깨진다',
      '이름에 ../가 있으면 폴더 밖에 저장될 수 있다',
    ],
    a: 3,
    e: '파일 이름은 클라이언트가 마음대로 정할 수 있습니다. "../../app/config.yml" 같은 이름이면 resolve 결과가 업로드 폴더 밖을 가리켜 중요한 파일을 덮어쓸 수 있습니다(경로 조작). 저장 이름은 서버가 정합니다.',
  },
  {
    id: 'prq37', sec: 'sec', topic: '화면만 막은 권한',
    ctx: '관리자 메뉴는 일반 사용자 화면에 보이지 않습니다. 그런데 주소만 알면 일반 계정으로 /api/admin/users를 불러 회원 목록을 받을 수 있었습니다.',
    code: `@GetMapping("/api/admin/users")
public List<UserResponse> users() {
    return userService.findAll();
}`,
    q: '원인과 해결로 알맞은 것은?',
    o: [
      '서버 API가 권한을 확인하지 않아 누구나 부를 수 있다',
      '버튼을 CSS로만 숨겨서라 DOM에서 지우면 된다',
      '관리자 API 주소를 길고 복잡하게 바꾸면 된다',
      '관리자 API를 POST로만 받으면 일반 사용자는 못 부른다',
    ],
    a: 0,
    e: '화면에서 메뉴를 숨기는 건 사용 편의일 뿐 보안이 아닙니다. 요청은 누구나 직접 보낼 수 있으므로 서버 API에서 역할을 확인해야 합니다. 주소를 숨기거나 메서드를 바꾸는 것도 보안이 되지 않습니다.',
  },
  {
    id: 'prq38', sec: 'sec', topic: '무차별 대입',
    ctx: '로그인 API에 같은 계정으로 1초에 수백 번 비밀번호를 바꿔 가며 시도하는 요청이 들어옵니다.',
    code: `@PostMapping("/login")
public TokenResponse login(@RequestBody LoginRequest req) {
    return authService.login(req); // 실패하면 401
}`,
    q: '가장 알맞은 대응은?',
    o: [
      'BCrypt를 쓰면 시도 횟수와 관계없이 안전하다',
      '계정과 IP별 시도 횟수를 세어 잠시 막는다',
      '실패 응답을 200으로 바꾸면 공격자가 포기한다',
      '비밀번호 최소 길이를 줄여 처리 속도를 높인다',
    ],
    a: 1,
    e: 'BCrypt는 한 번의 비교를 느리게 할 뿐, 시도를 무한히 허용하면 약한 비밀번호는 결국 뚫립니다. 계정과 IP별로 실패 횟수를 세어 일정 횟수를 넘으면 잠시 막는 요청 제한이 필요합니다.',
  },
  {
    id: 'prq39', sec: 'ext', topic: '타임아웃 없는 호출',
    ctx: '결제사 서버 응답이 느려지자, 결제와 상관없는 API까지 우리 서버 전체가 응답하지 않았습니다.',
    code: `private final RestTemplate restTemplate = new RestTemplate();

public PayResult pay(PayRequest req) {
    return restTemplate.postForObject(PAY_URL, req, PayResult.class);
}`,
    q: '서버 전체가 멈춘 이유로 옳은 것은?',
    o: [
      '외부 API가 느리면 스프링이 자동으로 요청을 취소한다',
      'RestTemplate은 비동기라 스레드를 붙잡지 않는다',
      '타임아웃이 없어 요청 스레드가 계속 기다리며 쌓인다',
      '결제사 응답이 JSON이 아니라 파싱이 멈췄다',
    ],
    a: 2,
    e: '기본 RestTemplate은 타임아웃이 없어(무한 대기), 느린 응답을 기다리는 요청 스레드가 하나둘 쌓입니다. 톰캣 스레드가 모두 묶이면 다른 API 요청도 처리할 스레드가 없어 함께 멈춥니다.',
  },
  {
    id: 'prq40', sec: 'ext', topic: '트랜잭션 안의 외부 호출',
    ctx: '결제사 응답이 느려진 날, 결제와 관계없는 API에서도 "Connection is not available" 오류가 쏟아졌습니다.',
    code: `@Transactional
public void order(OrderRequest req) {
    Order order = orderRepository.save(req.toOrder());
    paymentClient.pay(order); // 3~10초 걸림
    order.markPaid();
}`,
    q: '다른 API까지 실패한 이유로 옳은 것은?',
    o: [
      '결제가 실패하면 주문이 자동으로 재시도되기 때문이다',
      'save가 결제 응답까지 테이블 전체를 잠그기 때문이다',
      '트랜잭션 안의 외부 호출은 커넥션을 새로 만들기 때문이다',
      '외부 응답을 기다리는 동안 DB 커넥션을 계속 쥐고 있다',
    ],
    a: 3,
    e: '트랜잭션이 시작되면 DB 커넥션을 하나 잡고 끝날 때 돌려줍니다. 그 안에서 외부 API를 기다리면 그동안 커넥션이 묶이고, 요청이 몰리면 커넥션 풀이 바닥나 다른 API도 커넥션을 얻지 못합니다.',
  },
  {
    id: 'prq41', sec: 'ext', topic: '웹훅 중복',
    ctx: '결제 완료 웹훅이 두 번 들어와 포인트가 두 번 적립됐습니다. 결제사 문서에는 "응답이 늦으면 다시 보낸다"고 적혀 있습니다.',
    code: `@PostMapping("/webhooks/payment")
public void paid(@RequestBody PaymentEvent event) {
    pointService.add(event.userId(), event.amount() / 100);
}`,
    q: '가장 알맞은 해결은?',
    o: [
      '웹훅은 다시 올 수 있어 이벤트 ID로 처리 여부를 기록한다',
      '결제사 쪽 오류이니 중복 전송을 막아 달라고만 요청한다',
      '웹훅 응답을 늦게 주면 다시 보내지 않는다',
      '웹훅 수신 API를 GET으로 바꾸면 멱등해진다',
    ],
    a: 0,
    e: '대부분의 웹훅은 "최소 한 번" 전달이라 중복을 전제로 만들어야 합니다. 이벤트 ID를 유니크하게 저장해 이미 처리한 이벤트면 건너뛰면, 몇 번이 와도 결과가 한 번 처리한 것과 같습니다.',
  },
  {
    id: 'prq42', sec: 'ext', topic: '재시도 폭주',
    ctx: '외부 API가 잠깐 장애 났을 때 우리 서버들이 모든 오류를 즉시 5번씩 재시도해, 상대 서버의 회복이 더 늦어졌습니다. 400 오류도 재시도했습니다.',
    code: `for (int i = 0; i < 5; i++) {
    try {
        return client.call(req);
    } catch (Exception e) {
        // 바로 다시 시도
    }
}`,
    q: '가장 알맞은 개선은?',
    o: [
      '재시도는 많을수록 성공률이 높아 횟수 제한이 필요 없다',
      '4xx는 빼고, 간격을 늘려 가며 횟수 상한을 둔다',
      '재시도 간격을 0으로 두면 장애가 빨리 끝난다',
      '모든 오류를 5번 재시도하는 것이 표준 설정이다',
    ],
    a: 1,
    e: '400처럼 요청 자체가 잘못된 오류는 몇 번을 보내도 같습니다. 일시적인 오류(5xx, 타임아웃)만 재시도하되, 간격을 지수적으로 늘리고 무작위 지연을 섞어 여러 서버가 한꺼번에 몰리지 않게 합니다.',
  },
  {
    id: 'prq43', sec: 'ext', topic: '롤백과 메일',
    ctx: '회원가입이 중간에 DB 오류로 실패해 롤백됐는데, 그 사람에게 환영 메일이 발송됐습니다.',
    code: `@Transactional
public void join(SignupRequest req) {
    memberRepository.save(req.toMember());
    mailService.sendWelcome(req.email());
    pointRepository.save(new Point(req.email(), 1000)); // 여기서 예외
}`,
    q: '메일이 나간 이유로 옳은 것은?',
    o: [
      '메일 서버가 트랜잭션에 참여해 롤백을 무시했다',
      'save가 즉시 커밋돼 가입은 실제로 성공했다',
      '메일은 DB 밖의 작업이라 롤백해도 되돌릴 수 없다',
      '런타임 예외가 아니라서 롤백 자체가 안 됐다',
    ],
    a: 2,
    e: 'DB 롤백은 DB 안의 변경만 되돌립니다. 메일 발송, 외부 API 호출, 파일 쓰기 같은 바깥 작업은 이미 일어난 일이라 되돌릴 수 없습니다. 이런 작업은 커밋이 끝난 뒤에 하도록 미룹니다.',
  },
  {
    id: 'prq44', sec: 'ext', topic: '메시지 중복 소비',
    ctx: 'Kafka 컨슈머가 재시작된 뒤, 이미 보낸 알림이 같은 사용자에게 한 번 더 발송됐습니다.',
    code: `@KafkaListener(topics = "notification")
public void consume(NotificationEvent event) {
    pushClient.send(event.userId(), event.message());
    // 처리 후 오프셋 커밋(기본 설정)
}`,
    q: '이 상황을 바르게 이해한 것은?',
    o: [
      'Kafka는 정확히 한 번 전달이 기본이라 다른 원인이다',
      '오프셋을 처리 전에 커밋하면 중복도 유실도 없다',
      '파티션을 하나로 줄이면 중복이 생기지 않는다',
      '처리 뒤 커밋 전에 죽으면 다시 받으니 멱등하게 만든다',
    ],
    a: 3,
    e: '처리한 뒤 오프셋을 커밋하는 기본 방식은 "최소 한 번" 전달입니다. 처리는 끝났는데 커밋 전에 컨슈머가 죽으면, 재시작 후 같은 메시지를 다시 받습니다. 이벤트 ID로 처리 기록을 남겨 중복을 건너뜁니다.',
  },
  {
    id: 'prq45', sec: 'ops', topic: '배포 중 컬럼 변경',
    ctx: '롤링 배포를 시작하기 전에 컬럼 이름을 바꾸는 SQL을 먼저 실행했더니, 배포가 끝날 때까지 몇 분 동안 500 오류가 났습니다.',
    code: `ALTER TABLE members RENAME COLUMN name TO nickname;
-- 이후 새 버전(nickname 사용)을 서버 한 대씩 배포`,
    q: '오류가 난 이유로 옳은 것은?',
    o: [
      '아직 안 바뀐 이전 버전 서버가 옛 컬럼 이름으로 조회했다',
      '롤링 배포가 DB 변경을 자동으로 되돌렸다',
      'MySQL은 컬럼 이름 변경을 지원하지 않는다',
      '새 버전 서버가 캐시를 비우지 않았다',
    ],
    a: 0,
    e: '롤링 배포 중에는 이전 버전과 새 버전 서버가 함께 돕니다. 컬럼 이름을 먼저 바꾸면 아직 교체되지 않은 이전 버전 서버의 SQL이 name 컬럼을 찾지 못해 실패합니다.',
  },
  {
    id: 'prq46', sec: 'ops', topic: '컨테이너 메모리',
    ctx: 'Docker Compose에서 mem_limit을 1g로 두고 JVM 옵션을 -Xmx1g로 줬더니, 컨테이너가 가끔 exit code 137로 종료됩니다.',
    code: `services:
  backend:
    mem_limit: 1g
    environment:
      JAVA_OPTS: "-Xmx1g"`,
    q: '종료되는 이유로 옳은 것은?',
    o: [
      '힙이 1GB면 JVM 전체 메모리도 정확히 1GB로 고정된다',
      '힙 밖 메모리까지 더해 컨테이너 한도를 넘었다',
      'exit code 137은 자바의 NullPointerException 종료 코드다',
      'Docker는 JVM 프로세스의 메모리를 제한하지 못한다',
    ],
    a: 1,
    e: 'JVM은 힙 말고도 스레드 스택, 메타스페이스, 코드 캐시, 직접 메모리를 씁니다. 힙만 1GB를 주면 전체는 1GB를 넘고, 한도를 넘은 컨테이너는 커널이 강제 종료(SIGKILL, 137)합니다.',
  },
  {
    id: 'prq47', sec: 'ops', topic: '헬스체크 설계',
    ctx: 'DB가 10초 정도 끊겼을 뿐인데, 오케스트레이터가 앱 컨테이너를 전부 재시작해 장애가 몇 분으로 길어졌습니다.',
    code: `# 재시작 판단(liveness)에 쓰는 경로
livenessProbe:
  httpGet:
    path: /actuator/health   # db 상태 포함`,
    q: '장애가 길어진 이유로 옳은 것은?',
    o: [
      '헬스체크는 DB 상태를 반드시 포함해야 하는 표준이 있다',
      '재시작은 항상 복구를 돕기 때문에 문제가 아니다',
      '살아 있는지 보는 검사에 DB를 넣어 앱까지 재시작됐다',
      '헬스체크 주기가 길어서 재시작이 늦게 일어났다',
    ],
    a: 2,
    e: '앱은 멀쩡한데 DB가 잠깐 끊긴 것만으로 "죽었다"고 판단해 재시작했고, 모든 컨테이너가 동시에 다시 뜨느라 복구가 늦어졌습니다. 재시작 판단(liveness)에는 앱 자체 상태만 넣습니다.',
  },
  {
    id: 'prq48', sec: 'ops', topic: '로그와 디스크',
    ctx: '운영 서버 디스크가 가득 차 서비스가 멈췄습니다. 확인해 보니 애플리케이션 로그 파일이 수십 GB였습니다.',
    code: `logging:
  level:
    root: DEBUG
  file:
    name: /var/log/app/app.log`,
    q: '원인으로 가장 알맞은 것은?',
    o: [
      '로그는 자동으로 압축돼 디스크를 쓰지 않아 다른 원인이다',
      'INFO 레벨이 DEBUG보다 더 많은 로그를 남긴다',
      '디스크가 차면 JVM이 오래된 로그를 지워 준다',
      'DEBUG 레벨에 보관 기한 없는 파일 로그가 디스크를 채웠다',
    ],
    a: 3,
    e: '운영에서 DEBUG를 켜 두면 로그 양이 몇 배로 늘어납니다. 보관 기간과 전체 용량 상한이 없으면 파일이 끝없이 커져 디스크를 채웁니다. 디스크가 차면 DB와 앱이 모두 멈출 수 있습니다.',
  },
  {
    id: 'prq49', sec: 'ops', topic: '되돌릴 수 없는 마이그레이션',
    ctx: '새 버전 배포에 "안 쓰는 컬럼 삭제" 마이그레이션이 함께 들어갔습니다. 배포 후 오류가 나 이전 버전으로 롤백했는데 오류가 계속됩니다.',
    code: `-- V12__drop_legacy_column.sql
ALTER TABLE orders DROP COLUMN legacy_status;`,
    q: '롤백해도 오류가 계속되는 이유로 옳은 것은?',
    o: [
      '코드는 되돌렸지만 지워진 컬럼은 돌아오지 않았다',
      '롤백하면 이전 버전의 캐시가 남아 오류가 난다',
      '마이그레이션 도구가 롤백 때 컬럼을 두 번 지운다',
      '이전 버전 이미지가 손상돼 다시 빌드해야 한다',
    ],
    a: 0,
    e: '이전 버전 코드는 아직 legacy_status를 쓰는데, 컬럼은 이미 지워졌습니다. 코드 롤백은 DB를 되돌리지 않습니다. 컬럼 삭제처럼 되돌릴 수 없는 변경은 그 컬럼을 쓰는 코드가 모두 사라진 다음 배포로 미룹니다.',
  },
  {
    id: 'prq50', sec: 'ops', topic: '알림 기준',
    ctx: 'CPU와 메모리 사용률 알림만 걸어 두었는데, 로그인 오류가 한 시간 동안 이어지는 동안 아무 알림도 오지 않았습니다.',
    code: `alerts:
  - cpu_usage > 80%
  - memory_usage > 85%`,
    q: '가장 알맞은 개선은?',
    o: [
      '알림은 많을수록 좋아 모든 지표에 낮은 기준으로 건다',
      '사용자가 겪는 오류율과 지연을 기준으로 알림을 건다',
      'CPU 기준을 50%로 낮추면 로그인 오류도 잡힌다',
      '장애는 사용자 제보로 아는 것이 가장 정확하다',
    ],
    a: 1,
    e: '자원 지표는 멀쩡해도 사용자는 오류를 겪을 수 있습니다. 로그인 실패율, 5xx 비율, p95 지연처럼 사용자가 체감하는 지표(SLI)에 알림을 걸어야 장애를 먼저 알 수 있습니다.',
  },
];
