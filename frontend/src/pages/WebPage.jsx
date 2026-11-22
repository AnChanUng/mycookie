import { Link } from 'react-router-dom';

// 웹 개발 공부 첫 화면. 분야(백엔드 · 웹 기본기)별로 문제집과 정리 글을 고른다
const GROUPS = [
  {
    title: '백엔드',
    items: [
      { to: '/web/spring-practice', t: 'Spring 핵심 실전', d: 'IoC·DI · Boot · AOP · MVC · MyBatis · Security', m: '4지선다 53문제 · 정답과 해설' },
      { to: '/web/spring', t: 'Spring · JPA', d: '스프링 코어 · 웹 MVC · JPA · 부트', m: '60문제 · 풀이 기록 저장' },
      { to: '/ssafy/ssafydb', t: 'DB · Servlet · JSP', d: 'SQL · 트랜잭션 · 정규화 · 인덱스 · Servlet 생명주기', m: '30문제 · 정답과 해설' },
    ],
  },
  {
    title: '웹 기본기',
    items: [
      { to: '/web-essentials', t: '웹 필수지식', d: 'HTTP · 쿠키와 세션 · CORS · 인증 등 핵심 질문', m: '57문답 · 모범답안' },
      { to: '/tech-blogs', t: '기업 기술 블로그', d: '실무에서 쓰는 기술을 회사 블로그로 읽기', m: '바로가기 모음' },
    ],
  },
];

export default function WebPage() {
  return <div className="fade-in">
    <div className="page-header">
      <Link to="/" className="back-link">← 홈으로</Link>
      <h1>웹 개발</h1>
      <p>백엔드 문제풀이와 웹 필수지식을 한곳에서 공부하세요.</p>
    </div>
    {GROUPS.map(g => <section key={g.title} className="web-group" aria-label={g.title}>
      <h2 className="web-group-title">{g.title}</h2>
      <div className="exam-sections">
        {g.items.map(i => <Link key={i.to} to={i.to} className="exam-section">
          <span className="t">{i.t}</span>
          <span className="d">{i.d}</span>
          <span className="d">{i.m} →</span>
        </Link>)}
      </div>
    </section>)}
  </div>;
}
