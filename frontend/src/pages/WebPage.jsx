import { HubCard, HubHeader, HubSection } from '../components/Hub';
import { WEB_ESSENTIALS } from '../data/webEssentials';
import { WEB_NOTE_QUESTIONS } from '../data/webNoteQuestions';
import { PRACTICAL_QUESTIONS } from '../data/practicalQuestions';

// 웹 개발 공부 첫 화면. 과목이 아니라 "무엇을 하는 곳인지"로 나눈다: 개념 읽기, 개념 문제, 실무형 문제.
// 위에서 아래로 내려가는 순서가 공부 순서다. 화면 문구에는 가운데점을 쓰지 않는다
const GROUPS = [
  {
    title: '① 개념 읽기',
    note: '먼저 읽고 이해해요',
    items: [
      { to: '/web-essentials', icon: '🌐', t: '웹노트', d: 'HTTP, 쿠키와 세션, CORS, 인증', m: `${WEB_ESSENTIALS.items.length}문답`, go: '읽으러 가기' },
    ],
  },
  {
    title: '② 개념 문제',
    note: '4지선다로 개념을 정확히 아는지 확인해요',
    items: [
      { to: '/web/java', icon: '☕', t: 'Java 핵심 문법', d: '언어 기초, 객체, 컬렉션, 예외와 표준 API', m: '38문제' },
      { to: '/web/spring-practice', icon: '🌱', t: 'Spring 핵심', d: 'IoC와 DI, Boot, AOP, MVC, MyBatis, Security', m: '53문제' },
      { to: '/web/spring', icon: '🍃', t: 'Spring과 JPA', d: '스프링 코어, 웹 MVC, JPA, 부트', m: '60문제' },
      { to: '/ssafy/ssafydb', icon: '🗄️', t: 'DB와 Servlet', d: 'SQL, 트랜잭션, 정규화, 인덱스, Servlet 생명주기', m: '30문제' },
      { to: '/web/webnote', icon: '✍️', t: '웹노트 문제풀이', d: '객관식, 단답형, 틀리면 노트로 바로 복습', m: `${WEB_NOTE_QUESTIONS.length}문항` },
    ],
  },
  {
    title: '③ 실무형 문제',
    note: '실제 코드를 읽고 무엇이 문제인지 찾아요. 예: 서버에서 재고가 가끔 틀린다, 왜일까?',
    items: [
      { to: '/web/practical', icon: '🛠️', t: '실무형 문제', d: '트랜잭션, JPA, 동시성, API 설계, 캐시와 메시지, 인덱스와 쿼리, 보안, 외부 연동, 배포와 운영', m: `${PRACTICAL_QUESTIONS.length}문제`, go: '문제 풀기' },
    ],
  },
];
// "40문제"처럼 적힌 숫자만 더해 문제 수를 보여 준다
const count = groups => groups.flatMap(g => g.items).reduce((n, i) => n + (/(\d+)문제/.exec(i.m || '')?.[1] * 1 || 0), 0);

export default function WebPage() {
  return <div className="fade-in">
    <HubHeader eyebrow="웹 개발" title="웹 개발" desc="신입 백엔드 공부를 개념 읽기, 개념 문제, 실무형 문제 순서로 해 보세요."
      stats={[{ value: count(GROUPS), label: '문제' }, { value: PRACTICAL_QUESTIONS.length, label: '실무형 문제' }, { value: WEB_ESSENTIALS.items.length, label: '웹노트 문답' }]} />
    {GROUPS.map(g => <HubSection key={g.title} title={g.title} note={g.note}>
      {g.items.map(i => <HubCard key={i.to} to={i.to} icon={i.icon} badge={i.m} title={i.t} topics={i.d} desc={i.desc} go={i.go} />)}
    </HubSection>)}
  </div>;
}
