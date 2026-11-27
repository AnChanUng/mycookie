import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { decodePrivateId, privatePath } from '../privatePath';
import { CompanyExam } from './ExamCompanyPage';
import RoleGate from '../components/RoleGate';
import './CsNotesPage.css';
import './PrivateChanungPage.css';

// AWS · 현대오토에버 면접 복기 자료(다른 사람이 본 면접). 공개 메뉴에서 빼고 여기서만 연다
const OthersInterviews = lazy(() => import('./TechnicalInterviewPage'));
// 이력서 면접: 이력서·포트폴리오에서 뽑은 주제별 1~4단계 꼬리질문과 모범답안. 질문은 서버(OWNER 권한)에만 저장한다
// 예전 포트폴리오 면접은 이 화면으로 합쳤다(옛 주소로 들어오면 이 화면을 연다)
const TechInterview = lazy(() => import('./TechInterviewPage'));

// 찬웅 전용 페이지(/private/chanung). 서버가 OWNER 권한을 확인한 계정으로 로그인해야 열린다.
// 문제 데이터는 권한을 확인한 뒤에만 따로 불러와 공개 화면 번들과 분리한다
// 화면 안 링크는 알아보기 어려운 주소로 만든다(privatePath.js)
const BASE = privatePath();

// 오른쪽 빈 곳에 두는 블로그 글 바로가기(코딩테스트부터 순서대로)
const BLOG_LINKS = [
  ['코딩테스트 오답노트', 'https://cookie.tistory.com/195'],
  ['코딩테스트 문법', 'https://cookie.tistory.com/166'],
  ['네트워크', 'https://cookie.tistory.com/238'],
  ['운영체제', 'https://cookie.tistory.com/234'],
  ['AWS', 'https://cookie.tistory.com/227'],
];
// 이력서에 링크로 건 블로그 글. 이력서가 바뀌면 여기도 같이 맞춘다
const RESUME_BLOG_LINKS = [
  ['개발 워크플로 자동화와 장애 알림', 'https://cookie.tistory.com/247'],
  ['신입 개발자 온보딩', 'https://cookie.tistory.com/256'],
  ['홈서버 구축과 DB 이전', 'https://cookie.tistory.com/258'],
];

export default function PrivateChanungPage() {
  return <RoleGate role="OWNER" title="찬웅 전용 페이지"><PrivateChanung /></RoleGate>;
}

function PrivateChanung() {
  // 주소에는 메뉴 이름을 base64url로 바꿔 둔다(/x/…/YWRtaW4 → admin)
  const { code } = useParams();
  const id = code ? decodePrivateId(code) : undefined;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const trouble = id === 'trouble';
  const admin = id === 'admin';
  const banks = id === 'banks';
  const interviews = id === 'interviews';
  const techInterview = id === 'tech-interview';
  const portfolioInterview = id === 'portfolio-interview';
  const webnoteInterview = id === 'webnote-interview';
  // 포트폴리오: 기술 항목마다 1~4단계 꼬리질문. 질문은 서버(OWNER 권한)에만 저장한다
  const portfolioTech = id === 'portfolio-tech';

  useEffect(() => {
    if (data || trouble || admin || interviews || techInterview || portfolioInterview || webnoteInterview || portfolioTech) return;
    let alive = true;
    import('../data/privateBanks')
      .then(m => { if (alive) setData(m); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [data, trouble, admin, interviews, techInterview, portfolioInterview, webnoteInterview, portfolioTech]);

  if (trouble) return <TroubleLog />;
  if (techInterview) return <Suspense fallback={<p role="status">이력서 면접을 불러오는 중…</p>}><TechInterview back={{ to: BASE, label: '← 찬웅 전용 페이지' }} title="이력서 면접"
    intro="이력서와 포트폴리오에 적은 경험마다 기본 질문에서 4단계 꼬리질문까지 이어서 연습해요. 모범답안은 첫 줄 결론, 상황·행동·결과, 마무리 순서예요." /></Suspense>;
  if (portfolioInterview) return <Navigate to={privatePath('tech-interview')} replace />;
  if (webnoteInterview) return <Suspense fallback={<p role="status">웹노트 질문지를 불러오는 중…</p>}><TechInterview back={{ to: BASE, label: '← 찬웅 전용 페이지' }} doc="webnote-interview" title="웹노트 질문지"
    depthNames={{ 1: 'Lv.1 · 기초', 2: 'Lv.2 · 실무', 3: 'Lv.3 · 심화' }}
    intro="웹노트 문답과 백엔드 실무 주제를 Lv.1 기초, Lv.2 실무, Lv.3 심화로 나눠 연습해요. 왜 썼고, 어떤 상황에서 겪었고, 어떻게 해결했는지로 답해 보세요." /></Suspense>;
  if (portfolioTech) return <Suspense fallback={<p role="status">포트폴리오 질문을 불러오는 중…</p>}><TechInterview back={{ to: BASE, label: '← 찬웅 전용 페이지' }} doc="portfolio-tech" recording={false} title="포트폴리오"
    intro="이력서에 적은 기술마다 1단계 개념에서 4단계 내부 동작·장애 상황까지 꼬리질문으로 이어서 연습해요. 모범답안 아래에 근거 공식 문서 링크가 있어요." /></Suspense>;
  if (interviews) return <Suspense fallback={<p role="status">면접 자료를 불러오는 중…</p>}><OthersInterviews back={{ to: BASE, label: '← 찬웅 전용 페이지' }} /></Suspense>;
  // 관리자 모니터링은 /admin(관리자 계정)으로 옮겼다
  if (admin) return <Navigate to="/admin" replace />;
  if (loadError) return <div className="fade-in"><p role="alert">문제집을 불러오지 못했습니다. 새로고침해 주세요.</p></div>;
  if (!data) return <div className="fade-in"><p role="status">문제집을 불러오는 중…</p></div>;

  if (banks) return <PrivateBanks data={data} />;
  if (id) {
    const found = data.findPrivateBank(id);
    if (!found) return <div className="fade-in"><p role="alert">찾을 수 없는 문제집입니다. <Link to={privatePath('banks')}>비공개 문제집 목록</Link></p></div>;
    return <CompanyExam company={found.bank} back={{ to: privatePath('banks'), label: '← 비공개 문제집' }} />;
  }
  return <PrivateList data={data} />;
}

const STATUS = { solved: '해결', open: '진행 중', note: '관찰' };
// 개발하면서 겪은 기술 문제 기록. 데이터는 잠금을 푼 뒤에만 불러온다.
// 기술면접 노트처럼 왼쪽에 분야별 목록, 오른쪽에 분야별 본문을 둔다
const troubleGroup = area => area.split(' · ')[0];

function TroubleLog() {
  const [items, setItems] = useState(null);
  const [group, setGroup] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    import('../data/troubleLog').then(m => { if (alive) setItems(m.TROUBLES); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  if (failed) return <div className="fade-in"><p role="alert">기록을 불러오지 못했습니다. 새로고침해 주세요.</p></div>;
  if (!items) return <div className="fade-in"><p role="status">기록을 불러오는 중…</p></div>;
  const groups = [...new Set(items.map(t => troubleGroup(t.area)))];
  const q = query.trim().toLowerCase();
  const visible = items.filter(t => (!group || troubleGroup(t.area) === group)
    && (!q || [t.title, t.area, t.symptom, t.cause, t.fix, t.result, t.lesson].some(v => v?.toLowerCase().includes(q))));
  const open = items.filter(t => t.status === 'open').length;
  const choose = id => {
    setSelected(id);
    document.getElementById(`trouble-${id}`)?.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  return (
    <div className="cs-notes fade-in">
      <header className="notes-heading">
        <div>
          <Link to={BASE}>← 관리자 페이지</Link>
          <h1>트러블슈팅 기록</h1>
          <p>개발하면서 실제로 겪은 기술 문제와 원인, 해결, 측정 결과 · 전체 {items.length}건 · 해결 {items.length - open}건 · 진행 중 {open}건</p>
        </div>
      </header>
      <div className="notes-layout">
        <aside className="notes-index">
          <div className="notes-filters">
            <input type="search" aria-label="기록 검색" value={query} onChange={e => setQuery(e.target.value)} placeholder="기록 검색…" />
            <select aria-label="분야" value={group} onChange={e => setGroup(e.target.value)}>
              <option value="">전체 분야</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <nav className="notes-questions" aria-label="트러블슈팅 목록">
            {groups.map(g => {
              const list = visible.filter(t => troubleGroup(t.area) === g);
              if (!list.length) return null;
              return <section key={g}><h2>{g}<small>{list.length}건</small></h2><ul>{list.map(t => (
                <li key={t.id} className={selected === t.id ? 'is-selected' : ''}>
                  <button type="button" aria-current={selected === t.id ? 'true' : undefined} onClick={() => choose(t.id)}>
                    {t.status === 'open' && <span className="exam-tag soon" style={{ marginRight: 6 }}>진행 중</span>}{t.title}
                  </button>
                </li>
              ))}</ul></section>;
            })}
            {!visible.length && <p className="notes-empty">조건에 맞는 기록이 없습니다.</p>}
          </nav>
        </aside>
        <div className="notes-content">
          {groups.map(g => {
            const list = visible.filter(t => troubleGroup(t.area) === g);
            if (!list.length) return null;
            return <section className="notes-subject" key={g} aria-labelledby={`trouble-group-${g}`}>
              <h2 id={`trouble-group-${g}`} className="notes-subject-title">{g}<small>{list.length}건</small></h2>
              {list.map(t => (
                <article key={t.id} id={`trouble-${t.id}`} className="notes-detail-card" aria-label={t.title}>
                  <div className="notes-detail-top">
                    <span><time dateTime={t.date}>{t.date}</time> · {t.area}</span>
                    <span className={`exam-tag${t.status === 'open' ? ' soon' : ''}`}>{STATUS[t.status] || t.status}</span>
                  </div>
                  <h3 className="notes-question">{t.title}</h3>
                  <dl style={{ margin: 0, display: 'grid', gap: 10, lineHeight: 1.65 }}>
                    {[['증상', t.symptom], ['원인', t.cause], ['해결', t.fix], ['결과', t.result], ['측정 환경', t.env], ['배운 점', t.lesson]]
                      .filter(([, v]) => v)
                      .map(([k, v]) => (
                        <div key={k}>
                          <dt style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-blue)' }}>{k}</dt>
                          <dd style={{ margin: 0, wordBreak: 'keep-all' }}>{v}</dd>
                        </div>
                      ))}
                    {!!t.links?.length && <div>
                      <dt style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent-blue)' }}>관련 자료</dt>
                      <dd style={{ margin: 0 }}>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'grid', gap: 4 }}>
                          {t.links.map(l => <li key={l.url}>{l.url.startsWith('/')
                            ? <Link to={l.url}>{l.label}</Link>
                            : <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label} ↗</a>}</li>)}
                        </ul>
                      </dd>
                    </div>}
                  </dl>
                </article>
              ))}
            </section>;
          })}
          {!visible.length && <div className="notes-empty"><h2>표시할 기록이 없습니다.</h2><p>검색어나 분야를 바꿔 보세요.</p></div>}
        </div>
      </div>
    </div>
  );
}

function PrivateList({ data }) {
  const bankCount = data.PRIVATE_GROUPS.reduce((n, g) => n + g.banks.length, 0);
  return (
    <div className="fade-in private-layout">
      <div className="private-main">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>[취업] 안찬웅</h1>
        <p>면접 준비와 취업 관련 자료를 정리하는 개인 공간입니다.</p>
      </div>
      <section style={{ marginTop: 24 }} aria-label="취업 준비">
        <div className="section-title">취업 준비</div>
        <div className="exam-company-grid">
          <Link to="/chanung/deloitte" className="exam-company-card">
            <span className="exam-company-abbr">면접</span>
            <span className="exam-company-name">면접준비하기</span>
            <span className="exam-company-meta">딜로이트 면접 예상질문 · 내 답변 · 녹음 연습</span>
          </Link>
          <Link to={privatePath("webnote-interview")} className="exam-company-card">
            <span className="exam-company-abbr">웹노트</span>
            <span className="exam-company-name">웹노트 질문지</span>
            <span className="exam-company-meta">웹노트 문답 + 백엔드 실무 주제 · Lv.1~3</span>
          </Link>
          <Link to={privatePath("tech-interview")} className="exam-company-card">
            <span className="exam-company-abbr">이력서</span>
            <span className="exam-company-name">이력서 면접</span>
            <span className="exam-company-meta">이력서 · 포트폴리오 기반 꼬리질문 1~4단계 · 기술 · 인성 · 모범답안</span>
          </Link>
          <Link to={privatePath("portfolio-tech")} className="exam-company-card">
            <span className="exam-company-abbr">기술</span>
            <span className="exam-company-name">포트폴리오</span>
            <span className="exam-company-meta">이력서 기술 항목별 꼬리질문 1~4단계 · 모범답안 · 공식 문서 근거</span>
          </Link>
        </div>
      </section>
      <section style={{ marginTop: 24 }}>
        <div className="section-title">개발 기록</div>
        <div className="exam-company-grid">
          <Link to={privatePath("trouble")} className="exam-company-card">
            <span className="exam-company-abbr">LOG</span>
            <span className="exam-company-name">트러블슈팅 기록</span>
            <span className="exam-company-meta">개발하면서 겪은 기술 문제 · 원인 · 해결 · 측정 결과</span>
          </Link>
          <Link to={privatePath('banks')} className="exam-company-card">
            <span className="exam-company-abbr">문제집</span>
            <span className="exam-company-name">비공개 문제집</span>
            <span className="exam-company-meta">복기 문제집 · 컴퓨터일반 {bankCount}개</span>
          </Link>
          <Link to={privatePath("interviews")} className="exam-company-card">
            <span className="exam-company-abbr">면접</span>
            <span className="exam-company-name">다른 사람 면접</span>
            <span className="exam-company-meta">AWS · 현대오토에버 면접 복기 질문과 예시 답변 · 꼬리질문</span>
          </Link>
        </div>
      </section>
      </div>
      <nav className="private-blog" aria-label="내 블로그 바로가기">
        <span className="private-blog-title">블로그 바로가기</span>
        {BLOG_LINKS.map(([name, url]) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer">{name}<span aria-hidden="true">↗</span></a>
        ))}
        <span className="private-blog-title private-blog-sub">이력서 블로그</span>
        {RESUME_BLOG_LINKS.map(([name, url]) => (
          <a key={url} href={url} target="_blank" rel="noopener noreferrer">{name}<span aria-hidden="true">↗</span></a>
        ))}
      </nav>
    </div>
  );
}

// 비공개 문제집 목록(첫 화면의 카드 한 칸에서 들어온다)
function PrivateBanks({ data }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to={BASE} className="back-link">← 찬웅 전용 페이지</Link>
        <h1>비공개 문제집</h1>
      </div>
      {data.PRIVATE_GROUPS.map(group => (
        <section key={group.key} style={{ marginTop: 24 }}>
          <div className="section-title">{group.name}</div>
          {group.desc && <p className="exam-lede">{group.desc}</p>}
          <div className="exam-company-grid">
            {group.banks.map(bank => (
              <Link key={data.privateBankId(group, bank)} to={privatePath(data.privateBankId(group, bank))} className="exam-company-card">
                <span className="exam-company-abbr">{bank.abbr}</span>
                <span className="exam-company-name">{bank.name}</span>
                {bank.source?.label && <span className="exam-company-source">{bank.source.label}</span>}
                <span className="exam-company-meta">{bank.meta}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
