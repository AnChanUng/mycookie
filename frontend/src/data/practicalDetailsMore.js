// 실무형 문제 2차(prq16~prq50)의 풍부한 해설. wrong: 오답 보기별 이유, fix: 고친 코드, tips: 더 알아 둘 점
export const PRACTICAL_DETAILS_MORE = {
  prq16: {
    wrong: {
      0: '변경 감지는 영속 엔티티면 어디서든 동작합니다. 문제는 커밋 때 flush가 생략된다는 점입니다.',
      1: 'findById는 영속성 컨텍스트가 관리하는 원본 엔티티를 돌려줍니다.',
      2: '쓰기 트랜잭션이었다면 save 없이도 변경 감지로 저장됩니다.',
    },
    fix: `@Service
@Transactional(readOnly = true)
public class MemberService {
    @Transactional // 쓰기 메서드는 따로 덮어쓴다
    public void rename(Long id, String name) {
        memberRepository.findById(id).orElseThrow().changeName(name);
    }
}`,
    tips: ['조회가 많은 서비스에서는 클래스에 readOnly를 걸고 쓰기 메서드에만 @Transactional을 붙이는 방식이 흔합니다. 빠뜨리면 이 문제처럼 조용히 저장되지 않아 테스트로 꼭 확인합니다.'],
  },
  prq17: {
    wrong: {
      1: 'catch에서 로그만 남기면 예외는 거기서 끝납니다. 롤백 표시가 이미 붙은 게 원인입니다.',
      2: '별도 빈이라 프록시를 거쳐 트랜잭션이 적용됐고, 그래서 롤백 표시까지 붙었습니다.',
      3: 'RuntimeException도 catch로 잡을 수 있습니다.',
    },
    fix: `// 쿠폰 발급을 독립 트랜잭션으로 분리
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void issue(Long userId) { ... }`,
    tips: ['"안쪽 실패는 무시하고 바깥은 커밋"이 목적이면 안쪽을 REQUIRES_NEW로 떼거나, 안쪽에서 예외를 던지지 않고 결과 값으로 실패를 알립니다.', '면접 꼬리질문: "UnexpectedRollbackException은 언제 나나?"에 이 상황을 그대로 설명하면 됩니다.'],
  },
  prq18: {
    wrong: {
      0: 'orphanRemoval이 없으면 flush해도 컬렉션에서 뺀 것만으로는 DELETE가 나가지 않습니다.',
      2: 'cascade = ALL에는 REMOVE가 포함됩니다. 다만 REMOVE는 부모를 지울 때의 이야기입니다.',
      3: 'mappedBy 쪽 컬렉션도 자바 객체로는 자유롭게 고칠 수 있습니다. DB 반영 여부가 다를 뿐입니다.',
    },
    fix: `@OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
private List<OrderItem> items = new ArrayList<>();`,
    tips: ['orphanRemoval은 자식이 한 부모에만 속할 때(주문과 주문 항목)만 씁니다. 다른 곳에서도 참조하는 엔티티에 걸면 의도치 않게 지워집니다.'],
  },
  prq19: {
    wrong: {
      0: 'hibernate.jdbc.batch_size는 INSERT, UPDATE를 묶어 보내는 설정입니다. 조회 묶음은 default_batch_fetch_size입니다.',
      1: 'saveAll은 하나의 트랜잭션 안에서 실행됩니다.',
      3: '@Version 여부는 INSERT 배치와 관계없습니다.',
    },
    fix: `// MySQL에서 대량 저장은 JdbcTemplate 배치로
jdbcTemplate.batchUpdate(
    "INSERT INTO member (name, email) VALUES (?, ?)",
    members, 1000,
    (ps, m) -> { ps.setString(1, m.getName()); ps.setString(2, m.getEmail()); });`,
    tips: ['MySQL JDBC URL에 rewriteBatchedStatements=true를 주면 배치 INSERT를 한 문장으로 합쳐 더 빨라집니다.', 'SEQUENCE를 지원하는 DB(PostgreSQL 등)라면 SEQUENCE 전략과 allocationSize로 JPA 배치를 살릴 수 있습니다.'],
  },
  prq20: {
    wrong: {
      0: 'existsBy는 매번 DB에 쿼리를 보냅니다. 두 요청이 거의 동시에 "없음"을 본 게 문제입니다.',
      1: 'flush를 당겨도 두 트랜잭션이 각자 확인한 뒤 저장하는 틈은 그대로입니다.',
      2: '@Transactional을 빼도 요청은 여러 스레드에서 동시에 처리됩니다.',
    },
    fix: `-- DB가 중복을 막는다
ALTER TABLE coupon ADD CONSTRAINT uk_coupon_user UNIQUE (user_id);

// 서비스: 중복 예외를 "이미 발급됨"으로 바꾼다
try {
    couponRepository.saveAndFlush(new Coupon(userId));
} catch (DataIntegrityViolationException e) {
    throw new AlreadyIssuedException();
}`,
    tips: ['애플리케이션 검사는 친절한 메시지용, 유니크 제약은 진짜 방어용으로 둘 다 두는 게 좋습니다.', '선착순 수량 제한(100장)까지 있다면 Redis INCR로 먼저 거르는 방식도 많이 씁니다.'],
  },
  prq21: {
    wrong: {
      1: 'SET NX는 Redis 하나를 두고 여러 서버가 함께 쓰는 락이라 여러 대에서도 동작합니다.',
      2: 'Redis가 락을 동시에 두 번 준 게 아니라, 첫 락이 만료된 뒤 두 번째가 얻은 것입니다.',
      3: '키 이름에 콜론을 쓰는 건 흔한 관례이고 문제없습니다.',
    },
    fix: `// 해제할 때 내 토큰인지 확인하고 지운다(Lua로 원자적으로)
String script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
redis.execute(new DefaultRedisScript<>(script, Long.class), List.of("lock:settle"), token);`,
    tips: ['Redisson의 RLock은 작업 중 만료 시간을 자동으로 연장(watchdog)해 이 문제를 줄여 줍니다.', '정산처럼 중복이 치명적인 작업은 락에만 기대지 말고, DB에 "정산 완료" 기록을 유니크하게 남겨 한 번 더 막습니다.'],
  },
  prq22: {
    wrong: {
      0: 'InnoDB의 FOR UPDATE는 인덱스로 찾은 행을 잠급니다.',
      2: '자료형은 데드락과 관계없습니다.',
      3: '같은 순서로 잠그면 여러 번 조회해도 데드락이 나지 않습니다.',
    },
    fix: `// 항상 작은 ID부터 잠근다
Long first = Math.min(from, to), second = Math.max(from, to);
Account a1 = accountRepository.findForUpdate(first);
Account a2 = accountRepository.findForUpdate(second);`,
    tips: ['MySQL은 데드락을 감지하면 한쪽 트랜잭션을 롤백시킵니다. 롤백된 쪽은 다시 시도하면 대개 성공하므로, 재시도 로직을 두기도 합니다.', 'SHOW ENGINE INNODB STATUS로 마지막 데드락이 어떤 쿼리끼리 났는지 볼 수 있습니다.'],
  },
  prq23: {
    wrong: {
      0: 'PageRequest는 LIMIT과 OFFSET을 붙일 뿐, 여러 쿼리로 나누지 않습니다.',
      1: '읽어 온 행을 객체로 만들어 응답을 만드는 데 서버 메모리를 씁니다.',
      3: 'Page로 바꿔도 size만큼 읽는 건 같습니다.',
    },
    fix: `int safeSize = Math.min(Math.max(size, 1), 100); // 1~100으로 제한
return postService.list(PageRequest.of(page, safeSize));`,
    tips: ['Spring Data의 Pageable 인자를 쓰면 기본으로 최대 2000으로 제한됩니다(spring.data.web.pageable.max-page-size). 직접 받는 파라미터는 직접 막아야 합니다.'],
  },
  prq24: {
    wrong: {
      0: 'PATCH는 부분 수정, PUT이 전체 교체입니다.',
      1: 'Jackson은 없는 필드를 빈 문자열이 아니라 null(또는 기본값)로 둡니다.',
      2: '변경 감지는 null도 값으로 보고 그대로 반영합니다. 버그가 아니라 정상 동작입니다.',
    },
    fix: `if (req.nickname() != null) p.setNickname(req.nickname());
if (req.bio() != null) p.setBio(req.bio());`,
    tips: ['"값을 지우고 싶다(null로 만들기)"와 "보내지 않았다"를 구분해야 하면 JsonNullable이나 Map으로 받아 필드가 왔는지부터 확인합니다.'],
  },
  prq25: {
    wrong: {
      1: 'Redis 키는 문자열로 저장되므로 숫자 ID도 문제없습니다.',
      2: '@Cacheable은 정상 결과를 캐시하는 기능입니다.',
      3: '키가 ID라 같은 캐시 이름 안에서도 서로 섞이지 않습니다.',
    },
    fix: `// 없는 결과도 짧게 캐시(예: 별도 캐시 이름에 TTL 1분)
@Cacheable(value = "product-miss")
public Optional<ProductResponse> find(Long id) {
    return productRepository.findById(id).map(ProductResponse::from);
}`,
    tips: ['악의적으로 무작위 ID를 쏟아붓는 경우엔 빈 결과 캐시만으로 부족해, 존재 가능한 ID인지 미리 거르는 블룸 필터나 요청 제한을 함께 씁니다.'],
  },
  prq26: {
    wrong: {
      0: 'Redis 재시작은 값을 지우거나 그대로 둘 뿐, 타입 정보와는 관계없습니다.',
      2: 'TTL은 값의 수명일 뿐 역직렬화와 관계없습니다.',
      3: 'Serializable 클래스는 잘 저장됩니다. 저장 뒤 클래스가 바뀐 게 문제입니다.',
    },
    fix: `// JSON으로 저장하고, 캐시 이름에 버전을 붙여 구조가 바뀌면 새 키를 쓴다
RedisCacheConfiguration.defaultCacheConfig()
    .serializeValuesWith(SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()))
    .prefixCacheNameWith("v2:");`,
    tips: ['캐시는 배포를 넘어 살아남습니다. 캐시에 넣는 클래스를 바꿀 때는 키 버전을 올리거나 배포 때 해당 캐시를 비웁니다.'],
  },
  prq27: {
    wrong: {
      0: 'DATE 함수는 MySQL에서 잘 지원합니다. 인덱스를 못 쓰게 만들 뿐입니다.',
      1: '날짜 열의 B-tree 인덱스는 범위 조건에 잘 쓰입니다.',
      3: '결과는 맞게 나옵니다. 느린 게 문제입니다.',
    },
    fix: `SELECT * FROM orders
WHERE created_at >= '2026-11-28'
  AND created_at <  '2026-11-29';`,
    tips: ['"열에는 손대지 말고 값 쪽을 바꾼다"가 규칙입니다. MySQL 8은 함수 인덱스도 지원하지만, 범위 조건으로 바꾸는 게 먼저입니다.'],
  },
  prq28: {
    wrong: {
      0: '복합 인덱스는 맨 앞 열 조건이 있으면 잘 쓰입니다.',
      1: '두 번째 열도 오름차순으로 저장됩니다. 다만 맨 앞 열 안에서만 정렬돼 있습니다.',
      2: 'SELECT *는 오히려 인덱스만으로 끝내지 못하게 만듭니다.',
    },
    fix: `-- 자주 쓰는 조회에 맞춰 인덱스를 따로 둔다
CREATE INDEX idx_created ON orders (created_at);`,
    tips: ['복합 인덱스 열 순서는 "등호 조건 열 먼저, 범위 조건 열 나중"이 기본입니다. status = ? AND created_at >= ? 조회라면 (status, created_at)이 맞습니다.'],
  },
  prq29: {
    wrong: {
      1: 'LIKE도 앞부분이 정해져 있으면 인덱스를 잘 씁니다.',
      2: '한글이어도 인덱스는 같은 방식으로 동작합니다.',
      3: '뒤에 %를 붙여도 앞에 %가 있는 한 인덱스를 쓰지 못합니다.',
    },
    fix: `-- 앞부분 검색으로 바꿀 수 있다면
SELECT * FROM members WHERE name LIKE '민수%';
-- 중간 글자 검색이 꼭 필요하면 전문 검색(FULLTEXT, ngram)이나 검색 엔진을 쓴다`,
    tips: ['MySQL은 ngram 파서를 쓴 FULLTEXT 인덱스로 한글 부분 검색을 지원합니다. 규모가 커지면 Elasticsearch 같은 검색 엔진을 둡니다.'],
  },
  prq30: {
    wrong: {
      0: '숫자로 바꿔 비교하므로 앞의 0이 있어도 결과는 찾아집니다. 문제는 속도입니다.',
      2: 'VARCHAR 열에도 인덱스를 만들 수 있습니다.',
      3: 'InnoDB의 일반 인덱스는 B-tree입니다. 해시로 처리하지 않습니다.',
    },
    fix: `SELECT * FROM members WHERE phone = '01012345678';
-- JPA에서는 파라미터 타입을 String으로 맞춘다`,
    tips: ['반대로 숫자 열을 문자열과 비교하면 값 쪽만 바뀌어 인덱스를 씁니다. 헷갈리면 "열과 값의 타입을 항상 같게"만 지키면 됩니다.'],
  },
  prq31: {
    wrong: {
      0: 'LIMIT이 있어도 ORDER BY id는 기본키 인덱스 순서로 읽을 수 있습니다.',
      1: 'id처럼 인덱스가 있는 열은 정렬 없이 인덱스 순서로 읽습니다.',
      3: '압축과는 관계없습니다. 건너뛸 행을 읽는 비용입니다.',
    },
    fix: `-- 마지막으로 본 id 다음부터 읽는다(커서 방식)
SELECT * FROM posts
WHERE id < :lastId
ORDER BY id DESC
LIMIT 20;`,
    tips: ['커서 방식은 "몇 페이지로 바로 가기"가 어렵습니다. 게시판처럼 페이지 번호가 필요하면 최대 페이지를 제한하는 절충도 씁니다.'],
  },
  prq32: {
    wrong: {
      0: 'ALL은 인덱스를 쓰지 않는 전체 스캔으로 가장 느린 방식입니다.',
      1: 'rows는 읽을 것으로 추정한 행 수입니다. 결과 행 수가 아닙니다.',
      2: 'MySQL 8에는 쿼리 캐시가 없어졌고, EXPLAIN과도 관계없습니다.',
    },
    fix: `-- 자주 쓰는 조건이면 인덱스를 검토한다
CREATE INDEX idx_memo ON orders (memo);
-- 실제 실행 시간까지 보려면(운영에서는 조심)
EXPLAIN ANALYZE SELECT * FROM orders WHERE memo = '빠른 배송';`,
    tips: ['type은 대략 const, eq_ref, ref, range, index, ALL 순으로 느려집니다. ALL과 index(인덱스 전체 스캔)가 보이면 먼저 의심합니다.'],
  },
  prq33: {
    wrong: {
      1: '번호를 UUID로 바꾸면 추측은 어려워지지만, 권한 검사가 없으면 알아낸 번호로 여전히 볼 수 있습니다.',
      2: 'GET이어도 인증 헤더나 쿠키는 함께 전달됩니다.',
      3: 'DTO는 노출 필드를 줄일 뿐, 남의 주문을 막는 기능이 아닙니다.',
    },
    fix: `@GetMapping("/orders/{id}")
public OrderResponse get(@PathVariable Long id, @AuthenticationPrincipal LoginUser user) {
    Order order = orderRepository.findByIdAndUserId(id, user.id())
        .orElseThrow(OrderNotFoundException::new); // 남의 주문이면 404
    return OrderResponse.from(order);
}`,
    tips: ['IDOR은 OWASP Top 10의 1위(접근 통제 실패)에 속하는 흔한 취약점입니다. 목록, 상세, 수정, 삭제 API마다 "이 데이터의 주인인가"를 확인합니다.'],
  },
  prq34: {
    wrong: {
      0: '레벨과 관계없이 출력되는 로그라면 민감 정보가 남습니다. 무엇을 찍느냐가 문제입니다.',
      2: 'BCrypt는 DB 저장 방식이고, 로그에 원문이 찍히는 것과는 별개입니다.',
      3: 'HTTPS는 전송 구간 암호화이고, 서버가 찍은 로그와는 관계없습니다.',
    },
    fix: `public record LoginRequest(String email, String password) {
    @Override
    public String toString() {
        return "LoginRequest[email=" + email + ", password=***]";
    }
}`,
    tips: ['로그 수집 단계(Alloy, Logstash 등)에서도 비밀번호, 토큰 같은 패턴을 가려 이중으로 막습니다.', '요청 본문 전체를 로그로 남기는 필터는 특히 위험해, 민감한 경로는 빼야 합니다.'],
  },
  prq35: {
    wrong: {
      0: '키가 길어도 공개되면 그 키로 누구나 서명할 수 있습니다.',
      1: 'Git 기록, 포크, 캐시에 남아 있어 커밋을 지워도 공개된 사실은 되돌릴 수 없습니다.',
      3: '만료를 늘리면 위조 토큰이 더 오래 유효해져 오히려 위험합니다.',
    },
    fix: `jwt:
  secret: \${JWT_SECRET} # 서버 환경 변수로 주입, 저장소에는 값을 두지 않는다`,
    tips: ['GitHub의 비밀 값 검사(secret scanning)나 gitleaks 같은 도구를 CI에 넣으면 이런 실수를 커밋 전에 잡을 수 있습니다.'],
  },
  prq36: {
    wrong: {
      0: '크기 검사도 필요하지만, 경로 조작이 더 큰 문제입니다.',
      1: 'transferTo는 경로를 검사하지 않고, 같은 이름이면 덮어씁니다.',
      2: '인코딩 문제와는 별개로, 이름 자체로 저장 위치를 바꿀 수 있는 게 문제입니다.',
    },
    fix: `String ext = StringUtils.getFilenameExtension(file.getOriginalFilename());
Path target = uploadDir.resolve(UUID.randomUUID() + "." + ext).normalize();
if (!target.startsWith(uploadDir)) throw new IllegalArgumentException("잘못된 파일 이름");
file.transferTo(target);`,
    tips: ['확장자와 Content-Type만 믿지 말고, 이미지라면 실제로 이미지로 읽히는지 확인합니다. 업로드 폴더는 웹에서 실행되지 않게 분리합니다.'],
  },
  prq37: {
    wrong: {
      1: 'DOM에서 지워도 API는 그대로라 직접 요청을 보내면 됩니다.',
      2: '주소를 숨기는 건 보안이 아닙니다. 브라우저 개발자 도구나 번들 파일에서 금방 드러납니다.',
      3: 'POST 요청도 누구나 보낼 수 있습니다.',
    },
    fix: `// Spring Security에서 경로 단위로 막는다
http.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .anyRequest().authenticated());`,
    tips: ['화면의 권한 표시와 서버의 권한 검사를 같은 기준(역할 이름)으로 맞춰 두면, 화면만 바뀌고 서버가 빠지는 실수를 줄일 수 있습니다.'],
  },
  prq38: {
    wrong: {
      0: 'BCrypt는 한 번의 비교를 느리게 할 뿐, 무한한 시도까지 막지 못합니다.',
      2: '응답 코드를 숨겨도 공격자는 다른 단서(토큰 발급 여부)로 성공을 알 수 있습니다.',
      3: '최소 길이를 줄이면 오히려 맞히기 쉬워집니다.',
    },
    fix: `// Redis로 5분 동안 실패 5회까지만 허용
String key = "login-fail:" + email;
Long fails = redis.opsForValue().increment(key);
if (fails == 1) redis.expire(key, Duration.ofMinutes(5));
if (fails > 5) throw new TooManyAttemptsException(); // 429`,
    tips: ['계정만 기준으로 막으면 공격자가 남의 계정을 일부러 잠글 수 있습니다. IP 기준과 함께 쓰고, 영구 잠금보다 잠시 막는 쪽이 보통입니다.'],
  },
  prq39: {
    wrong: {
      0: '스프링이 자동으로 취소해 주지 않습니다. 타임아웃을 직접 정해야 합니다.',
      1: 'RestTemplate은 동기 방식이라 응답이 올 때까지 스레드를 붙잡습니다.',
      3: '응답 형식이 아니라 응답이 오지 않는 게 문제입니다.',
    },
    fix: `SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
factory.setConnectTimeout(Duration.ofSeconds(2));
factory.setReadTimeout(Duration.ofSeconds(5));
RestTemplate restTemplate = new RestTemplate(factory);`,
    tips: ['외부 호출에는 연결 타임아웃과 읽기 타임아웃을 항상 둡니다. 상대가 자주 느려지면 회로 차단기(Resilience4j)로 빠르게 실패시켜 우리 서버를 보호합니다.'],
  },
  prq40: {
    wrong: {
      0: '자동 재시도는 일어나지 않습니다.',
      1: 'INSERT는 새 행만 잠급니다. 테이블 전체를 잠그지 않습니다.',
      2: '외부 호출이 커넥션을 새로 만드는 게 아니라, 이미 잡은 커넥션을 오래 쥐고 있는 게 문제입니다.',
    },
    fix: `public void order(OrderRequest req) {
    Long orderId = orderService.create(req);       // 트랜잭션 1: 주문 저장
    PayResult result = paymentClient.pay(orderId); // 트랜잭션 밖
    orderService.markPaid(orderId, result);        // 트랜잭션 2: 결과 반영
}`,
    tips: ['트랜잭션은 짧게, 외부 호출은 밖에서 하는 것이 원칙입니다. 결제 결과 반영이 실패할 때를 대비해 "결제 대기" 상태와 보상 처리를 설계합니다.'],
  },
  prq41: {
    wrong: {
      1: '결제사는 일부러 다시 보냅니다. 받는 쪽이 중복을 견뎌야 합니다.',
      2: '응답이 늦으면 오히려 실패로 보고 다시 보냅니다. 빨리 200을 주는 게 좋습니다.',
      3: '메서드만 바꾼다고 처리가 멱등해지지 않습니다.',
    },
    fix: `@Transactional
public void paid(PaymentEvent event) {
    if (!processedEventRepository.insertIfAbsent(event.id())) return; // 이미 처리함
    pointService.add(event.userId(), event.amount() / 100);
}`,
    tips: ['웹훅은 받자마자 저장하고 200을 돌려준 뒤, 실제 처리는 비동기로 하는 방식이 재전송을 줄입니다. 서명 헤더로 진짜 결제사에서 온 요청인지도 확인합니다.'],
  },
  prq42: {
    wrong: {
      0: '재시도는 상대에게 부하를 더합니다. 횟수 상한이 없으면 장애를 키웁니다.',
      2: '간격 없이 재시도하면 상대 서버가 회복할 틈이 없습니다.',
      3: '오류 종류에 따라 재시도 여부가 달라야 합니다.',
    },
    fix: `RetryConfig config = RetryConfig.custom()
    .maxAttempts(3)
    .intervalFunction(IntervalFunction.ofExponentialRandomBackoff(200, 2.0))
    .retryOnException(e -> e instanceof HttpServerErrorException || e instanceof ResourceAccessException)
    .build();`,
    tips: ['429나 503에 Retry-After 헤더가 오면 그 시간을 지킵니다. 결제처럼 중복이 위험한 요청은 멱등성 키 없이 재시도하지 않습니다.'],
  },
  prq43: {
    wrong: {
      0: 'SMTP 메일 서버는 DB 트랜잭션에 참여하지 않습니다.',
      1: 'save는 커밋 때 반영되므로, 예외로 롤백되면 회원도 저장되지 않습니다.',
      3: '런타임 예외라 롤백은 정상적으로 됐습니다. 메일만 되돌릴 수 없었습니다.',
    },
    fix: `// 가입 서비스: 이벤트만 발행
publisher.publishEvent(new MemberJoined(req.email()));

// 커밋이 끝난 뒤에만 메일을 보낸다
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onJoined(MemberJoined e) {
    mailService.sendWelcome(e.email());
}`,
    tips: ['메일을 Kafka 같은 메시지로 넘길 때도 같은 원칙입니다. 커밋 전에 보내면 롤백돼도 메시지가 나가므로, 아웃박스 패턴이나 커밋 후 발행을 씁니다.'],
  },
  prq44: {
    wrong: {
      0: 'Kafka 기본 동작은 "최소 한 번"이라 중복이 생길 수 있습니다.',
      1: '처리 전에 커밋하면 처리 중 죽었을 때 메시지를 잃습니다(최대 한 번).',
      2: '파티션 수와 중복 처리는 관계없습니다.',
    },
    fix: `@KafkaListener(topics = "notification")
public void consume(NotificationEvent event) {
    if (!sentLogRepository.insertIfAbsent(event.id())) return; // 이미 보냄
    pushClient.send(event.userId(), event.message());
}`,
    tips: ['유실보다 중복이 낫기 때문에 대부분 "최소 한 번 + 멱등 소비"를 택합니다. 면접에서 "Kafka에서 중복을 어떻게 처리하나요?"의 표준 답입니다.'],
  },
  prq45: {
    wrong: {
      1: '롤링 배포는 서버를 교체할 뿐 DB 변경을 되돌리지 않습니다.',
      2: 'MySQL 8은 RENAME COLUMN을 지원합니다. 지원돼서 바로 바뀐 게 문제입니다.',
      3: '캐시와는 관계없이 SQL이 실패한 것입니다.',
    },
    fix: `-- 1) 새 컬럼 추가, 양쪽에 쓰는 코드 배포
ALTER TABLE members ADD COLUMN nickname VARCHAR(50);
-- 2) 데이터 옮기기
UPDATE members SET nickname = name WHERE nickname IS NULL;
-- 3) 새 컬럼만 읽는 코드 배포 → 4) 다음 배포에서 옛 컬럼 삭제
ALTER TABLE members DROP COLUMN name;`,
    tips: ['확장, 이행, 정리 세 단계로 나누는 방식을 Parallel Change(Expand and Contract)라고 합니다. 무중단 배포에서 DB를 바꿀 때의 기본입니다.'],
  },
  prq46: {
    wrong: {
      0: '-Xmx는 힙만 제한합니다. JVM 전체 메모리는 그보다 큽니다.',
      2: '137은 128 + 9(SIGKILL)로, 메모리 한도 초과로 강제 종료됐다는 뜻입니다.',
      3: 'Docker의 mem_limit은 cgroup으로 프로세스 메모리를 실제로 제한합니다.',
    },
    fix: `environment:
  JAVA_OPTS: "-XX:MaxRAMPercentage=70"  # 컨테이너 한도의 70%만 힙으로`,
    tips: ['여러 컨테이너를 한 서버(예: 8GB 홈서버)에 올릴 때는 mem_limit 합계와 각 JVM 힙 비율을 함께 계산해야 서로를 죽이지 않습니다.', 'docker inspect로 OOMKilled가 true인지 보면 메모리 초과로 죽었는지 바로 확인할 수 있습니다.'],
  },
  prq47: {
    wrong: {
      0: '그런 표준은 없습니다. 무엇을 판단하는 검사인지에 따라 넣을지 정합니다.',
      1: '앱이 멀쩡한데 재시작하면 오히려 복구를 늦춥니다.',
      3: '주기와 관계없이, 재시작할 이유가 없는데 재시작한 게 문제입니다.',
    },
    fix: `# Spring Boot: liveness와 readiness를 나눈다
management:
  endpoint:
    health:
      probes:
        enabled: true
# livenessProbe → /actuator/health/liveness (앱 자체 상태)
# readinessProbe → /actuator/health/readiness (트래픽을 받아도 되는지)`,
    tips: ['liveness는 "재시작해야 하나", readiness는 "요청을 보내도 되나"를 판단합니다. DB가 끊기면 트래픽만 잠시 빼고(readiness), 재시작은 하지 않는 게 보통입니다.'],
  },
  prq48: {
    wrong: {
      0: '설정하지 않으면 자동으로 압축되지 않습니다.',
      1: 'DEBUG가 INFO보다 훨씬 많은 로그를 남깁니다.',
      2: 'JVM은 로그 파일을 지워 주지 않습니다.',
    },
    fix: `logging:
  level:
    root: INFO
  logback:
    rollingpolicy:
      max-file-size: 100MB
      max-history: 14
      total-size-cap: 2GB`,
    tips: ['Docker로 돌리면 컨테이너 표준 출력 로그도 쌓입니다. logging 드라이버 옵션(max-size, max-file)으로 함께 제한합니다.'],
  },
  prq49: {
    wrong: {
      1: '캐시가 아니라 컬럼이 없어 SQL이 실패하는 것입니다.',
      2: '롤백할 때 마이그레이션이 다시 실행되지는 않습니다.',
      3: '이미지는 멀쩡합니다. DB 구조가 바뀐 게 문제입니다.',
    },
    tips: ['컬럼 삭제처럼 되돌릴 수 없는 변경은 "그 컬럼을 안 쓰는 코드가 배포되고 충분히 지난 뒤" 따로 배포합니다.', '마이그레이션 전 백업이나 스냅샷을 남겨 두면 최악의 경우 데이터를 되살릴 수 있습니다.'],
  },
  prq50: {
    wrong: {
      0: '알림이 너무 많으면 사람들이 무시하게 되어(알림 피로) 정작 중요한 알림을 놓칩니다.',
      2: 'CPU가 낮아도 오류는 날 수 있습니다. 자원 지표로는 사용자 오류를 알 수 없습니다.',
      3: '사용자 제보는 늦고 일부만 알려 줍니다. 먼저 알아야 합니다.',
    },
    fix: `alerts:
  - login_failure_rate > 5% for 5m
  - http_5xx_ratio > 1% for 5m
  - p95_latency > 1s for 10m`,
    tips: ['SLO를 정하고 오류 예산이 빨리 줄어들 때 알리는 방식이 알림 피로를 줄이는 표준입니다. 메일 발송 실패가 일정 건수를 넘으면 메신저로 알리는 것도 같은 생각입니다.'],
  },
};
