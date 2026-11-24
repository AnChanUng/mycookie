import { HubCard, HubHeader, HubSection } from '../components/Hub';

// 웹 개발 공부 첫 화면. 분야(백엔드 · 웹 기본기)별로 문제집과 정리 글을 고른다
const GROUPS = [
  {
    title: '백엔드',
    items: [
      { to: '/web/java', icon: '☕', t: 'Java 핵심 문법', d: '언어 기초 · 객체 · 컬렉션 · 예외와 표준 API', m: '40문제' },
      { to: '/web/spring-practice', icon: '🌱', t: 'Spring 핵심 실전', d: 'IoC·DI · Boot · AOP · MVC · MyBatis · Security', m: '53문제' },
      { to: '/web/spring', icon: '🍃', t: 'Spring · JPA', d: '스프링 코어 · 웹 MVC · JPA · 부트', m: '60문제' },
      { to: '/ssafy/ssafydb', icon: '🗄️', t: 'DB · Servlet · JSP', d: 'SQL · 트랜잭션 · 정규화 · 인덱스 · Servlet 생명주기', m: '30문제' },
    ],
  },
  {
    title: '웹 기본기',
    items: [
      { to: '/web-essentials', icon: '🌐', t: '웹노트', d: 'HTTP · 쿠키와 세션 · CORS · 인증 등 핵심 질문', m: '57문답', go: '읽으러 가기' },
      { to: '/tech-blogs', icon: '📰', t: '기업 기술 블로그', desc: '실무에서 쓰는 기술을 회사 블로그로 읽어요.', go: '블로그 모음 보기' },
    ],
  },
];
// "40문제"처럼 적힌 숫자만 더해 백엔드 문제 수를 보여 준다
const count = items => items.reduce((n, i) => n + (/(\d+)문제/.exec(i.m || '')?.[1] * 1 || 0), 0);

export default function WebPage() {
  return <div className="fade-in">
    <HubHeader eyebrow="웹 개발" title="웹 개발" desc="백엔드 문제풀이와 웹 필수지식을 한곳에서 공부하세요."
      stats={[{ value: count(GROUPS[0].items), label: '백엔드 문제' }, { value: GROUPS[0].items.length, label: '백엔드 문제집' }, { value: 57, label: '웹노트 문답' }]} />
    {GROUPS.map(g => <HubSection key={g.title} title={g.title}>
      {g.items.map(i => <HubCard key={i.to} to={i.to} icon={i.icon} badge={i.m} title={i.t} topics={i.d} desc={i.desc} go={i.go} />)}
    </HubSection>)}
  </div>;
}
