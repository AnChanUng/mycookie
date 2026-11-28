// 실무형 문제의 풍부한 해설. 길게 늘이지 않고 종류를 나눈다.
// wrong: 오답 보기 번호(0부터)별로 왜 틀렸는지, fix: 고친 코드, tips: 실무에서 이어지는 함정이나 면접 꼬리질문
export const PRACTICAL_DETAILS = {
  prq01: {
    wrong: {
      1: 'flush는 SQL을 미리 보낼 뿐이고, 이 코드에는 애초에 롤백할 트랜잭션이 없습니다.',
      2: 'RuntimeException은 기본 롤백 대상입니다. 트랜잭션만 걸려 있었다면 롤백됐습니다.',
      3: 'public 메서드에는 @Transactional이 정상적으로 적용됩니다.',
    },
    fix: `@Transactional
public void placeOrder(Order order) {
    validate(order);
    saveWithPayment(order); // 이제 같은 트랜잭션 안
}`,
    tips: [
      '@Transactional, @Cacheable, @Async처럼 프록시로 동작하는 기능은 모두 같은 함정이 있습니다. 같은 클래스 안에서 this로 부르면 적용되지 않습니다.',
      '면접 꼬리질문: "트랜잭션 메서드를 다른 빈으로 빼는 것 말고 방법은?" 자기 자신을 주입받아 프록시로 부르거나 AspectJ 모드를 쓸 수 있지만, 구조를 나누는 쪽이 읽기 쉽습니다.',
    ],
  },
  prq02: {
    wrong: {
      0: 'save와 upload는 이미 같은 트랜잭션 안에 있습니다. 순서를 바꿔도 체크 예외면 커밋됩니다.',
      2: 'save는 영속성 컨텍스트에 넣고 커밋할 때 반영됩니다. 문제는 롤백이 아니라 커밋이 된다는 점입니다.',
      3: 'throws 선언은 트랜잭션 시작과 관계가 없습니다.',
    },
    fix: `@Transactional(rollbackFor = Exception.class)
public void write(PostRequest req, MultipartFile file) throws IOException {
    postRepository.save(req.toEntity());
    storage.upload(file);
}`,
    tips: [
      'DB 롤백으로는 외부 저장소에 이미 올라간 파일을 되돌릴 수 없습니다. 업로드 뒤 DB 저장이 실패하면 파일을 지우는 보상 처리가 따로 필요합니다.',
      '면접 꼬리질문: "왜 체크 예외는 기본으로 커밋할까?" 호출한 쪽이 복구할 수 있는 상황으로 보는 EJB 관례를 따랐기 때문입니다.',
    ],
  },
  prq03: {
    wrong: {
      0: 'catch 안에서도 다른 빈의 메서드를 얼마든지 부를 수 있습니다.',
      1: 'saveFailure는 실행돼 기록까지 했습니다. 그 기록이 바깥 트랜잭션과 함께 롤백된 것입니다.',
      3: 'readOnly의 기본값은 false입니다. 켜져 있었다면 오히려 저장이 반영되지 않는 다른 문제가 됩니다.',
    },
    fix: `// AuditService (별도 빈)
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveFailure(TransferRequest req, Exception e) { ... }`,
    tips: [
      'REQUIRES_NEW는 바깥 트랜잭션을 잠시 멈추고 커넥션을 하나 더 씁니다. 요청마다 많이 쓰면 커넥션 풀이 금방 바닥날 수 있습니다.',
      '같은 클래스 안에서 부르면 REQUIRES_NEW도 적용되지 않습니다. 실패 기록 메서드는 꼭 다른 빈에 둡니다.',
    ],
  },
  prq04: {
    wrong: {
      0: 'EAGER로 바꿔도 findAll 같은 JPQL에서는 회원을 따로 조회해 N+1이 그대로 날 수 있고, 필요 없는 화면에서도 회원을 가져옵니다.',
      1: 'readOnly는 플러시를 생략하는 힌트일 뿐, 연관 엔티티를 가져오는 방식은 바꾸지 않습니다.',
      2: '반복 방식과 관계없이 getMember().getName()을 부를 때마다 지연 로딩이 일어납니다.',
    },
    fix: `@Query("select o from Order o join fetch o.member")
List<Order> findAllWithMember();

// 또는
@EntityGraph(attributePaths = "member")
List<Order> findAll();`,
    tips: [
      '일대다 컬렉션을 페치 조인하면서 페이징하면 전체를 메모리에 올려 자릅니다. 그때는 hibernate.default_batch_fetch_size로 IN 쿼리 묶음 조회를 씁니다.',
      'N+1은 눈으로 안 보입니다. 개발 중에는 SQL 로그를 켜 두고 한 요청의 쿼리 수를 세는 습관을 들입니다.',
    ],
  },
  prq05: {
    wrong: {
      1: 'readOnly 트랜잭션 안에서는 컬렉션을 잘 읽습니다. 문제는 트랜잭션이 이미 끝났다는 점입니다.',
      2: '빈 컬렉션의 size()는 0을 돌려줄 뿐 예외를 던지지 않습니다.',
      3: '지연 로딩은 그대로 켜져 있고, 영속성 컨텍스트가 살아 있는 범위만 트랜잭션까지로 줄어듭니다.',
    },
    fix: `// 서비스 안에서 DTO로 바꿔 반환
@Transactional(readOnly = true)
public TeamResponse find(Long id) {
    Team team = teamRepository.findById(id).orElseThrow();
    return new TeamResponse(team.getName(), team.getMembers().size());
}`,
    tips: [
      'open-in-view를 켜 두면 응답이 끝날 때까지 DB 커넥션을 붙잡아, 트래픽이 많을 때 커넥션이 모자랄 수 있습니다. 그래서 끄고 서비스 안에서 필요한 데이터를 다 담아 나오는 방식을 권합니다.',
      '스프링 부트는 open-in-view가 기본으로 켜져 있으면 시작할 때 경고 로그를 남깁니다.',
    ],
  },
  prq06: {
    wrong: {
      0: '조회만으로는 저장하지 않습니다. 커밋 시점에 처음 상태와 달라진 값이 있을 때만 UPDATE합니다.',
      2: 'changeNickname은 필드만 바꿉니다. 저장은 커밋 때 영속성 컨텍스트가 합니다.',
      3: '정상 동작입니다. @Immutable은 변경을 무시하게 만드는 다른 목적의 기능입니다.',
    },
    tips: [
      '변경 감지는 트랜잭션 안의 영속 엔티티에만 일어납니다. 트랜잭션 밖에서 받은 준영속 엔티티를 고치면 DB에 반영되지 않습니다.',
      '면접 꼬리질문: "그럼 Spring Data의 save는 언제 필요한가?" 새 엔티티를 처음 저장할 때 persist하려고 부릅니다. 이미 영속 상태라면 부르지 않아도 됩니다.',
    ],
  },
  prq07: {
    wrong: {
      0: '변경 감지는 동시 요청에서도 정상 동작합니다. save를 불러도 같은 값을 덮어쓰는 건 똑같습니다.',
      1: '격리 수준을 낮추면 커밋되지 않은 값까지 읽어 더 나빠집니다.',
      3: '자료형과는 관계없는, 동시에 읽고 쓰는 순서의 문제입니다.',
    },
    fix: `// 원자적 UPDATE: 읽고 쓰는 사이를 없앤다
@Modifying
@Query("update Product p set p.stock = p.stock - 1 where p.id = :id and p.stock > 0")
int decrease(@Param("id") Long id); // 0이면 재고 부족`,
    tips: [
      '세 방법 비교: 낙관적 락은 충돌이 드물 때 가볍지만 재시도가 필요하고, 비관적 락은 충돌이 잦을 때 확실하지만 대기와 데드락을 조심해야 하고, 원자적 UPDATE는 단순한 증감에 가장 가볍습니다.',
      '면접에서 "재고 동시성"은 단골 주제입니다. 문제 상황, 세 가지 해결책, 고른 이유까지 한 번에 말할 수 있게 정리해 둡니다.',
    ],
  },
  prq08: {
    wrong: {
      0: 'synchronized는 인스턴스 메서드에도 동작합니다. 싱글톤 빈이라 한 객체의 락을 모두가 씁니다.',
      1: '무시되지는 않습니다. 락이 걸리는 범위가 커밋보다 좁은 게 문제입니다.',
      2: '영속성 컨텍스트는 트랜잭션마다 따로 만들어지고 스레드끼리 공유하지 않습니다.',
    },
    fix: `// 비관적 락: 읽을 때부터 행을 잠근다
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("select p from Product p where p.id = :id")
Optional<Product> findForUpdate(@Param("id") Long id);`,
    tips: [
      '서버가 두 대 이상이면 JVM 안의 락은 다른 서버를 막지 못합니다. DB 락, 원자적 UPDATE, Redis 분산 락처럼 모든 서버가 함께 보는 곳에서 막아야 합니다.',
      'synchronized를 트랜잭션 바깥 메서드로 옮기면 서버 한 대에서는 맞아지지만, 확장하는 순간 다시 깨지므로 권하지 않습니다.',
    ],
  },
  prq09: {
    wrong: {
      1: '버전 필드는 int, long 같은 숫자형이나 타임스탬프를 씁니다. String은 지원하지 않습니다.',
      2: '낙관적 락은 수정할 때 충돌을 감지하려는 기능입니다.',
      3: '버전 값은 JPA가 UPDATE할 때 자동으로 올립니다. 직접 올리면 안 됩니다.',
    },
    fix: `// 트랜잭션 밖에서 다시 시도해야 새 값을 읽는다
public void orderWithRetry(Long productId) {
    for (int i = 0; i < 3; i++) {
        try {
            orderService.order(productId); // @Transactional 메서드
            return;
        } catch (ObjectOptimisticLockingFailureException e) {
            // 다음 반복에서 새로 읽어 다시 시도
        }
    }
    throw new IllegalStateException("잠시 후 다시 시도해 주세요");
}`,
    tips: [
      '재시도는 트랜잭션 바깥에서 해야 합니다. 같은 트랜잭션 안에서 다시 시도하면 영속성 컨텍스트에 남은 옛 값을 그대로 씁니다.',
      '충돌이 자주 나는 곳(인기 상품 재고 등)이라면 재시도가 계속 실패하니, 비관적 락이나 원자적 UPDATE가 더 맞습니다.',
    ],
  },
  prq10: {
    wrong: {
      0: 'record 구성 요소에도 검증 애너테이션을 붙일 수 있고 잘 동작합니다.',
      2: '응답 코드는 검증 여부와 관계없습니다.',
      3: '@NotBlank는 null, 빈 문자열, 공백만 있는 문자열을 모두 거절합니다. null만 막는 건 @NotNull입니다.',
    },
    fix: `@PostMapping("/members")
public ResponseEntity<Void> signup(@Valid @RequestBody SignupRequest req) {
    memberService.join(req);
    return ResponseEntity.status(201).build();
}`,
    tips: [
      '스프링 부트 2.3부터 검증 라이브러리가 웹 스타터에서 빠졌습니다. @Valid를 붙여도 동작하지 않으면 spring-boot-starter-validation 의존성이 있는지 확인합니다.',
      '검증 실패는 MethodArgumentNotValidException으로 들어오니, @RestControllerAdvice에서 받아 필드별 메시지로 돌려주면 프런트가 쓰기 좋습니다.',
    ],
  },
  prq11: {
    wrong: {
      0: '@RestController에서 null을 돌려주면 404가 아니라 200과 빈 본문이 나갑니다.',
      1: '메서드마다 같은 코드가 반복되고 상태 코드도 200으로 나가 실패를 구분하기 어렵습니다.',
      3: 'IllegalArgumentException을 404로 바꿔 주는 기본 설정은 없습니다. 처리하지 않으면 500입니다.',
    },
    fix: `@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(MemberNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(MemberNotFoundException e) {
        return ResponseEntity.status(404)
            .body(new ErrorResponse("MEMBER_NOT_FOUND", "회원을 찾을 수 없어요"));
    }
}`,
    tips: [
      '오류 응답 모양을 하나로 맞추면(코드와 메시지) 프런트가 분기하기 쉽습니다. 스프링 6의 ProblemDetail로 표준 형식을 쓸 수도 있습니다.',
      '메시지에 요청 값이나 예외 클래스 이름 같은 내부 정보를 그대로 넣지 않습니다. 원인은 서버 로그에만 남깁니다.',
    ],
  },
  prq12: {
    wrong: {
      0: '엔티티를 고치면 변경 감지로 DB의 비밀번호까지 지워질 수 있고, 다른 내부 필드는 여전히 나갑니다.',
      1: 'HTTPS는 전송 구간을 암호화할 뿐, 응답 내용은 받는 사람에게 그대로 보입니다.',
      2: '화면에 안 그려도 응답에는 이미 실려 있어 개발자 도구로 누구나 볼 수 있습니다.',
    },
    fix: `public record MemberResponse(Long id, String nickname) {
    public static MemberResponse from(Member m) {
        return new MemberResponse(m.getId(), m.getNickname());
    }
}

@GetMapping("/members/{id}")
public MemberResponse get(@PathVariable Long id) {
    return MemberResponse.from(memberRepository.findById(id).orElseThrow());
}`,
    tips: [
      '양방향 연관관계가 있는 엔티티를 그대로 반환하면 서로를 계속 따라가 JSON 무한 재귀가 나기도 합니다. 응답 DTO는 이것도 함께 막습니다.',
      '엔티티 필드 이름을 바꾸면 API 응답까지 바뀌어 프런트가 깨집니다. DTO를 두면 내부 구조와 API 계약이 분리됩니다.',
    ],
  },
  prq13: {
    wrong: {
      1: '@Cacheable은 반환 타입에 제한이 없습니다. 단건 조회에 가장 흔히 씁니다.',
      2: '키는 직렬화해 저장하므로 Long 키도 문제없습니다.',
      3: '캐시 이름은 자유롭게 정합니다.',
    },
    fix: `// 목록을 다른 빈에서 불러 캐시 프록시를 거치게 한다
@Service
@RequiredArgsConstructor
public class ProductListService {
    private final ProductService productService;

    public List<ProductResponse> list(List<Long> ids) {
        return ids.stream().map(productService::find).toList();
    }
}`,
    tips: [
      'Redis에 담는 값은 직렬화돼야 합니다. 엔티티 대신 DTO를 캐시에 넣고, 유효 기간(TTL)을 정해 오래된 값이 끝없이 남지 않게 합니다.',
      '캐시가 실제로 맞는지는 DB 쿼리 로그로 확인합니다. 두 번째 요청에서 쿼리가 안 나가야 정상입니다.',
    ],
  },
  prq14: {
    wrong: {
      0: '이름을 바꾸면 옛 캐시는 그대로 남고, 다른 곳의 캐시 이름과도 어긋납니다.',
      2: '@Transactional은 캐시를 건너뛰게 하지 않습니다. 캐시에 값이 있으면 메서드 자체가 실행되지 않습니다.',
      3: '변경 감지는 DB만 바꾸고 캐시는 모릅니다.',
    },
    fix: `@CacheEvict(value = "product", key = "#id")
@Transactional
public void changePrice(Long id, int price) {
    productRepository.findById(id).orElseThrow().changePrice(price);
}`,
    tips: [
      '캐시를 지운 직후, 커밋되기 전에 다른 요청이 옛 값을 읽어 다시 캐시에 넣을 수 있습니다. TTL을 짧게 두거나, 커밋 뒤에 지우는 트랜잭션 인식 캐시를 씁니다.',
      '면접 꼬리질문: "캐시와 DB를 어떻게 맞추나?" 지우기(evict)와 갱신(put)의 차이, TTL, 커밋 뒤 처리까지 말하면 좋습니다.',
    ],
  },
  prq15: {
    wrong: {
      0: '파티션보다 많은 컨슈머는 놀게 되고, 순서 문제와는 관계없습니다.',
      1: '다시 만들어도 키 없이 보내는 한 똑같이 섞입니다.',
      3: '보내는 간격을 늘려도 순서는 보장되지 않고 처리량만 떨어집니다.',
    },
    fix: `// 같은 주문은 같은 파티션으로
kafkaTemplate.send("order-events", event.orderId().toString(), event);`,
    tips: [
      '프로듀서가 재시도하다 순서가 뒤바뀌는 경우는 멱등 프로듀서(enable.idempotence)로 막습니다. Kafka 3.0부터 기본으로 켜져 있습니다.',
      '그래도 늦게 도착한 이벤트에 대비해, 컨슈머가 주문 상태 전이(취소된 주문에 결제 완료 금지)를 확인하면 더 안전합니다.',
    ],
  },
};
