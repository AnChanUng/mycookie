import { CU_SECTIONS, CU_QUESTIONS, CU_SETS } from './cuQuestions';
import { SSAFY_DB_QUESTIONS } from './ssafyDbQuestions';
import { PEARL_QUESTIONS, PEARL_SECTIONS } from './pearlQuestions';
// HF(한국주택금융공사) IT직무 전공필기 대비 자체 제작 문제 60문항 (5지선다)
// 2021~2026 응시 후기에서 반복 언급된 주제를 기준으로 구성. 실제 시험 문항의 복제가 아님.
import { KORAIL_SECTIONS, EX_SECTIONS, KWATER_SECTIONS, KDN_SECTIONS, KICOX_SECTIONS } from './splitSections';
import { KORAIL_PRED_QUESTIONS } from './korailPredictedQuestions';
import { EX_PRED_QUESTIONS } from './exPredictedQuestions';
import { KWATER_PRED_QUESTIONS } from './kwaterPredictedQuestions';
import { KDN_PRED_QUESTIONS } from './kdnPredictedQuestions';
import { KICOX_PRED_QUESTIONS } from './kicoxPredictedQuestions';
import { KFTC_SECTIONS, KFTC_QUESTIONS } from './kftcQuestions';
import { KFTC_SET2_QUESTIONS } from './kftcSet2Questions';
import { FSEC_SECTIONS, FSEC_QUESTIONS } from './fsecQuestions';
import { FSS_SECTIONS, FSS_QUESTIONS } from './fssQuestions';
import { KRX_SECTIONS, KRX_QUESTIONS } from './krxQuestions';
import { KIBO_SECTIONS, KIBO_QUESTIONS } from './kiboQuestions';
import { KSURE_SECTIONS, KSURE_QUESTIONS } from './ksureQuestions';
import { HUG_SECTIONS, HUG_QUESTIONS } from './hugQuestions';
import { KSFC_SECTIONS, KSFC_QUESTIONS } from './ksfcQuestions';
import { KCIS_SECTIONS, KCIS_QUESTIONS } from './kcisQuestions';
import { KINFA_SECTIONS, KINFA_QUESTIONS } from './kinfaQuestions';
import { SPRING_SECTIONS, SPRING_QUESTIONS } from './springQuestions';
import { SPRING_PRACTICE_SECTIONS, SPRING_PRACTICE_QUESTIONS } from './springPracticeQuestions';
import { BOK_SECTIONS, BOK_QUESTIONS } from './bokQuestions';
import { KSD_SECTIONS, KSD_QUESTIONS } from './ksdQuestions';
import { KDIC_SECTIONS, KDIC_QUESTIONS } from './kdicQuestions';
import { KAMCO_SECTIONS, KAMCO_QUESTIONS } from './kamcoQuestions';
import { KODIT_SECTIONS, KODIT_QUESTIONS } from './koditQuestions';
import { KDB_SECTIONS, KDB_QUESTIONS } from './kdbQuestions';
import { KEXIM_SECTIONS, KEXIM_QUESTIONS } from './keximQuestions';
import { KEPCO_SECTIONS, KEPCO_QUESTIONS } from './kepcoQuestions';
import { NHIS_SECTIONS, NHIS_QUESTIONS } from './nhisQuestions';
import { LH_SECTIONS, LH_QUESTIONS } from './lhQuestions';
import { NHFIRE_SECTIONS, NHFIRE_QUESTIONS, NHFIRE_SETS } from './nhfireQuestions';
import { IBKDT_SECTIONS, IBKDT_QUESTIONS, IBKDT_SETS } from './ibkDigitalQuestions';
import { IBK_BIGDATA } from './ibkBigdata';
import { IBKIT_SECTIONS, IBKIT_QUESTIONS, IBKIT_SETS } from './ibkItQuestions';
import { HF_CPP_QUESTIONS } from './hfCppQuestions';
import { NCS } from './ncsQuestions';
import { AI_SECTIONS, AI_QUESTIONS } from './aiQuestions';
export { HF_CPP_QUESTIONS, CPP_GROUPS } from './hfCppQuestions';
export { NCS };

export const SECTIONS = {
  cs:  {name:'전산학일반', short:'전산', sub:'OS · 컴퓨터구조 · 정보보호 · SW공학 · 자료구조', count:36},
  dbn: {name:'데이터베이스·네트워크', short:'DB/NW', sub:'SQL · 정규화 · 트랜잭션 · OSI · TCP/IP · 라우팅', count:12},
  pl:  {name:'프로그래밍', short:'PL', sub:'C++ · Java · Python 실행결과 및 개념', count:12},
  // 모의고사(60문제)에는 포함되지 않는 별도 집중 문제집
  cpp: {name:'C++ 집중', short:'C++', sub:'C++ 코드 실행 결과 · 개념 집중 대비', count:0, extra:true},
};
export const HF_QUESTIONS = [
/* ===== 전산학일반 36 ===== */
{id:'cs01',sec:'cs',topic:'OS·프로세스',q:'동일한 프로세스에 속한 스레드들이 서로 공유하지 않고 각자 독립적으로 갖는 것은?',o:['코드 영역','데이터(전역 변수) 영역','힙 영역','스택 영역','열린 파일 디스크립터 목록'],a:3,e:'스레드는 코드·데이터·힙·열린 파일을 프로세스 단위로 공유하지만, 함수 호출 정보와 지역 변수를 담는 스택과 레지스터(PC 포함)는 스레드마다 독립적으로 가진다.'},
{id:'cs02',sec:'cs',topic:'OS·교착상태',q:'교착상태(Deadlock)가 발생하기 위한 4가지 필요조건에 해당하지 않는 것은?',o:['상호 배제(Mutual Exclusion)','점유와 대기(Hold and Wait)','비선점(No Preemption)','환형 대기(Circular Wait)','선점(Preemption)'],a:4,e:'교착상태의 4가지 필요조건은 상호 배제, 점유와 대기, 비선점, 환형 대기이다. "선점"은 오히려 비선점 조건을 부정하여 교착상태를 예방하는 방법에 해당한다.'},
{id:'cs03',sec:'cs',topic:'OS·교착상태',q:'교착상태 해결 기법 중 "회피(Avoidance)"에 해당하는 것은?',o:['은행원 알고리즘(Banker\'s Algorithm)','자원을 강제로 선점하여 다른 프로세스에 할당','교착상태에 빠진 프로세스를 강제 종료','자원 할당 그래프에서 사이클을 탐지','필요한 자원을 실행 전에 모두 한꺼번에 요청'],a:0,e:'은행원 알고리즘은 자원 요청 시 시스템이 안전 상태(safe state)를 유지하는지 검사하여 불안전 상태로 갈 요청을 거절하는 대표적인 회피 기법이다. ②③은 회복, ④는 탐지, ⑤는 예방(점유와 대기 부정)에 해당한다.'},
{id:'cs04',sec:'cs',topic:'OS·CPU 스케줄링',q:'다음 프로세스들을 비선점 SJF(Shortest Job First)로 스케줄링할 때 평균 대기 시간은?\n\n프로세스 / 도착 시간 / 실행 시간\nP1 / 0 / 6\nP2 / 1 / 3\nP3 / 2 / 8\nP4 / 3 / 2',o:['4.25','4.75','5.00','5.25','6.00'],a:1,e:'시각 0에는 P1만 있으므로 P1(0~6) 실행. 6 시점 대기열 중 최단인 P4(6~8), 이후 P2(8~11), P3(11~19). 대기 시간 = P1 0, P4 3, P2 7, P3 9 → 합 19 / 4 = 4.75.'},
{id:'cs05',sec:'cs',topic:'OS·페이지 교체',q:'페이지 프레임이 3개이고 초기 상태가 비어 있을 때, 참조열 1 2 3 2 1 4 5 1 을 LRU 방식으로 처리하면 페이지 부재(page fault)는 몇 번 발생하는가?',o:['4','5','6','7','8'],a:1,e:'1(F) 2(F) 3(F) → 2(H) 1(H) → 4(F, 가장 오래된 3 교체) → 5(F, 가장 오래된 2 교체) → 1(H). 부재는 총 5회.'},
{id:'cs06',sec:'cs',topic:'OS·메모리 관리',q:'메모리를 고정된 크기의 블록으로 나누어 관리하므로 외부 단편화는 없지만 내부 단편화가 발생할 수 있는 기법은?',o:['세그먼테이션','페이징','오버레이','스와핑','버디 시스템'],a:1,e:'페이징은 프로세스를 동일 크기의 페이지로 나누므로 외부 단편화가 없고, 마지막 페이지가 다 채워지지 않아 내부 단편화가 발생한다. 세그먼테이션은 가변 크기라 외부 단편화가 발생한다.'},
{id:'cs07',sec:'cs',topic:'OS·가상 메모리',q:'스래싱(Thrashing)에 대한 설명으로 옳은 것은?',o:['CPU 이용률이 높아 프로세스를 더 추가하면 처리량이 계속 증가하는 현상','페이지 부재가 빈번하게 발생하여 실제 연산보다 페이지 교체에 더 많은 시간을 소비하는 현상','디스크 헤드가 특정 트랙에 집중되어 응답이 지연되는 현상','여러 스레드가 하나의 캐시 라인을 공유하여 성능이 저하되는 현상','인터럽트가 과도하게 발생하여 커널 모드 전환이 잦아지는 현상'],a:1,e:'스래싱은 다중 프로그래밍 정도가 지나치게 높아져 각 프로세스가 충분한 프레임을 받지 못하고 페이지 부재가 급증, CPU 이용률이 급락하는 현상이다. 워킹셋(Working Set)이나 PFF로 예방한다.'},
{id:'cs08',sec:'cs',topic:'OS·디스크 스케줄링',q:'디스크 헤드가 현재 53번 트랙에 있고 대기 큐에 98, 183, 37, 122, 14, 124, 65, 67 순으로 요청이 들어와 있다. FCFS로 처리할 때 헤드의 총 이동 거리는?',o:['236','322','560','640','708'],a:3,e:'53→98(45) →183(85) →37(146) →122(85) →14(108) →124(110) →65(59) →67(2) = 640. 같은 큐를 SSTF로 처리하면 236이다.'},
{id:'cs09',sec:'cs',topic:'컴퓨터구조·RAID',q:'두 개의 독립적인 패리티 정보를 서로 다른 디스크에 분산 저장하여, 디스크 2개가 동시에 고장 나도 데이터를 복구할 수 있는 RAID 레벨은?',o:['RAID 0','RAID 1','RAID 5','RAID 6','RAID 10'],a:3,e:'RAID 6은 이중 분산 패리티(P+Q)를 사용하여 디스크 2개 고장까지 허용하며 최소 4개 디스크가 필요하다. RAID 5는 단일 패리티로 1개 고장까지만 허용한다.'},
{id:'cs10',sec:'cs',topic:'컴퓨터구조·RAID',q:'1TB 디스크 5개로 RAID 5를 구성했을 때 실제 사용 가능한 저장 용량은?',o:['2TB','2.5TB','3TB','4TB','5TB'],a:3,e:'RAID 5는 디스크 1개 분량이 패리티로 사용되므로 (n−1)×용량 = 4×1TB = 4TB. RAID 6이었다면 (n−2) = 3TB.'},
{id:'cs11',sec:'cs',topic:'컴퓨터구조·캐시',q:'캐시 적중률이 90%, 캐시 접근 시간이 10ns, 주기억장치 접근 시간이 100ns이다. 평균 메모리 접근 시간을 h·Tc + (1−h)·Tm 으로 계산하면?',o:['19ns','20ns','28ns','91ns','100ns'],a:0,e:'0.9×10 + 0.1×100 = 9 + 10 = 19ns. (미스 시 캐시 접근 시간까지 포함하는 h·Tc + (1−h)(Tc+Tm) 방식이면 20ns가 되므로 문제에 제시된 식을 반드시 확인해야 한다.)'},
{id:'cs12',sec:'cs',topic:'컴퓨터구조·플래시 메모리',q:'NAND 플래시 메모리에 대한 설명으로 옳지 않은 것은?',o:['전원이 꺼져도 데이터가 유지되는 비휘발성 메모리이다.','쓰기 전에 블록 단위의 삭제(erase)가 선행되어야 한다.','삭제 횟수에 한계가 있어 웨어 레벨링(wear leveling) 기법이 필요하다.','읽기·쓰기는 페이지 단위, 삭제는 블록 단위로 이루어진다.','바이트 단위로 기존 데이터를 자유롭게 덮어쓸 수 있다.'],a:4,e:'플래시 메모리는 셀을 1→0으로만 변경할 수 있어 덮어쓰기(in-place update)가 불가능하다. 반드시 블록 단위로 삭제한 뒤 페이지 단위로 써야 하며, 이 때문에 FTL과 웨어 레벨링이 필요하다.'},
{id:'cs13',sec:'cs',topic:'컴퓨터구조·기억장치 계층',q:'기억장치를 접근 속도가 빠른 순서대로 옳게 나열한 것은?',o:['레지스터 → 주기억장치 → 캐시 → SSD → HDD','캐시 → 레지스터 → 주기억장치 → SSD → HDD','레지스터 → 캐시 → 주기억장치 → SSD → HDD','레지스터 → 캐시 → SSD → 주기억장치 → HDD','캐시 → 주기억장치 → 레지스터 → HDD → SSD'],a:2,e:'계층 구조 상위일수록 빠르고 비싸며 용량이 작다: 레지스터 > 캐시(SRAM) > 주기억장치(DRAM) > SSD(플래시) > HDD.'},
{id:'cs14',sec:'cs',topic:'컴퓨터구조·파이프라인',q:'분기(branch) 명령어로 인해 다음에 실행할 명령어의 주소가 확정되지 않아 발생하는 파이프라인 해저드는?',o:['구조적 해저드','데이터 해저드','제어 해저드','메모리 해저드','캐시 해저드'],a:2,e:'제어 해저드(Control Hazard)는 분기 명령으로 인해 발생하며 분기 예측(branch prediction), 지연 분기 등으로 완화한다. 구조적 해저드는 자원 충돌, 데이터 해저드는 명령어 간 데이터 의존성으로 발생한다.'},
{id:'cs15',sec:'cs',topic:'컴퓨터구조·수 표현',q:'십진수 −37을 8비트 2의 보수로 표현한 것은?',o:['11011011','11011010','10100101','11011100','00100101'],a:0,e:'37 = 00100101 → 1의 보수 11011010 → +1 = 11011011. ②는 1의 보수, ③은 부호-크기 표현이다.'},
{id:'cs16',sec:'cs',topic:'정보보호·암호',q:'다음 중 대칭키 암호 알고리즘은?',o:['RSA','ECC','AES','ElGamal','Diffie-Hellman'],a:2,e:'AES는 128비트 블록, 128/192/256비트 키를 사용하는 대칭키 블록 암호이다. RSA·ECC·ElGamal은 공개키 암호, Diffie-Hellman은 키 교환 알고리즘이다. 대칭키 계열: DES, 3DES, AES, SEED, ARIA, LEA 등.'},
{id:'cs17',sec:'cs',topic:'정보보호·암호',q:'10명의 사용자가 서로 1:1로 비밀 통신을 하려고 한다. 대칭키 암호를 사용할 때 필요한 키의 총 개수는?',o:['10','20','45','90','100'],a:2,e:'대칭키는 두 사람마다 하나의 키가 필요하므로 n(n−1)/2 = 10×9/2 = 45개. 공개키 암호를 쓰면 2n = 20개(각자 공개키·개인키 한 쌍)로 충분하다.'},
{id:'cs18',sec:'cs',topic:'정보보호·해시',q:'암호학적 해시 함수의 특성으로 옳지 않은 것은?',o:['입력 길이에 관계없이 고정 길이의 출력을 낸다.','해시값으로부터 원래 입력을 계산하는 것이 계산적으로 불가능해야 한다(일방향성).','동일한 해시값을 갖는 서로 다른 두 입력을 찾기 어려워야 한다(충돌 저항성).','해시값을 복호화 키로 복원하여 원문을 얻을 수 있다.','입력이 조금만 바뀌어도 출력이 크게 달라진다.'],a:3,e:'해시 함수는 암호화가 아니므로 복호화 키가 존재하지 않으며 원문 복원이 불가능하다. SHA-256, SHA-3 등이 대표적이며, MD5와 SHA-1은 충돌 저항성이 깨져 사용을 권장하지 않는다.'},
{id:'cs19',sec:'cs',topic:'정보보호·웹 취약점',q:'공격자가 사용자의 로그인된 세션(인증 상태)을 이용하여, 사용자 의도와 무관한 요청(송금, 비밀번호 변경 등)을 서버로 전송하게 만드는 공격은?',o:['XSS (Cross-Site Scripting)','CSRF (Cross-Site Request Forgery)','SQL Injection','세션 하이재킹','디렉터리 트래버설'],a:1,e:'CSRF는 서버가 "요청이 정말 사용자가 의도한 것인가"를 검증하지 못하는 점을 악용한다. 대응: CSRF 토큰, SameSite 쿠키, Referer 검증. XSS는 반대로 악성 스크립트를 사용자의 브라우저에서 실행시키는 공격이다.'},
{id:'cs20',sec:'cs',topic:'정보보호·접근통제',q:'주체와 객체에 보안 등급(레이블)을 부여하고 시스템(관리자)이 정한 정책에 따라 접근을 통제하며, 벨-라파둘라(Bell-LaPadula) 모델이 기반하는 접근통제 방식은?',o:['DAC (임의적 접근통제)','MAC (강제적 접근통제)','RBAC (역할 기반 접근통제)','ABAC (속성 기반 접근통제)','ACL (접근통제 목록)'],a:1,e:'MAC은 보안 등급 기반으로 시스템이 강제하는 통제이며 군사·정부 시스템에 적합하다. DAC은 객체 소유자가 재량으로 권한을 부여(ACL 등), RBAC은 역할에 권한을 묶어 부여한다. 벨-라파둘라는 기밀성, 비바(Biba)는 무결성 모델이다.'},
{id:'cs21',sec:'cs',topic:'정보보호·전자서명',q:'전자서명(Digital Signature)이 직접 제공하지 않는 보안 서비스는?',o:['무결성','송신자 인증','부인 방지','기밀성','메시지 위·변조 탐지'],a:3,e:'전자서명은 송신자의 개인키로 해시값에 서명하고 수신자가 공개키로 검증한다. 무결성·인증·부인방지를 제공하지만 메시지 자체를 암호화하지는 않으므로 기밀성은 별도의 암호화가 필요하다.'},
{id:'cs22',sec:'cs',topic:'정보보호·TLS',q:'TLS(SSL)에 대한 설명으로 옳지 않은 것은?',o:['핸드셰이크 과정에서 서버의 인증서를 검증한다.','핸드셰이크에서 공개키(또는 키 교환) 방식으로 세션키를 협상한다.','실제 응용 데이터 전송은 협상된 세션키를 이용한 대칭키 암호로 보호된다.','전송 계층과 응용 계층 사이에서 동작하며 HTTPS의 기반이 된다.','실제 응용 데이터 전송은 서버의 공개키로 매 패킷을 암호화하여 이루어진다.'],a:4,e:'공개키 암호는 느리므로 핸드셰이크에서 세션키만 안전하게 교환하고, 이후 대량 데이터는 AES 등 대칭키로 암호화한다. 이를 하이브리드 암호 방식이라 한다.'},
{id:'cs23',sec:'cs',topic:'정보보호·인증',q:'인증 요소(authentication factor) 분류상, OTP 하드웨어 토큰이나 스마트카드로 본인을 증명하는 방식은 어느 것에 해당하는가?',o:['지식 기반(Something you know)','위치 기반(Somewhere you are)','생체 기반(Something you are)','행위 기반(Something you do)','소유 기반(Something you have)'],a:4,e:'OTP 토큰, 스마트카드, 휴대폰은 소유 기반이다. 비밀번호·PIN은 지식 기반, 지문·홍채는 생체 기반. 서로 다른 두 종류 이상을 조합하면 다중 인증(MFA)이다.'},
{id:'cs24',sec:'cs',topic:'정보보호·블록암호 운영 모드',q:'블록 암호 운영 모드 중, 동일한 평문 블록이 항상 동일한 암호문 블록으로 변환되어 평문의 패턴이 노출될 수 있는 모드는?',o:['ECB','CBC','CFB','OFB','CTR'],a:0,e:'ECB(Electronic Codebook)는 각 블록을 독립적으로 암호화하여 패턴이 그대로 드러난다. CBC는 이전 암호문 블록과 XOR, CTR은 카운터 값을 암호화하여 이 문제를 해결하며, CTR/OFB는 병렬 처리와 스트림 암호처럼 동작하는 장점이 있다.'},
{id:'cs25',sec:'cs',topic:'SW공학·디자인 패턴',q:'호환되지 않는 기존 클래스의 인터페이스를 클라이언트가 기대하는 다른 인터페이스로 변환하여 함께 동작하게 하는 디자인 패턴은?',o:['어댑터(Adapter)','데코레이터(Decorator)','프록시(Proxy)','옵저버(Observer)','스트래티지(Strategy)'],a:0,e:'어댑터는 구조 패턴으로 인터페이스 불일치를 해소한다. 데코레이터는 기능을 동적으로 추가, 프록시는 접근 제어·지연 로딩, 옵저버는 상태 변화 통지, 스트래티지는 알고리즘 교체를 목적으로 한다.'},
{id:'cs26',sec:'cs',topic:'SW공학·디자인 패턴',q:'GoF 디자인 패턴 중 행위(Behavioral) 패턴에 해당하지 않는 것은?',o:['옵저버(Observer)','스트래티지(Strategy)','커맨드(Command)','상태(State)','브리지(Bridge)'],a:4,e:'브리지는 구현과 추상을 분리하는 구조(Structural) 패턴이다. 생성: 싱글톤·팩토리 메서드·추상 팩토리·빌더·프로토타입 / 구조: 어댑터·브리지·컴포지트·데코레이터·퍼사드·플라이웨이트·프록시 / 행위: 나머지(옵저버, 스트래티지, 커맨드, 상태, 템플릿 메서드, 이터레이터 등).'},
{id:'cs27',sec:'cs',topic:'SW공학·복잡도',q:'어떤 프로그램의 제어 흐름 그래프에서 노드가 9개, 간선이 11개이다. 이 프로그램의 사이클로매틱 복잡도(McCabe)는?',o:['2','3','4','5','6'],a:2,e:'V(G) = E − N + 2 = 11 − 9 + 2 = 4. 또는 결정(분기) 노드 수 + 1, 또는 그래프의 독립 영역 수로도 계산할 수 있다. 복잡도가 10을 넘으면 리팩토링을 권장한다.'},
{id:'cs28',sec:'cs',topic:'SW공학·모듈화',q:'모듈 간 결합도(Coupling) 중 가장 바람직한(가장 낮은) 것은?',o:['자료 결합도(Data Coupling)','스탬프 결합도(Stamp Coupling)','제어 결합도(Control Coupling)','공통 결합도(Common Coupling)','내용 결합도(Content Coupling)'],a:0,e:'결합도 낮은 순: 자료 < 스탬프 < 제어 < 외부 < 공통 < 내용. 자료 결합도는 단순 매개변수만 주고받는다. 응집도는 높을수록 좋으며 기능적 응집도가 가장 높다.'},
{id:'cs29',sec:'cs',topic:'SW공학·테스트',q:'블랙박스 테스트 기법에 해당하지 않는 것은?',o:['동등 분할(Equivalence Partitioning)','경계값 분석(Boundary Value Analysis)','원인-효과 그래프(Cause-Effect Graph)','결정 테이블 테스트','기초 경로 검사(Basis Path Testing)'],a:4,e:'기초 경로 검사는 사이클로매틱 복잡도를 이용해 독립 경로를 모두 실행하는 화이트박스 기법이다. 화이트박스: 문장/분기/조건 커버리지, 루프 검사, 데이터 흐름 검사.'},
{id:'cs30',sec:'cs',topic:'SW공학·UML',q:'UML 다이어그램 중 구조(정적) 다이어그램이 아닌 것은?',o:['클래스 다이어그램','객체 다이어그램','컴포넌트 다이어그램','배치(Deployment) 다이어그램','시퀀스 다이어그램'],a:4,e:'시퀀스 다이어그램은 객체 간 메시지 교환을 시간 순서로 표현하는 행위(동적) 다이어그램이다. 행위 다이어그램: 유스케이스, 활동, 상태, 시퀀스, 커뮤니케이션, 타이밍 등.'},
{id:'cs31',sec:'cs',topic:'자료구조·정렬',q:'최악의 경우에도 시간 복잡도 O(n log n)을 보장하는 정렬 알고리즘은?',o:['퀵 정렬','삽입 정렬','힙 정렬','버블 정렬','선택 정렬'],a:2,e:'힙 정렬과 병합 정렬은 최악에도 O(n log n)이다. 퀵 정렬은 평균 O(n log n)이지만 피벗 선택이 나쁘면 최악 O(n²). 삽입·버블·선택은 O(n²).'},
{id:'cs32',sec:'cs',topic:'자료구조·트리 순회',q:'루트 A의 왼쪽 자식이 B, 오른쪽 자식이 C이고, B의 자식은 왼쪽 D·오른쪽 E, C의 자식은 왼쪽 F뿐인 이진 트리를 후위 순회(Postorder)한 결과는?',o:['A B D E C F','D B E A F C','D E B F C A','A B C D E F','D E B A F C'],a:2,e:'후위 순회는 왼쪽 → 오른쪽 → 루트. B의 서브트리: D E B, C의 서브트리: F C, 마지막에 A → D E B F C A. 참고로 중위 순회는 D B E A F C, 전위 순회는 A B D E C F.'},
{id:'cs33',sec:'cs',topic:'자료구조·힙',q:'배열로 표현된 최대 힙 [50, 30, 40, 10, 20]에 60을 삽입한 후의 배열 상태는?',o:['[60, 50, 40, 10, 20, 30]','[50, 60, 40, 10, 20, 30]','[50, 30, 60, 10, 20, 40]','[60, 50, 30, 10, 20, 40]','[60, 30, 50, 10, 20, 40]'],a:4,e:'60을 끝(인덱스 5)에 넣으면 부모는 인덱스 2(40). 60>40 교환 → [50,30,60,10,20,40]. 부모 인덱스 0(50)과 비교, 60>50 교환 → [60,30,50,10,20,40].'},
{id:'cs34',sec:'cs',topic:'자료구조·해시',q:'해시 충돌 해결 기법 중 개방 주소법(Open Addressing)에 해당하지 않는 것은?',o:['선형 조사(Linear Probing)','이차 조사(Quadratic Probing)','이중 해싱(Double Hashing)','체이닝(Separate Chaining)','무작위 조사(Random Probing)'],a:3,e:'체이닝은 같은 버킷의 원소를 연결 리스트로 묶는 폐쇄 주소법(분리 연결법)이다. 개방 주소법은 테이블 내 다른 빈 슬롯을 탐사하며, 선형 조사는 1차 군집(primary clustering) 문제가 있다.'},
{id:'cs35',sec:'cs',topic:'알고리즘·최단 경로',q:'단일 출발점 최단 경로 알고리즘 중 음의 가중치 간선이 있는 그래프에서도 사용할 수 있는 것은?',o:['다익스트라(Dijkstra)','프림(Prim)','벨만-포드(Bellman-Ford)','크루스칼(Kruskal)','A* 알고리즘'],a:2,e:'벨만-포드는 O(VE)로 음의 간선을 허용하고 음의 사이클도 탐지한다. 다익스트라는 음의 간선이 있으면 오답을 낼 수 있다. 프림·크루스칼은 최소 신장 트리 알고리즘이다.'},
{id:'cs36',sec:'cs',topic:'자료구조·스택',q:'중위 표기식 A + B * C − D 를 후위 표기식으로 변환한 결과는?',o:['A B C * + D −','A B + C * D −','A B C + * D −','A B C * D − +','+ A * B C − D'],a:0,e:'연산자 우선순위: * 가 +, − 보다 높고 +, − 는 같은 순위(좌결합). A + (B*C) − D → (A + BC*) − D → ABC*+ − D → ABC*+D−. ⑤는 연산자가 피연산자 앞에 섞여 있어 올바른 후위 표기식이 아니다.'},
/* ===== 데이터베이스·네트워크 12 ===== */
{id:'db01',sec:'dbn',topic:'DB·JOIN',q:'테이블 A의 id 값이 {1, 2, 3}이고 테이블 B의 a_id 값이 {1, 1, 4}일 때, 다음 SQL의 결과 행 수는?',code:'SELECT *\nFROM A LEFT OUTER JOIN B\n  ON A.id = B.a_id;',o:['2','3','4','5','6'],a:2,e:'LEFT OUTER JOIN은 왼쪽(A) 테이블의 모든 행을 유지한다. id=1은 B의 두 행과 매칭(2행), id=2, id=3은 매칭 없이 NULL로 1행씩 → 총 4행. INNER JOIN이면 2행, FULL OUTER JOIN이면 B의 4까지 포함해 5행.'},
{id:'db02',sec:'dbn',topic:'DB·커서',q:'SQL 커서(Cursor)의 사용 순서로 옳은 것은?',o:['OPEN → DECLARE → FETCH → CLOSE','DECLARE → FETCH → OPEN → CLOSE','DECLARE → OPEN → FETCH → CLOSE','OPEN → FETCH → DECLARE → CLOSE','FETCH → DECLARE → OPEN → CLOSE'],a:2,e:'커서는 질의 결과 집합을 한 행씩 처리하기 위한 포인터다. DECLARE로 선언, OPEN으로 질의 실행 및 결과 집합 생성, FETCH로 한 행씩 읽기, CLOSE로 자원 해제한다.'},
{id:'db03',sec:'dbn',topic:'DB·정규화',q:'기본키의 일부에만 종속되는 부분 함수적 종속(Partial Functional Dependency)을 제거하여 얻는 정규형은?',o:['제2정규형(2NF)','제1정규형(1NF)','제3정규형(3NF)','BCNF','제4정규형(4NF)'],a:0,e:'1NF: 도메인이 원자값 / 2NF: 부분 함수 종속 제거 / 3NF: 이행 함수 종속 제거 / BCNF: 모든 결정자가 후보키 / 4NF: 다치 종속 제거 / 5NF: 조인 종속 제거. 암기: "도부이결다조".'},
{id:'db04',sec:'dbn',topic:'DB·트랜잭션',q:'트랜잭션의 ACID 특성 중, 트랜잭션이 성공적으로 완료(commit)되면 그 결과가 시스템 장애가 발생하더라도 영구적으로 데이터베이스에 반영되어야 한다는 성질은?',o:['원자성(Atomicity)','일관성(Consistency)','고립성(Isolation)','지속성(Durability)','격리성 수준(Isolation Level)'],a:3,e:'지속성(영속성)은 회복(recovery) 기법(로그, 체크포인트)으로 보장된다. 원자성은 All or Nothing, 일관성은 무결성 제약 유지, 고립성은 동시 실행 트랜잭션 간 간섭 배제를 의미한다.'},
{id:'db05',sec:'dbn',topic:'DB·SQL',q:'EMP 테이블의 dept 열 값이 순서대로 A, A, B, C, C, C 인 6개 행이 있을 때, 다음 SQL의 결과 행 수는?',code:'SELECT dept, COUNT(*)\nFROM EMP\nGROUP BY dept\nHAVING COUNT(*) >= 2;',o:['1','2','3','5','6'],a:1,e:'GROUP BY 결과는 A(2), B(1), C(3). HAVING은 그룹 단위 조건이므로 COUNT ≥ 2인 A, C만 남아 2행. WHERE는 그룹화 전 개별 행 조건, HAVING은 그룹화 후 조건이다.'},
{id:'db06',sec:'dbn',topic:'DB·인덱스',q:'데이터베이스 인덱스에 대한 설명으로 옳지 않은 것은?',o:['B+트리 인덱스는 모든 키 값이 리프 노드에 존재하며 리프 노드들이 연결 리스트로 연결된다.','B+트리 인덱스는 범위 검색(BETWEEN, <, >)에 유리하다.','인덱스가 많을수록 INSERT, UPDATE, DELETE 성능은 저하될 수 있다.','클러스터드 인덱스는 테이블당 하나만 생성할 수 있다.','해시 인덱스는 등호(=) 검색보다 범위 검색에 더 유리하다.'],a:4,e:'해시 인덱스는 키를 해시 값으로 변환하여 저장하므로 등호 검색은 O(1)에 가깝지만 순서 정보가 없어 범위 검색·정렬에는 사용할 수 없다. 범위 검색은 B+트리가 적합하다.'},
{id:'nw01',sec:'dbn',topic:'네트워크·OSI',q:'OSI 7계층 중 흐름 제어와 오류 제어를 통해 종단(end-to-end) 간 신뢰성 있는 데이터 전송을 담당하며, TCP와 UDP가 동작하는 계층은?',o:['물리 계층','데이터링크 계층','네트워크 계층','전송 계층','세션 계층'],a:3,e:'전송 계층(4계층)은 포트 번호로 프로세스를 구분하고 세그먼트 단위로 전송한다. 네트워크 계층(3, IP·라우터)은 경로 설정, 데이터링크(2, 스위치·MAC)는 인접 노드 간 전송을 담당한다.'},
{id:'nw02',sec:'dbn',topic:'네트워크·TCP/UDP',q:'TCP와 UDP에 대한 설명으로 옳지 않은 것은?',o:['TCP는 연결 지향적이며 3-way handshake로 연결을 설정한다.','TCP는 순서 번호와 확인 응답(ACK)으로 신뢰성을 보장한다.','UDP는 헤더가 8바이트로 작고 오버헤드가 적어 실시간 스트리밍·DNS 등에 사용된다.','TCP는 슬라이딩 윈도우로 흐름 제어를, 혼잡 윈도우로 혼잡 제어를 수행한다.','UDP는 3-way handshake로 연결을 설정한 뒤 데이터그램을 전송한다.'],a:4,e:'UDP는 비연결형으로 연결 설정 과정이 없다. TCP의 3-way handshake는 SYN → SYN+ACK → ACK 순으로 이루어지며, 연결 종료는 4-way handshake(FIN/ACK)이다.'},
{id:'nw03',sec:'dbn',topic:'네트워크·IPv6',q:'IPv6에 대한 설명으로 옳지 않은 것은?',o:['주소 길이는 128비트이며 16비트씩 8부분을 콜론(:)으로 구분해 16진수로 표기한다.','기본 헤더가 고정 길이(40바이트)로 단순화되어 라우터 처리 효율이 높다.','IPSec 기능을 기본적으로 지원하여 보안이 강화되었다.','유니캐스트, 멀티캐스트, 애니캐스트 주소 유형을 지원한다.','IPv4와 동일하게 브로드캐스트 주소를 사용한다.'],a:4,e:'IPv6에는 브로드캐스트가 없으며 멀티캐스트(및 애니캐스트)로 대체되었다. 또한 헤더 체크섬 제거, 확장 헤더 도입, 자동 주소 설정(SLAAC) 등이 특징이다. IPv4→IPv6 전환 기술: 듀얼 스택, 터널링, 주소 변환(NAT-PT).'},
{id:'nw04',sec:'dbn',topic:'네트워크·라우팅',q:'링크 상태(Link State) 라우팅 알고리즘을 사용하며, 다익스트라 알고리즘으로 최단 경로를 계산하는 내부 게이트웨이 라우팅 프로토콜은?',o:['RIP','IGRP','BGP','OSPF','ARP'],a:3,e:'OSPF는 링크 상태 방식으로 네트워크 전체 토폴로지를 각 라우터가 알고 SPF(다익스트라)로 계산한다. RIP·IGRP는 거리 벡터(Bellman-Ford) 방식이며 RIP는 홉 수 최대 15. BGP는 AS 간 외부 게이트웨이 프로토콜(경로 벡터)이다.'},
{id:'nw05',sec:'dbn',topic:'네트워크·서브넷',q:'네트워크 주소 192.168.10.0/26 에서 실제 호스트에 할당할 수 있는 IP 주소의 개수는?',o:['30','62','64','126','254'],a:1,e:'/26 → 호스트 비트 32−26 = 6비트 → 2⁶ = 64개 중 네트워크 주소와 브로드캐스트 주소를 제외한 62개. 서브넷 마스크는 255.255.255.192이며 /24 대역을 4개의 서브넷으로 나눈다.'},
{id:'nw06',sec:'dbn',topic:'네트워크·프로토콜',q:'같은 네트워크 내에서 목적지의 IP 주소를 이용해 MAC(물리) 주소를 알아내는 프로토콜은?',o:['ARP','RARP','ICMP','DHCP','DNS'],a:0,e:'ARP(Address Resolution Protocol)는 IP → MAC 변환, RARP는 그 반대. ICMP는 오류 보고·진단(ping), DHCP는 IP 자동 할당, DNS는 도메인 이름 → IP 변환을 담당한다.'},
/* ===== 프로그래밍 12 (C++ 6, Java 4, Python 2) ===== */
{id:'pl01',sec:'pl',topic:'C++·포인터',q:'다음 C++ 코드의 출력 결과는?',code:'#include <iostream>\nusing namespace std;\nint main() {\n    int a[] = {10, 20, 30, 40};\n    int *p = a;\n    p += 2;\n    cout << *p + *(p - 1);\n    return 0;\n}',o:['30','40','50','60','70'],a:2,e:'p는 a[0]을 가리키다가 p += 2 로 a[2](30)를 가리킨다. *(p−1)은 a[1](20). 따라서 30 + 20 = 50.'},
{id:'pl02',sec:'pl',topic:'C++·참조·증감 연산자',q:'다음 C++ 코드의 출력 결과는?',code:'#include <iostream>\nusing namespace std;\nint main() {\n    int x = 5;\n    int &r = x;\n    r++;\n    int y = x++;\n    int z = ++x;\n    cout << x << " " << y << " " << z;\n    return 0;\n}',o:['8 6 8','7 6 7','8 7 8','7 5 7','8 6 7'],a:0,e:'r은 x의 별칭이므로 r++ 로 x=6. y = x++ 는 현재 값 6을 y에 넣고 x=7. z = ++x 는 먼저 x=8로 만든 뒤 z=8. 출력: 8 6 8.'},
{id:'pl03',sec:'pl',topic:'C++·정렬 알고리즘',q:'다음 C++ 코드는 버블 정렬의 첫 번째 패스만 수행한다. 실행 후 배열 a의 상태는?',code:'#include <iostream>\n#include <algorithm>\nusing namespace std;\nint main() {\n    int a[5] = {5, 1, 4, 2, 8};\n    for (int j = 0; j < 4; j++)\n        if (a[j] > a[j + 1])\n            swap(a[j], a[j + 1]);\n    for (int v : a) cout << v << " ";\n    return 0;\n}',o:['1 2 4 5 8','5 1 4 2 8','1 5 4 2 8','1 4 2 5 8','1 4 5 2 8'],a:3,e:'(5,1)→교환 [1,5,4,2,8] / (5,4)→교환 [1,4,5,2,8] / (5,2)→교환 [1,4,2,5,8] / (5,8)→유지. 한 패스가 끝나면 최댓값 8이 맨 끝에 자리 잡는다.'},
{id:'pl04',sec:'pl',topic:'C++·가상 함수',q:'다음 C++ 코드의 출력 결과는?',code:'#include <iostream>\nusing namespace std;\nclass A {\npublic:\n    virtual void f() { cout << "A"; }\n    void g() { cout << "a"; }\n};\nclass B : public A {\npublic:\n    void f() override { cout << "B"; }\n    void g() { cout << "b"; }\n};\nint main() {\n    A *p = new B();\n    p->f();\n    p->g();\n    delete p;\n    return 0;\n}',o:['AB','Ba','Bb','Aa','Ab'],a:1,e:'f()는 virtual이므로 실제 객체 타입(B)의 함수가 동적 바인딩되어 "B". g()는 virtual이 아니므로 포인터의 정적 타입(A)에 따라 A::g()가 호출되어 "a". 출력: Ba.'},
{id:'pl05',sec:'pl',topic:'C++·생성자/소멸자',q:'다음 C++ 코드의 출력 결과는?',code:'#include <iostream>\nusing namespace std;\nclass A {\npublic:\n    A()  { cout << "A"; }\n    ~A() { cout << "~A"; }\n};\nclass B : public A {\npublic:\n    B()  { cout << "B"; }\n    ~B() { cout << "~B"; }\n};\nint main() {\n    B b;\n    return 0;\n}',o:['AB~A~B','BA~B~A','AB~B~A','BA~A~B','AB'],a:2,e:'생성 시에는 부모 → 자식 순(A, B), 소멸 시에는 그 역순인 자식 → 부모(~B, ~A)로 호출된다. 출력: AB~B~A.'},
{id:'pl06',sec:'pl',topic:'C++·재귀',q:'다음 C++ 코드의 출력 결과는?',code:'#include <iostream>\nusing namespace std;\nint f(int n) {\n    if (n <= 1) return 1;\n    return n * f(n - 2);\n}\nint main() {\n    cout << f(7);\n    return 0;\n}',o:['15','21','35','105','5040'],a:3,e:'f(7) = 7 × f(5) = 7 × 5 × f(3) = 7 × 5 × 3 × f(1) = 7 × 5 × 3 × 1 = 105. (홀수 이중 팩토리얼 7!!)'},
{id:'pl07',sec:'pl',topic:'Java·추상클래스/인터페이스',q:'Java의 추상 클래스와 인터페이스에 대한 설명으로 옳지 않은 것은?',o:['한 클래스는 여러 인터페이스를 동시에 구현(implements)할 수 있다.','추상 클래스는 생성자를 가질 수 있지만 직접 인스턴스화할 수는 없다.','인터페이스에 선언된 필드는 암묵적으로 public static final 이다.','추상 클래스는 일반(구현된) 메서드와 추상 메서드를 함께 가질 수 있다.','인터페이스는 인스턴스 필드(멤버 변수)를 선언하여 구현 클래스에 상속할 수 있다.'],a:4,e:'인터페이스는 상수(public static final)만 가질 수 있고 인스턴스 필드는 가질 수 없다. Java 8부터 default·static 메서드로 구현부를 가질 수 있지만 상태(필드)는 여전히 불가하다. 클래스 상속은 단일 상속만 가능하다.'},
{id:'pl08',sec:'pl',topic:'Java·오버라이딩·static',q:'다음 Java 코드의 출력 결과는?',code:'class P {\n    String name() { return "P"; }\n    static String s() { return "sP"; }\n}\nclass C extends P {\n    String name() { return "C"; }\n    static String s() { return "sC"; }\n}\npublic class Main {\n    public static void main(String[] args) {\n        P o = new C();\n        System.out.println(o.name() + o.s());\n    }\n}',o:['CsC','CsP','PsP','PsC','컴파일 오류'],a:1,e:'인스턴스 메서드 name()은 오버라이딩되어 실제 객체 타입 C의 메서드가 호출된다("C"). static 메서드는 오버라이딩되지 않고 은닉(hiding)되며 참조 변수의 타입(P)에 따라 결정되므로 "sP". 출력: CsP.'},
{id:'pl09',sec:'pl',topic:'Java·String 비교',q:'다음 Java 코드의 출력 결과는?',code:'public class Main {\n    public static void main(String[] args) {\n        String a = "java";\n        String b = new String("java");\n        String c = "java";\n        System.out.println((a == b) + " " + (a == c) + " " + a.equals(b));\n    }\n}',o:['true true true','false true true','false false true','true false true','false true false'],a:1,e:'리터럴 "java"는 문자열 상수 풀에서 공유되므로 a와 c는 같은 객체(a==c true). new String()은 힙에 새 객체를 만들어 a==b는 false. equals()는 내용 비교이므로 true.'},
{id:'pl10',sec:'pl',topic:'Java·예외 처리',q:'다음 Java 코드의 출력 결과는?',code:'public class Main {\n    static int f() {\n        try {\n            return 1;\n        } finally {\n            System.out.print("F");\n        }\n    }\n    public static void main(String[] args) {\n        System.out.print(f());\n    }\n}',o:['1F','F1','1','F','컴파일 오류'],a:1,e:'try 블록에서 return 값 1이 결정된 뒤, 메서드가 실제로 반환되기 전에 finally 블록이 반드시 실행되어 "F"를 먼저 출력한다. 그 후 main에서 반환값 1을 출력. 출력: F1.'},
{id:'pl11',sec:'pl',topic:'Python·슬라이싱',q:'다음 Python 코드의 출력 결과는?',code:'a = [1, 2, 3, 4, 5, 6]\nprint(a[::-2], a[1:4])',o:['[6, 4, 2] [2, 3, 4]','[5, 3, 1] [2, 3, 4]','[6, 4, 2] [2, 3, 4, 5]','[6, 5, 4] [1, 2, 3]','[2, 4, 6] [2, 3, 4]'],a:0,e:'a[::-2]는 끝에서부터 2칸씩 건너뛰며 역순으로 → [6, 4, 2]. a[1:4]는 인덱스 1부터 4 직전까지 → [2, 3, 4]. 슬라이싱의 끝 인덱스는 포함되지 않는다.'},
{id:'pl12',sec:'pl',topic:'Python·딕셔너리·정렬',q:'다음 Python 코드의 출력 결과는?',code:'d = {}\nfor w in "banana":\n    d[w] = d.get(w, 0) + 1\nprint(sorted(d.items(), key=lambda x: -x[1])[0])',o:["('a', 3)","('n', 2)","('b', 1)","('a', 2)","('n', 3)"],a:0,e:'문자 빈도: b=1, a=3, n=2. dict.get(key, 0)은 키가 없으면 기본값 0을 반환한다. 빈도 내림차순(−x[1])으로 정렬한 첫 항목은 (\'a\', 3).'},
];

// 문제은행이 무엇을 근거로 만들어졌는지. 저장소에 복기·복원 원본 파일이 있으면 recall, 없으면 predicted.
// 목록 화면과 회사 화면이 같은 문구를 쓰도록 여기에 모아 둔다
export const SOURCE_KINDS = {
  recall: {
    icon: "📕",
    group: "복기문제집",
    badge: "복기문제",
    summary: "실제 응시자 복기·복원 자료를 바탕으로 만든 문제입니다.",
    detail: "실제 응시자 복기·복원 자료를 바탕으로 만든 문제입니다. 자료에 남은 주제와 유형을 따랐고, 기억나지 않는 보기와 수치는 새로 채웠으므로 실제 문항과는 다를 수 있습니다.",
  },
  predicted: {
    icon: "📝",
    group: "예상문제집",
    badge: "예상문제",
    summary: "채용공고의 출제범위를 반영해 새로 만든 예상문제입니다. 실제 기출의 복원이 아닙니다.",
    detail: "채용공고의 출제 과목·문항 수 구성과 공개된 출제범위를 반영해 새로 만든 예상문제입니다. 실제 기출의 복원이 아닙니다.",
  },
};

// 기업별 기출문제 첫 화면의 분류. 회사마다 category로 어느 쪽에 들어갈지 정한다
export const EXAM_CATEGORIES = [
  { key: "tech", name: "서비스기업", desc: "웹 백엔드 CS · 프로그래밍 대비" },
  { key: "finance", name: "금융공기업", desc: "금융공기업 · 금융권 IT직무 필기" },
  { key: "public", name: "공기업", desc: "일반 공기업 전산직 전공필기" },
  // 기업 문제집이 아닌 기술 과목 문제집. 기업별 기출이 아니라 필기이론 화면(/major)에 모아 보여 준다
  { key: "stack", name: "개발 스택", desc: "Spring · JPA 기술 면접 · 필기 대비", unit: "과목", hub: "web" },
  // hub가 있는 분류는 기업별 기출이 아니라 그 이름의 상단 메뉴(/ssafy)에 모아 보여 준다
  { key: "major", name: "SSAFY 과목평가", desc: "SSAFY 과목평가 · 객관식 · 단답형 · 서술형", unit: "과목", hub: "ssafy" },
  { key: "ai", name: "AI", desc: "딥러닝 · 머신러닝 · 빅데이터 AI", unit: "과목", hub: "ai" },
  { key: "monthly", name: "월말평가", desc: "SSAFY 월말평가 서술형 (구현 문제 제외)", unit: "과목", hub: "ssafy" },
  { key: "aptitude", name: "인적성검사", desc: "기업별 인적성검사 · 언어 · 수리 · 추리 · 문제해결", hub: "aptitude" },
];

// 문제은행 풀이 화면 주소. SSAFY처럼 따로 메뉴를 가진 분류는 그 메뉴 아래에 둔다
export const hubOf = (company) => EXAM_CATEGORIES.find(c => c.key === company.category)?.hub;
export const companyPath = (company) => `/${hubOf(company) || 'exam'}/${company.key}`;

export const COMPANIES = [
  {
    key: 'cu', category: 'finance', abbr: '신협중앙회', name: '신협중앙회 IT', ready: true,
    meta: '40문항 × 3세트 · 총 120문항 · 4지선다',
    source: { kind: 'predicted', label: '공고 범위 기반 예상문제', detail: '2026년 11월 7일 필기 공고(공식 명칭: 2027년 신입직원 채용)의 IT 직무상식 40문항·40분과 4개 출제영역을 반영했습니다. 모든 문항을 이 문제집을 위해 새로 작성했습니다. 실제 기출 복원이나 출제 확률을 뜻하지 않으며 과목별 배분은 학습용입니다.' },
    questions: CU_QUESTIONS, sections: CU_SECTIONS, sets: CU_SETS, minutes: 40,
    setsDescription: '회차마다 객관식 40문항입니다. 공고의 전공 범위에 맞춰 구성했으며 과목별 비중은 학습용입니다. 목표 시간은 회차당 40분이고 화면에서는 시간 제한 없이 풀 수 있습니다.',
    references: [{title:'신협중앙회 공식 채용공고 · 2026.11.7 필기',url:'https://cu2.saramin.co.kr/service/cu2/3984/applicant/apply/recruit_default.asp'}],
    lede: '소프트웨어 설계·개발, 데이터베이스 구축, 프로그래밍 언어 활용, 정보시스템 구축 관리. SQL·코드 실행·계산·옳은 설명 고르기·실무 상황 판단을 연습합니다. 별도 온라인 코딩테스트는 공고상 알고리즘·SQL 4문항/120분입니다. 이 문제집은 객관식 전공필기 대비용입니다.',
  },
  {
    key: 'pearl', category: 'tech', abbr: '펄어비스', name: '펄어비스 웹 백엔드', ready: true,
    meta: '자체 예상 50문항 · 객관식 40 + 서술형 10 · 연습 70분',
    source: { kind: 'predicted', label: '자체 제작 예상문제', detail: '사용자가 제공한 준비 범위를 바탕으로 만든 학습용 문제입니다. 실제 기출이나 공식 시험 구성의 복원이 아니며, 문항 수와 70분은 연습용 설정입니다.' },
    questions: PEARL_QUESTIONS, sections: PEARL_SECTIONS, minutes: 70,
    examSub: '자체 예상 객관식 40 + 서술형 10 · 연습용 구성',
    lede: '웹·네트워크, DB, 운영체제·동시성, 자료구조·알고리즘, C#·객체지향을 각 10문항씩 연습합니다. 객관식 40문항과 서술형 10문항으로 구성했고 SQL·C# 코드 읽기와 실무 상황 판단을 포함했습니다. 각 문제에서 정답 이유와 함정을 바로 확인할 수 있습니다. 서술형은 모범답안과 채점 포인트를 보고 직접 채점합니다. 시간이 부족하면 영역별 연습부터 시작하세요.',
  },
  {
    key: "hf", category: "finance", abbr: "HF", name: "한국주택금융공사", meta: "전공필기 60문제 · 80분 · 5지선다 · C++ 집중 48문제", ready: true,
    source: { kind: "predicted", label: "출제범위 기반 예상문제", detail: "모의고사와 영역별 연습, C++ 집중 문제집은 출제범위를 반영해 새로 만든 예상문제입니다." },
    questions: HF_QUESTIONS, sections: SECTIONS, minutes: 80, extra: HF_CPP_QUESTIONS,
    lede: "전산학일반(정보보호 포함) 36문제, 데이터베이스·네트워크 12문제, 프로그래밍(C++ · Java · Python) 12문제. 총 60문제, 80분, 5지선다. 코딩테스트 이후 치르는 전공필기 범위만 다룹니다. 프로그래밍 영역은 C++ 코드 실행 결과 문제 비중이 높아 아래에 C++ 집중 문제집을 따로 두었습니다.",
  },
  {
    key: "kdb", category: "finance", abbr: "KDB", name: "한국산업은행", meta: "전산 전공 35문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KDB_QUESTIONS, sections: KDB_SECTIONS, minutes: 50,
    lede: "데이터베이스 7문제, 자료구조·알고리즘 6문제, 네트워크 6문제, 운영체제 6문제, 정보보호 5문제, 시스템 아키텍처 5문제. 총 35문제, 50분, 4지선다. 전산 전공 범위에 분산·가용성 설계 주제를 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "kexim", category: "finance", abbr: "KEXIM", name: "한국수출입은행", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KEXIM_QUESTIONS, sections: KEXIM_SECTIONS, minutes: 45,
    lede: "데이터베이스 6문제, 운영체제 5문제, 네트워크 5문제, 자료구조·알고리즘 5문제, 프로그래밍·개발 5문제, 정보보호 4문제. 총 30문제, 45분, 4지선다. 전산 전공 출제범위를 기준으로 새로 만든 예상문제입니다.",
  },
  {
    key: "kodit", category: "finance", abbr: "KODIT", name: "신용보증기금", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KODIT_QUESTIONS, sections: KODIT_SECTIONS, minutes: 45,
    lede: "데이터베이스 6문제, 프로그래밍 6문제, 자료구조·알고리즘 5문제, 운영체제 5문제, 네트워크·보안 5문제, 소프트웨어공학 3문제. 총 30문제, 45분, 4지선다. Java·Python 활용 문항을 포함해 새로 만든 예상문제입니다.",
  },
  {
    key: "kamco", category: "finance", abbr: "KAMCO", name: "한국자산관리공사", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KAMCO_QUESTIONS, sections: KAMCO_SECTIONS, minutes: 45,
    lede: "데이터베이스 6문제, 자료구조·알고리즘 6문제, 운영체제 5문제, 네트워크 5문제, 소프트웨어공학 5문제, 정보보호·신기술 3문제. 총 30문제, 45분, 4지선다. 전산 전공 출제범위를 기준으로 새로 만든 예상문제입니다.",
  },
  {
    key: "bok", category: "finance", abbr: "BOK", name: "한국은행", meta: "전산 전공 35문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: BOK_QUESTIONS, sections: BOK_SECTIONS, minutes: 50,
    lede: "자료구조·알고리즘 7문제, 데이터베이스 7문제, 운영체제 6문제, 네트워크 6문제, 컴퓨터구조 5문제, 소프트웨어공학 4문제. 총 35문제, 50분, 4지선다. 전산 전공 출제범위를 기준으로 새로 만든 예상문제이며 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "ksd", category: "finance", abbr: "KSD", name: "한국예탁결제원", meta: "전산 전공 35문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KSD_QUESTIONS, sections: KSD_SECTIONS, minutes: 50,
    lede: "데이터베이스 7문제, 자료구조·알고리즘 6문제, 네트워크 6문제, 운영체제·시스템 6문제, 정보보호 5문제, 증권·결제 도메인 5문제. 총 35문제, 50분, 4지선다. 전산 전공 범위에 예탁·결제 실무 개념을 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "kdic", category: "finance", abbr: "KDIC", name: "예금보험공사", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KDIC_QUESTIONS, sections: KDIC_SECTIONS, minutes: 45,
    lede: "데이터베이스 6문제, 네트워크·보안 6문제, 운영체제 5문제, 자료구조·알고리즘 5문제, 소프트웨어공학·신기술 5문제, 예금보험 도메인 3문제. 총 30문제, 45분, 4지선다. 전산 전공 범위에 예금자보호·업무연속성 개념을 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "kftc", category: "finance", abbr: "KFTC", name: "금융결제원", meta: "전산 전공 35문제 × 2회 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: [...KFTC_QUESTIONS.map(q => ({ ...q, set: 'a' })), ...KFTC_SET2_QUESTIONS.map(q => ({ ...q, set: 'b' }))], sections: KFTC_SECTIONS, minutes: 50,
    sets: [
      { key: 'a', name: '예상문제 1회', sub: '트랜잭션·격리 수준 · TCP·서브넷 · 스케줄링·교착상태 · 암호·전자서명 · 오픈뱅킹·이중화' },
      { key: 'b', name: '예상문제 2회', sub: '조인·키·파티셔닝 · 혼잡 제어·라우팅 · 리눅스·레지스트리 · Java·C++ 코드 · 프롬프트 인젝션 · 금융공동망·차액결제' },
    ],
    lede: "데이터베이스 7문제, 네트워크 7문제, 운영체제 6문제, 자료구조·알고리즘 5문제, 정보보호 5문제, 금융IT·지급결제 5문제. 한 회 35문제, 50분, 4지선다로 2회분을 준비했습니다. 채용공고가 밝힌 출제범위(프로그래밍, DB, 시스템운영, 정보보호 등 전산학 전반)와 응시 후기에 언급된 주제(C++·Java 코드, 리눅스, 정보보안, 프롬프트 엔지니어링), 금융결제원의 지급결제 업무를 기준으로 새로 만든 예상문제입니다. 실제 문항 수와 시험 시간은 공개되어 있지 않아 문항 수·시간·보기 수는 연습용으로 정한 것이며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "fsec", category: "finance", abbr: "FSEC", name: "금융보안원", meta: "정보보호 전공 40문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: FSEC_QUESTIONS, sections: FSEC_SECTIONS, minutes: 50,
    lede: "암호학 8문제, 네트워크 보안 8문제, 시스템 보안 7문제, 어플리케이션 보안 7문제, 침해사고 대응·분석 5문제, 정보보호 개론·금융보안 법규 5문제. 총 40문제, 50분, 4지선다. Tech·Security(IT·정보보호) 분야 2차 필기 전공시험 중 정보보호학 선택을 대상으로, 채용공고의 출제범위(정보보호 개론 · 네트워크 보안 · 시스템 보안 · 어플리케이션 보안 · 암호학 · 침해사고 대응 및 분석)와 응시 후기에 언급된 암호·네트워크·금융 법규 주제를 기준으로 새로 만든 예상문제입니다. 실제 시험은 객관식 30문항과 주관식 10문항으로 치러지지만 여기서는 모두 객관식으로 옮겼으며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "fss", category: "finance", abbr: "FSS", name: "금융감독원", meta: "IT 전공 40문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: FSS_QUESTIONS, sections: FSS_SECTIONS, minutes: 50,
    lede: "데이터베이스 7문제, 네트워크 6문제, 컴퓨터구조·운영체제 6문제, 자료구조·알고리즘·SW공학 7문제, 정보보호 7문제, 전자금융·IT 감독 7문제. 총 40문제, 50분, 4지선다. 금융감독원 필기는 1차가 NCS 직업기초능력(객관식), 2차가 전공지식(주관식)과 논술로 치러집니다. 2차 전공에서 다루는 전산학 전반과 채용공고의 IT 직무(IT·전자금융 감독·검사, 금융정보보호)를 기준으로 핵심 개념을 객관식으로 점검하도록 새로 만든 예상문제이며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "krx", category: "finance", abbr: "KRX", name: "한국거래소", meta: "IT 전공 40문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KRX_QUESTIONS, sections: KRX_SECTIONS, minutes: 50,
    lede: "프로그래밍·자료구조 9문제, 데이터베이스 7문제, 운영체제 6문제, 네트워크 6문제, 소프트웨어공학 5문제, 최신IT·정보보호 7문제. 총 40문제, 50분, 4지선다. 채용공고에 제시된 IT 출제범위(컴퓨터프로그래밍 · 데이터베이스 · 네트워크 · 운영체제 · 자료구조 · SW공학 · 인공지능 · 정보보호)를 기준으로, 매매체결·청산결제·시장감시 시스템 상황을 입혀 새로 만든 예상문제입니다. 실제 전공시험은 객관식 외에 단답형과 서술형이 함께 출제되는 것으로 알려져 있으나 여기서는 객관식으로만 구성했으며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "kibo", category: "finance", abbr: "KIBO", name: "기술보증기금", meta: "전산학 40문제 · 60분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KIBO_QUESTIONS, sections: KIBO_SECTIONS, minutes: 60,
    lede: "프로그래밍·코드 해석 9문제, 데이터베이스·SQL 8문제, 자료구조·알고리즘 6문제, 운영체제 5문제, 네트워크 5문제, 정보보호·SW공학·신기술 7문제. 총 40문제, 60분, 4지선다. 필기 2교시 직무수행능력평가(전산학)를 대상으로, 채용공고의 평가과목과 과거 공고의 코딩테스트 언어(Java · Python · C++ · SQL)를 기준으로 새로 만든 예상문제입니다. 보증 신청·기술평가·보증서 발급 같은 업무 상황을 배경으로 넣었습니다. 실제 시험은 객관식 외에 단답형·약술형이 함께 출제될 수 있으며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "ksure", category: "finance", abbr: "K-SURE", name: "한국무역보험공사", meta: "전산학 40문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KSURE_QUESTIONS, sections: KSURE_SECTIONS, minutes: 50,
    lede: "데이터베이스 8문제, 소프트웨어공학 7문제, 프로그래밍언어 7문제, 정보보안 7문제, 운영체제 7문제, 전산학일반 4문제. 총 40문제, 50분, 4지선다. IT(전산학) 직렬 직무능력평가를 대상으로, 채용공고의 출제범위(데이터베이스 · 소프트웨어공학 · 프로그래밍언어 · 정보보안 · 운영체제를 포함한 전산학일반)를 기준으로 무역보험 업무 시스템 상황을 입혀 새로 만든 예상문제입니다. 실제 직무능력평가는 객관식과 주관식이 함께 나오고 별도의 직무능력논술이 있으며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "hug", category: "finance", abbr: "HUG", name: "주택도시보증공사", meta: "전산 전공 40문제 · 50분 · 5지선다", ready: true,
    source: { kind: "predicted" },
    questions: HUG_QUESTIONS, sections: HUG_SECTIONS, minutes: 50,
    lede: "소프트웨어 설계 8문제, 소프트웨어 개발 8문제, 데이터베이스 구축 8문제, 프로그래밍 언어 활용 8문제, 정보시스템 구축 관리 8문제. 총 40문제, 50분, 5지선다. 채용공고에 명시된 전산 분야 출제범위 5과목(정보처리기사 필기와 같은 구성)을 기준으로, 전세보증·분양보증 업무 시스템 상황과 SQL·C·Java·Python 코드 문제를 섞어 새로 만든 예상문제입니다. 실제 전공필기는 80문항으로 알려져 있어 그 절반 분량이며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "ksfc", category: "finance", abbr: "KSFC", name: "한국증권금융", meta: "IT 전공 40문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KSFC_QUESTIONS, sections: KSFC_SECTIONS, minutes: 50,
    lede: "데이터베이스 8문제, 운영체제 6문제, 네트워크 6문제, 자료구조·알고리즘·프로그래밍 8문제, 정보보호 6문제, 금융IT·증권금융 업무 6문제. 총 40문제, 50분, 4지선다. 채용공고의 출제범위(전산학)와 증권담보대출·투자자예탁금·우리사주 같은 증권금융 업무 상황을 기준으로 새로 만든 예상문제입니다. 실제 시험의 문항 수와 형식은 공개되어 있지 않아 연습용으로 정한 것이며, 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "kcis", category: "finance", abbr: "KCIS", name: "한국신용정보원", meta: "IT 전공 40문제 · 50분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KCIS_QUESTIONS, sections: KCIS_SECTIONS, minutes: 50,
    lede: "데이터베이스·SQL 9문제, 프로그래밍·자료구조·SW공학 8문제, 네트워크·대외연계 7문제, 운영체제·인프라 6문제, 정보보호 5문제, 신용정보·데이터 활용 5문제. 총 40문제, 50분, 4지선다. 전공 필기의 문항 수와 출제범위가 공개되어 있지 않아, 채용공고의 IT 직무 내용(전문·API 대외 연계, 배치·통계 처리, 인프라·DBA)과 우대 자격증 범위, 신용정보 집중·마이데이터·가명정보 결합 같은 기관 업무를 기준으로 새로 만든 예상문제입니다. 실제 기출의 복원이 아니며 문항 수와 시간도 실제 시험과 다를 수 있습니다.",
  },
  {
    key: "kinfa", category: "finance", abbr: "KINFA", name: "서민금융진흥원", meta: "전산일반 30 + 법률 5 · 60분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KINFA_QUESTIONS, sections: KINFA_SECTIONS, minutes: 60,
    lede: "소프트웨어공학 6문제, 데이터베이스 7문제, 프로그래밍 7문제, 운영체제 5문제, 정보보호 5문제, 서민금융법 5문제. 총 35문제, 60분, 4지선다. 채용공고에 안내된 직무수행능력평가 구성(전공 30문항 + 법률 5문항, 60분)과 전산일반 출제범위(소프트웨어공학 · 데이터베이스 · 프로그래밍 · 운영체제 · 정보보호), 「서민의 금융생활 지원에 관한 법률」을 기준으로 새로 만든 예상문제입니다. 실제 기출의 복원이 아닙니다.",
  },
  {
    key: "ibkdt", category: "finance", abbr: "IBK 디지털", name: "IBK기업은행 디지털", meta: "직무수행(디지털) 30문제 × 3회 · 45분 · 4지선다 · 빅데이터 집중 80문제", ready: true,
    source: { kind: "predicted" },
    questions: IBKDT_QUESTIONS, sections: { ...IBKDT_SECTIONS, ...IBK_BIGDATA.sections }, minutes: 45,
    sets: IBKDT_SETS, units: IBK_BIGDATA,
    lede: "데이터베이스 9문제, 빅데이터·AI 모델링 9문제, 전산학 8문제, 블록체인·디지털금융 시사 4문제. 한 회 30문제, 45분, 4지선다로 3회분을 준비했습니다. 필기 구성(직업기초 40 + 직무수행 35 = 객관식 30 · 주관식 5, 120분)과 디지털 분야 공개 출제범위(데이터베이스 · 빅데이터 · 인공지능 모델링 · 블록체인 · 전산학 · 시사)를 반영해 새로 만든 예상문제입니다. 실제 시험의 주관식 5문항은 포함하지 않았습니다.",
  },
  {
    key: "ibkit", category: "finance", abbr: "IBK IT", name: "IBK기업은행 IT", meta: "직무수행(IT) 객관식 30 + 주관식 5 × 3회 · 55분", ready: true,
    source: { kind: "predicted" },
    questions: IBKIT_QUESTIONS, sections: IBKIT_SECTIONS, minutes: 55,
    sets: IBKIT_SETS,
    lede: "직무수행능력(IT) 파트를 실제 시험처럼 객관식 30문제(4지선다)와 주관식 5문제로 구성했습니다. 자료구조·알고리즘 6, 운영체제·컴퓨터구조 5, 데이터베이스 6, 네트워크 5, 정보보호 4, 소프트웨어공학 2, 디지털금융·IT시사 2, 주관식 계산 5문제. 한 회 35문제, 55분으로 3회분을 준비했습니다. 2026 상반기 복기 자료의 출제 형식(ㄱ~ㄹ 중 옳은 것 모두 고르기, 계산형, (주)IBK 상황 제시, 단위까지 쓰는 주관식)을 IT 분야 출제범위에 맞춰 새로 만든 예상문제이며, NCS 직업기초능력 40문제는 기업은행 문제집에서 풀 수 있습니다.",
  },
  {
    key: "nhfire", category: "finance", abbr: "NH손보", name: "NH농협손해보험", meta: "직무상식평가 30문제 × 3회 · 25분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: NHFIRE_QUESTIONS, sections: NHFIRE_SECTIONS, minutes: 25,
    sets: NHFIRE_SETS,
    lede: "농업·농촌·농협 5문제, 손해보험·디지털금융 5문제, 데이터베이스 6문제, 전자계산기구조·운영체제 5문제, 소프트웨어공학 5문제, 데이터통신·정보보호 4문제. 한 회 30문제, 25분, 4지선다로 3회분을 준비했습니다. NH 계열사 공통 필기(인적성 + 직무능력평가 50문제·70분 + 직무상식평가 30문제·25분) 중 직무상식평가를 대상으로 하며, IT직 출제범위로 공개된 농업·농촌 및 디지털 상식과 데이터베이스·전자계산기 구조·운영체제·소프트웨어공학·데이터통신에 손해보험 도메인을 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "kepco", category: "public", abbr: "KEPCO", name: "한국전력공사", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: KEPCO_QUESTIONS, sections: KEPCO_SECTIONS, minutes: 45,
    lede: "자료구조·알고리즘 6문제, 데이터베이스 6문제, 운영체제 5문제, 통신·네트워크 5문제, 컴퓨터구조·논리회로 5문제, 정보보호·신기술 3문제. 총 30문제, 45분, 4지선다. 전산 전공 범위에 전력 제어·IoT 주제를 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "nhis", category: "public", abbr: "NHIS", name: "국민건강보험공단", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: NHIS_QUESTIONS, sections: NHIS_SECTIONS, minutes: 45,
    lede: "데이터베이스 7문제, 프로그래밍 5문제, 자료구조·알고리즘 5문제, 운영체제 5문제, 네트워크 4문제, 정보보호·개인정보 4문제. 총 30문제, 45분, 4지선다. 대용량 자격·이력 데이터와 개인정보 보호 주제를 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "lh", category: "public", abbr: "LH", name: "한국토지주택공사", meta: "전산 전공 30문제 · 45분 · 4지선다", ready: true,
    source: { kind: "predicted" },
    questions: LH_QUESTIONS, sections: LH_SECTIONS, minutes: 45,
    lede: "데이터베이스 6문제, 자료구조·알고리즘 6문제, 소프트웨어공학 5문제, 운영체제 5문제, 네트워크 5문제, 정보보호·신기술 3문제. 총 30문제, 45분, 4지선다. 전산 전공 범위에 공간정보(GIS) 주제를 더해 새로 만든 예상문제입니다.",
  },
  {
    key: "korail", category: "public", abbr: "KORAIL", name: "코레일", meta: "전산 전공 40문제 (예상문제) · 50분 · 5지선다", ready: true,
    source: { kind: "predicted", label: "출제 경향 기반 예상문제" },
    questions: KORAIL_PRED_QUESTIONS, sections: KORAIL_SECTIONS, minutes: 50,
    lede: "소프트웨어공학 9문제, 데이터베이스 9문제, 운영체제·컴퓨터구조 10문제, 네트워크 6문제, 정보보호 6문제. 총 40문제, 50분, 5지선다. 응시 후기에서 확인한 출제 경향을 따라 새로 만든 예상문제입니다.",
  },
  {
    key: "ex", category: "public", abbr: "EX", name: "한국도로공사", meta: "전산 전공 40문제 (예상문제) · 50분 · 5지선다", ready: true,
    source: { kind: "predicted", label: "출제 경향 기반 예상문제" },
    questions: EX_PRED_QUESTIONS, sections: EX_SECTIONS, minutes: 50,
    lede: "데이터베이스 8문제, 소프트웨어공학 8문제, 운영체제 9문제, 정보보호 7문제, 네트워크 8문제. 총 40문제, 50분, 5지선다. 응시 후기에서 확인한 출제 경향을 따라 새로 만든 예상문제입니다.",
  },
  {
    key: "kwater", category: "public", abbr: "K-water", name: "한국수자원공사", meta: "전산 전공(2차) 30문제 (예상문제) · 40분 · 4지선다", ready: true,
    source: { kind: "predicted", label: "출제 경향 기반 예상문제" },
    questions: KWATER_PRED_QUESTIONS, sections: KWATER_SECTIONS, minutes: 40,
    lede: "프로그래밍 실행 결과 6문제, 자료구조 3문제, 네트워크 3문제, 운영체제 8문제, 컴퓨터구조 10문제. 총 30문제, 40분, 4지선다. 응시 후기에서 확인한 출제 경향을 따라 새로 만든 예상문제입니다.",
  },
  {
    key: "kdn", category: "public", abbr: "KDN", name: "한전KDN", meta: "전산 필기(1차) 50문제 (예상문제) · 60분 · 5지선다", ready: true,
    source: { kind: "predicted", label: "출제 경향 기반 예상문제" },
    questions: KDN_PRED_QUESTIONS, sections: KDN_SECTIONS, minutes: 60,
    lede: "소프트웨어공학 7문제, 프로그래밍·자료구조 5문제, 운영체제 5문제, 데이터베이스 17문제, 네트워크 16문제. 총 50문제, 60분, 5지선다. 응시 후기에서 확인한 출제 경향을 따라 새로 만든 예상문제입니다. DB와 네트워크 비중이 높습니다.",
  },
  {
    key: "kicox", category: "public", abbr: "KICOX", name: "한국산업단지공단", meta: "정보기술 전공 39문제 (예상문제) · 55분 · 5지선다", ready: true,
    source: { kind: "predicted", label: "출제 경향 기반 예상문제" },
    questions: KICOX_PRED_QUESTIONS, sections: KICOX_SECTIONS, minutes: 55,
    lede: "데이터베이스 14문제, 자료구조·알고리즘 12문제, 소프트웨어공학 6문제, AI·보안 7문제. 총 39문제, 55분, 5지선다. 응시 후기에서 확인한 출제 경향을 따라 새로 만든 예상문제입니다. DB와 자료구조 비중이 높고 딥러닝 기초가 함께 나옵니다.",
  },
  {
    key: "spring-practice", category: "stack", abbr: "Spring", name: "Spring 핵심 실전", meta: "IoC·DI · AOP · MVC · MyBatis · Security 40문제 · 4지선다", ready: true,
    source: { kind: "predicted", label: "요청 범위 기반 자체 제작 문제", detail: "Spring Boot 3 / Spring Framework 6 / Spring Security 6 / MyBatis 3 / JUnit 5 기준. 별도 설정이 없는 기본 동작을 기준으로 하며 각 코드 문제의 전제 조건을 함께 확인하세요." },
    questions: SPRING_PRACTICE_QUESTIONS, sections: SPRING_PRACTICE_SECTIONS, minutes: 50,
    lede: "Spring 핵심·IoC/DI 9문제, Boot·로깅·테스트 5문제, AOP·트랜잭션 6문제, MVC·웹 계층 8문제, MyBatis·동적 SQL 6문제, Security 6문제. 4지선다 40문제와 해설을 제공합니다. Filter와 HandlerInterceptor, @Controller와 @RestController 비교 및 실행 결과 예측을 포함합니다.",
  },
  {
    key: "spring", category: "stack", abbr: "Spring", name: "Spring · JPA", meta: "코어 · 웹 · JPA · 부트 60문제 · 60분 · 4지선다", ready: true,
    source: { kind: "predicted", label: "자체 제작 문제", detail: "사이트의 스프링 이론 글과 기술 면접에서 자주 나오는 주제를 바탕으로 새로 만든 문제입니다. Spring Boot 3 / Spring 6 동작 기준입니다." },
    questions: SPRING_QUESTIONS, sections: SPRING_SECTIONS, minutes: 60,
    lede: "스프링 코어 15문제, 웹 MVC·시큐리티 15문제, JPA·트랜잭션 18문제, 스프링 부트·테스트·설계 12문제. 총 60문제, 60분, 4지선다. IoC·DI, 빈 스코프, AOP, MVC 요청 흐름, 필터·인터셉터·AOP 구분, 영속성 컨텍스트, N+1과 fetch join, OSIV, @Transactional 전파·롤백 규칙과 프록시 내부 호출, 자동 설정과 슬라이스 테스트를 다룹니다. 개념 문제에 코드를 읽고 동작 결과를 예측하는 문제 16개를 섞었습니다.",
  },
  {
    key: "ssafydb", category: "major", abbr: "SSAFY", name: "DB", meta: "객관식 30문제 · 4지선다", ready: true,
    source: { kind: "predicted", label: "요청 범위 기반 예상문제" },
    questions: SSAFY_DB_QUESTIONS,
    sections: { obj: { name: "객관식", short: "DB", sub: "Servlet · JSP · SQL", count: 30 } },
    minutes: 40,
    lede: "Servlet 생명주기·매핑·Filter, JSP·세션, SQL·트랜잭션·서브쿼리, 정규화·인덱스와 forward/redirect·WHERE/HAVING 비교를 다룹니다. SQL은 MySQL 8.4 / InnoDB 기준입니다. 4지선다 30문제와 정답·해설을 제공합니다.",
  },
  {
    key: "ai", category: "ai", abbr: "AI", name: "AI · 머신러닝", meta: "딥러닝 기초 · 머신러닝 · 빅데이터 AI 실무 · 4~5지선다", ready: true,
    source: { kind: "predicted", label: "자체 제작 문제", detail: "기업 전공필기 대비용으로 만든 문제집에서 AI · 머신러닝 문항만 모아 과목별로 다시 나눴습니다." },
    questions: AI_QUESTIONS, sections: AI_SECTIONS, minutes: 60,
    lede: "딥러닝 기초(역전파 · 활성화 함수 · 최적화 · 트랜스포머), 머신러닝 · 모델링(회귀 · 분류 · 군집 · 앙상블 · 평가 지표), 빅데이터 · AI 실무(전처리 · 모델 평가 · 생성형 AI)를 다룹니다. 모든 문제에 정답과 해설이 있습니다.",
  },
];

// 풀이 기록을 남기는 모든 공개 문제은행. 백업·복원 범위
export const BANKS = [...COMPANIES, NCS];

// 비공개 문제집(/private/chanung)의 풀이 기록 키. 문항 데이터는 비공개 화면에서만 불러오고, 기록 동기화·백업에는 키만 쓴다
export const PRIVATE_BANK_KEYS = ['koscom', 'ibk', 'kfsb', 'bnk', 'ssafyalgo', 'ssafymonthly', 'comil'];

// 모의고사 문제에 더해 별도 문제집(extra), 응시 후기 복원 문제(recall), 단원별 문제집(units)까지 합친 전체 문항
export const allQuestions = (bank) => [...bank.questions, ...(bank.extra || []), ...(bank.recall?.questions || []), ...(bank.units?.questions || [])];
