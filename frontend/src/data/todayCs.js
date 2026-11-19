export const FACTS = [
  // 운영체제
  { t: 'Deadlock · Coffman 조건', re: /교착|데드락|은행원/i, s: 'mutual exclusion · hold and wait · no preemption · circular wait가 동시에 성립할 때만 발생한다. 예방은 조건 하나를 구조적으로 깨는 것이고, 회피는 Banker\'s algorithm으로 safe state가 유지될 때만 자원을 할당하는 것이다.' },
  { t: 'Context Switch', re: /문맥 교환|PCB|컨텍스트|프로세스.*스레드/i, s: 'PCB에 레지스터 · PC · 스택 포인터를 저장하고 다음 프로세스의 것을 복원한다. 프로세스 전환은 주소 공간이 바뀌어 TLB flush와 캐시 미스가 따르지만, 같은 프로세스의 스레드 전환은 주소 공간을 공유해 그 비용이 없다.' },
  { t: 'Demand Paging · Page Fault', re: /페이지 부재|요구 페이징|페이지 교체|가상 ?메모리/i, s: '페이지 테이블의 valid bit가 0인 페이지를 참조하면 trap이 걸리고, OS가 프레임을 확보해 디스크에서 적재한 뒤 명령을 재실행한다. 프레임이 부족하면 victim을 골라 dirty bit가 켜진 경우에만 write-back한다.' },
  { t: 'TLB', re: /TLB|주소 변환/i, s: '가상 주소 → 물리 주소 변환 결과를 캐싱하는 연관 메모리. EAT = hit ratio × (TLB + 메모리) + miss ratio × (TLB + 페이지 테이블 + 메모리)로 계산하며, 다단계 페이지 테이블의 메모리 접근 비용을 상쇄한다.' },
  { t: 'Thrashing · Working Set', re: /스래싱|워킹 ?셋|작업 집합|가상 ?메모리/i, s: 'multiprogramming degree가 과도해 각 프로세스가 locality를 담을 프레임을 못 받으면 page fault 처리에 시간을 다 쓴다. 최근 Δ 동안 참조한 페이지 집합(working set)이나 PFF로 프레임 할당량을 조절한다.' },
  { t: 'Critical Section 3조건', re: /임계 ?구역|경쟁 조건|상호 배제|동기화/i, s: 'mutual exclusion · progress · bounded waiting. test-and-set이나 compare-and-swap 같은 원자적 하드웨어 명령 위에 spinlock, mutex, semaphore, monitor를 쌓아 올린다.' },
  { t: 'Semaphore vs Mutex', re: /세마포어|뮤텍스|모니터/i, not: /모니터링/, s: 'mutex는 소유권이 있는 binary lock이라 잠근 스레드만 해제한다. counting semaphore는 P(wait) · V(signal)로 가용 자원 수를 세며 소유권이 없어 다른 스레드가 signal할 수 있고, 그래서 실행 순서 제어에도 쓴다.' },
  { t: 'CPU Scheduling', re: /스케줄링|SJF|SRT|라운드 로빈|HRN/i, not: /디스크|LOOK|SCAN|SSTF/, s: 'SJF는 평균 waiting time이 최적이지만 burst 예측이 필요하고 starvation이 생긴다. RR은 time quantum이 크면 FCFS로 수렴하고 작으면 context switch 오버헤드가 지배한다. MLFQ는 aging으로 starvation을 푼다.' },
  { t: 'Process vs Thread', re: /스레드/i, s: '스레드는 code · data · heap · 열린 파일을 공유하고 stack · register · PC만 따로 가진다. 생성과 전환이 싸지만 공유 데이터 때문에 race condition과 동기화 비용을 떠안는다.' },
  { t: 'Interrupt 처리', re: /인터럽트|시스템 콜|시스템 호출/i, s: '현재 명령을 마친 뒤 PC와 PSW를 스택에 저장하고 interrupt vector로 ISR에 분기한다. 사용자 프로그램이 kernel mode로 들어가는 유일한 통로가 trap(system call) · exception · interrupt다.' },
  { t: 'Fragmentation', re: /단편화|세그먼테이션|페이징|메모리 배치/i, not: /MTU|IP/, s: 'paging은 고정 크기 프레임이라 external fragmentation이 없고 마지막 페이지에 internal fragmentation이 남는다. segmentation은 가변 크기라 반대이며, compaction이나 paged segmentation으로 완화한다.' },
  { t: 'Disk Scheduling', re: /디스크 스케줄링|SSTF|SCAN|LOOK/i, s: 'SSTF는 seek time이 짧지만 starvation이 생긴다. SCAN은 양 끝을 왕복하고, C-SCAN은 한 방향만 서비스해 대기 시간 편차를 줄이며, LOOK은 마지막 요청에서 방향을 바꿔 불필요한 이동을 없앤다.' },

  // 데이터베이스
  { t: 'Isolation Level', re: /격리/i, s: 'READ COMMITTED는 dirty read만, REPEATABLE READ는 non-repeatable read까지, SERIALIZABLE은 phantom read까지 막는다. 대부분의 DBMS는 lock 대신 MVCC snapshot으로 읽기와 쓰기가 서로를 막지 않게 구현한다.' },
  { t: 'MVCC', re: /MVCC|격리|동시성 제어|병행 제어/i, s: '갱신할 때 이전 버전을 undo 영역에 남기고, 각 트랜잭션은 자신의 snapshot 시점에 커밋돼 있던 버전만 읽는다. reader가 writer를 block하지 않지만, 오래된 버전을 치우는 purge(vacuum) 비용이 따른다.' },
  { t: 'WAL · Recovery', re: /회복|WAL|체크포인트|REDO|UNDO|로그 기반/i, s: '데이터 페이지보다 로그를 먼저 디스크에 쓰는 write-ahead logging이 durability의 근거다. 장애 후에는 checkpoint 이후 로그로 커밋된 트랜잭션은 REDO, 미완료 트랜잭션은 UNDO한다.' },
  { t: '2PL', re: /2PL|로킹|락킹|잠금|직렬 가능/i, s: 'growing phase에서만 lock을 얻고 shrinking phase에서만 푼다. conflict serializability는 보장하지만 deadlock은 막지 못하고, cascading rollback을 피하려면 커밋까지 lock을 쥐는 strict 2PL을 쓴다.' },
  { t: 'B+Tree Index', re: /B-?\+? ?트리|B-?\+?Tree/i, s: '내부 노드는 key와 포인터만 가져 fan-out이 크고 트리 높이가 낮다. 레코드는 leaf에만 있고 leaf끼리 연결 리스트로 이어져 range scan이 순차 접근으로 끝난다.' },
  { t: 'Composite Index', re: /인덱스/i, s: '선두 컬럼부터 정렬돼 있어 leftmost prefix 조건이 없으면 탐색 범위를 좁히지 못한다. 쿼리에 필요한 컬럼이 모두 인덱스에 있으면 테이블을 읽지 않는 covering index가 된다.' },
  { t: '정규화와 함수 종속', re: /정규화|정규형|함수 종속/i, s: '2NF는 partial dependency, 3NF는 transitive dependency를 제거하고, BCNF는 모든 determinant가 candidate key일 것을 요구한다. 분해는 lossless join과 dependency preservation을 함께 만족해야 한다.' },
  { t: 'Join 알고리즘', re: /조인|JOIN/i, s: 'nested loop는 inner에 인덱스가 있을 때, sort-merge는 양쪽이 조인 키로 정렬돼 있을 때, hash join은 대량 equi-join에서 유리하다. optimizer는 통계 기반 cost로 이 중 하나를 고른다.' },
  { t: 'CAP · BASE', re: /CAP|NoSQL|분산 DB|분산 데이터베이스/i, s: 'network partition 상황에서 consistency와 availability를 동시에 줄 수 없다. NoSQL은 흔히 availability를 택하고 eventual consistency(BASE)로 타협하며, quorum(R + W > N)으로 일관성 강도를 조절한다.' },
  { t: 'Anomaly', re: /이상 현상|갱신 이상|삽입 이상|삭제 이상|정규화/i, s: '정규화되지 않은 릴레이션은 삽입 · 삭제 · 갱신 이상을 일으킨다. 원인은 하나의 릴레이션에 서로 다른 함수 종속이 섞여 생기는 중복(redundancy)이다.' },

  // 네트워크
  { t: 'TCP Congestion Control', re: /혼잡/i, s: 'slow start는 cwnd를 RTT마다 두 배로 키우고, ssthresh를 넘으면 congestion avoidance(AIMD)로 선형 증가한다. 3 duplicate ACK는 fast retransmit · fast recovery로, timeout은 cwnd = 1로 처리한다.' },
  { t: 'TCP Flow Control', re: /흐름 제어|슬라이딩 윈도우|ARQ/i, s: '수신 측이 receive window(rwnd)를 광고하고 송신 측은 min(cwnd, rwnd)만큼만 보낸다. sliding window와 cumulative ACK로 순서 보장과 재전송을 구현한다.' },
  { t: '3-way · 4-way Handshake', re: /핸드셰이크|handshake|3-way|4-way|TCP 연결/i, s: 'SYN으로 양쪽의 ISN을 교환해 연결을 맺고, 종료는 FIN과 ACK가 방향별로 따로 오가는 half-close 구조다. active close 측은 지연 패킷을 흡수하려고 TIME_WAIT(2MSL)에 머문다.' },
  { t: 'TLS 1.3 Handshake', re: /TLS|SSL|HTTPS/i, s: 'ECDHE로 ephemeral key를 교환해 forward secrecy를 얻고, 서버 인증서의 서명으로 신원을 검증한다. 이후 데이터는 대칭키 AEAD(AES-GCM 등)로 암호화하며 handshake는 1-RTT로 끝난다.' },
  { t: 'HTTP/2 · HTTP/3', re: /HTTP/i, s: 'HTTP/2는 한 TCP 연결에서 stream multiplexing과 HPACK 헤더 압축을 하지만 TCP 수준의 head-of-line blocking이 남는다. HTTP/3는 UDP 위의 QUIC으로 stream별 손실 복구를 해 이를 없앤다.' },
  { t: 'Subnetting · CIDR', re: /서브넷|CIDR/i, s: 'prefix 길이가 /n이면 host bit는 32 − n개, 주소는 2^(32−n)개이고 network · broadcast 주소를 빼면 사용 가능한 host 수다. route aggregation은 공통 prefix로 여러 경로를 한 줄로 요약한다.' },
  { t: 'ARP · NAT · DHCP', re: /ARP|NAT|DHCP/i, s: 'ARP는 L3 주소를 L2 MAC으로 풀고, NAT(PAT)는 사설 IP와 포트를 공인 IP의 포트로 변환하며, DHCP는 DORA(Discover · Offer · Request · Ack)로 주소를 임대한다.' },
  { t: 'L4 vs L7 Load Balancing', re: /로드 ?밸런/i, s: 'L4는 IP와 포트만 보고 분산해 빠르고, L7은 HTTP 헤더 · URL · 쿠키를 보고 라우팅해 TLS termination과 sticky session을 처리한다. health check로 장애 노드를 풀에서 뺀다.' },

  // 자료구조 · 알고리즘
  { t: 'Hash Collision', re: /해시|해싱/i, not: /정보보호|암호|해시 함수|솔트|서명|무결성|비밀번호|생일|체인/, s: 'separate chaining은 bucket마다 리스트를 매달고, open addressing은 linear · quadratic probing이나 double hashing으로 빈 slot을 찾는다. load factor가 임계값을 넘으면 rehashing으로 테이블을 키운다.' },
  { t: 'Balanced BST', re: /AVL|레드|Red|이진 ?탐색 ?트리|균형 트리|BST/i, s: 'AVL은 balance factor를 ±1로 엄격히 유지해 탐색이 빠르고, Red-Black tree는 느슨한 균형으로 삽입 · 삭제 시 rotation이 적다. 둘 다 O(log n)을 보장한다.' },
  { t: 'Sorting', re: /정렬/i, not: /위상/, s: 'quick sort는 평균 O(n log n) · 최악 O(n²)에 in-place지만 unstable, merge sort는 항상 O(n log n)에 stable이지만 O(n) 추가 공간, heap sort는 O(n log n)에 in-place지만 unstable이다. 비교 정렬의 하한은 Ω(n log n).' },
  { t: 'Shortest Path', re: /최단 경로|다익스트라|벨만|플로이드/i, s: 'Dijkstra는 음수 가중치가 없을 때 priority queue로 O(E log V), Bellman-Ford는 음수 간선과 음수 cycle 검출까지 O(VE), Floyd-Warshall은 all-pairs를 DP로 O(V³)에 구한다.' },
  { t: 'MST', re: /신장 트리|MST|프림|크루스칼|Prim|Kruskal/i, more: /그래프/, s: 'Kruskal은 간선을 정렬해 union-find로 cycle을 피하며 고르고(O(E log E)), Prim은 정점 집합을 넓혀 가며 최소 간선을 고른다(O(E log V)). 둘 다 cut property에 근거한 greedy다.' },
  { t: 'Dynamic Programming', re: /동적 계획|분할 정복|탐욕|설계 기법/i, s: 'optimal substructure와 overlapping subproblems가 있을 때 부분 문제의 해를 memoization(top-down)이나 tabulation(bottom-up)으로 저장해 재계산을 없앤다.' },

  // 보안
  { t: '대칭키 · 공개키 · 하이브리드', re: /대칭키|공개키|RSA|AES|DES|암호 알고리즘|암호 방식|^정보보호·암호$/i, s: '대칭키(AES)는 빠르지만 key distribution이 문제이고, 공개키(RSA · ECC)는 느리지만 키 교환과 서명이 된다. 그래서 공개키로 세션 키를 합의하고 본문은 대칭키로 암호화한다.' },
  { t: 'Digital Signature · PKI', re: /전자서명|PKI|인증서/i, s: '메시지 hash를 개인키로 서명하고 공개키로 검증해 integrity · authentication · non-repudiation을 얻는다. 공개키의 주인은 CA가 서명한 X.509 인증서의 chain of trust로 보증한다.' },
  { t: 'Password 저장', re: /솔트|비밀번호|패스워드|해시 함수/i, s: '사용자별 salt를 붙여 rainbow table을 무력화하고, bcrypt · scrypt · Argon2 같은 key stretching 함수로 brute force 비용을 높인다. 빠른 범용 hash(SHA-256) 한 번은 부적합하다.' },
  { t: 'Injection · XSS · CSRF', re: /인젝션|XSS|CSRF|SQL 삽입/i, s: 'SQL injection은 prepared statement로, XSS는 출력 escaping과 CSP로, CSRF는 SameSite 쿠키와 CSRF token으로 막는다. 셋 다 신뢰할 수 없는 입력이 실행 문맥에 들어가는 문제다.' },

  // 컴퓨터 구조 · 소프트웨어 공학
  { t: 'Cache Mapping', re: /캐시/i, s: 'direct mapped는 단순하지만 conflict miss가 많고, fully associative는 miss가 적지만 비교 회로가 비싸다. n-way set associative가 절충안이며, locality가 캐시 효과의 전제다.' },
  { t: 'Pipeline Hazard', re: /파이프라인|해저드/i, s: 'data hazard는 forwarding과 stall로, control hazard는 branch prediction과 delayed branch로, structural hazard는 자원 중복으로 푼다. 이상적인 k단계 파이프라인의 speedup 상한은 k다.' },
  { t: 'RAID', re: /RAID/i, s: 'RAID 0은 striping으로 성능만, 1은 mirroring, 5는 distributed parity로 디스크 1개 장애를, 6은 dual parity로 2개 장애를 견딘다. RAID 10은 mirror를 stripe해 rebuild가 빠르다.' },
  { t: 'Coupling · Cohesion', re: /결합도|응집도/i, s: '모듈 간 결합도는 data coupling이 가장 낮고 content coupling이 가장 높으며, 모듈 내 응집도는 functional이 가장 높고 coincidental이 가장 낮다. low coupling · high cohesion이 설계 목표다.' },
  { t: 'Test Coverage', re: /테스트|커버리지|경계값|동치/i, s: 'statement ⊂ branch(decision) ⊂ condition/decision ⊂ MC/DC 순으로 강해진다. 블랙박스 기법인 equivalence partitioning과 boundary value analysis는 내부 구조 없이 입력 영역으로 케이스를 줄인다.' },
  { t: 'SOLID', re: /SOLID|객체 ?지향|디자인 패턴/i, s: 'SRP · OCP · LSP · ISP · DIP. 핵심은 구체 클래스가 아니라 abstraction에 의존하게 해 변경의 파급을 막는 것이고, DI 컨테이너와 strategy · template method 패턴이 그 구현 수단이다.' },
];


const DAY_MS = 86400000;
export const QUIZ_SIZE = 5;
export function koreanDay(now = Date.now()) { return Math.floor((Number(now) + 9 * 3600000) / DAY_MS); }
export function dayLabel(day) { return new Date(day * DAY_MS).toISOString().slice(0, 10); }
function shuffled(items, seed) {
  const result = [...items];
  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function factForDay(day) {
  const order = shuffled(FACTS, Math.floor(day / FACTS.length) + 20261005);
  return order[((day % FACTS.length) + FACTS.length) % FACTS.length];
}
export function quizForDay(fact, day, questions) {
  const seen = new Set();
  const pick = re => questions.filter(q => {
    const topic = q.topic.split(' · ')[0];
    const fingerprint = JSON.stringify([q.q, q.code || '', q.o]);
    if (!re.test(topic) || fact.not?.test(topic) || seen.has(fingerprint)) return false;
    seen.add(fingerprint); return true;
  }).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const seed = [...fact.t].reduce((value, char) => Math.imul(value, 31) + char.charCodeAt(0) | 0, day);
  const quiz = shuffled(pick(fact.re), seed).slice(0, QUIZ_SIZE);
  // 딱 맞는 문제가 5개보다 적은 주제는 같은 단원(fact.more) 문제로 나머지를 채운다
  if (quiz.length < QUIZ_SIZE && fact.more) quiz.push(...shuffled(pick(fact.more), seed).slice(0, QUIZ_SIZE - quiz.length));
  return quiz;
}
