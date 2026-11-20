import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { decodePrivateId, privatePath } from '../privatePath';
import { CompanyExam } from './ExamCompanyPage';
import RoleGate from '../components/RoleGate';
import './CsNotesPage.css';

// AWS · 현대오토에버 면접 복기 자료(다른 사람이 본 면접). 공개 메뉴에서 빼고 여기서만 연다
const OthersInterviews = lazy(() => import('./TechnicalInterviewPage'));

// 찬웅 전용 페이지(/private/chanung). OWNER 권한 계정으로 로그인해야 열린다(예전 화면 비밀번호 대신).
// 문제 데이터는 권한을 확인한 뒤에만 따로 불러와 공개 화면 번들과 분리한다
// 화면 안 링크는 알아보기 어려운 주소로 만든다(privatePath.js)
const BASE = privatePath();

export default function PrivateChanungPage() {
  return <RoleGate role="OWNER" nickname="쿠우키" title="찬웅 전용 페이지"><PrivateChanung /></RoleGate>;
}

function PrivateChanung() {
  // 주소에는 메뉴 이름을 base64url로 바꿔 둔다(/x/…/YWRtaW4 → admin)
  const { code } = useParams();
  const id = code ? decodePrivateId(code) : undefined;
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const trouble = id === 'trouble';
  const patches = id === 'patch-notes';
  const admin = id === 'admin';
  const banks = id === 'banks';
  const interviews = id === 'interviews';

  useEffect(() => {
    if (data || trouble || patches || admin || interviews) return;
    let alive = true;
    import('../data/privateBanks')
      .then(m => { if (alive) setData(m); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [data, trouble, patches, admin, interviews]);

  if (trouble) return <TroubleLog />;
  if (patches) return <PatchNotes />;
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
const PATCH_STATUS = { released: '배포됨', dev: '개발 중', wip: '작업 중' };
const PATCH_TYPE = { feature: '새 기능', improve: '개선', fix: '수정', security: '보안', infra: '인프라', docs: '문서' };

// 개발 패치노트. 데이터는 잠금을 푼 뒤에만 불러온다
function PatchNotes() {
  const [notes, setNotes] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    import('../data/patchNotes').then(m => { if (alive) setNotes(m.PATCH_NOTES); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  if (failed) return <div className="fade-in"><p role="alert">패치노트를 불러오지 못했습니다. 새로고침해 주세요.</p></div>;
  if (!notes) return <div className="fade-in"><p role="status">패치노트를 불러오는 중…</p></div>;
  const counts = notes.flatMap(n => n.items).reduce((m, i) => ({ ...m, [i.type]: (m[i.type] || 0) + 1 }), {});
  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to={BASE} className="back-link">← 관리자 페이지</Link>
        <h1>개발 패치노트</h1>
        <p>버전 {notes.length}개 · {Object.entries(PATCH_TYPE).filter(([k]) => counts[k]).map(([k, v]) => `${v} ${counts[k]}`).join(' · ')}</p>
      </div>
      {notes.map(n => (
        <article key={n.version} style={{ marginTop: 16, padding: '16px 18px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13, opacity: 0.8 }}>
            <strong>v{n.version}</strong>
            <time dateTime={n.date}>{n.date}</time>
            <span className={`exam-tag${n.status === 'released' ? '' : ' soon'}`}>{PATCH_STATUS[n.status] || n.status}</span>
          </div>
          <h2 style={{ fontSize: 18, margin: '8px 0 6px' }}>{n.title}</h2>
          {n.summary && <p style={{ margin: '0 0 10px', lineHeight: 1.6, wordBreak: 'keep-all' }}>{n.summary}</p>}
          <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
            {n.items.map((it, i) => (
              <li key={i} style={{ lineHeight: 1.6, wordBreak: 'keep-all' }}>
                <span className="exam-tag" style={{ marginRight: 6 }}>{PATCH_TYPE[it.type] || it.type}</span>{it.text}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

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
    <div className="fade-in">
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
          <Link to="/admin" className="exam-company-card">
            <span className="exam-company-abbr">ADMIN</span>
            <span className="exam-company-name">관리자 모니터링</span>
            <span className="exam-company-meta">이용 현황 · 풀이 · 방문자 · 보안 · 제보 · 채팅 · 계정 · 시스템</span>
          </Link>
          <Link to={privatePath("patch-notes")} className="exam-company-card">
            <span className="exam-company-abbr">NOTE</span>
            <span className="exam-company-name">개발 패치노트</span>
            <span className="exam-company-meta">버전별 새 기능 · 개선 · 수정 · 보안 · 인프라 변경</span>
          </Link>
          <Link to={privatePath("interviews")} className="exam-company-card">
            <span className="exam-company-abbr">면접</span>
            <span className="exam-company-name">다른 사람 면접</span>
            <span className="exam-company-meta">AWS · 현대오토에버 면접 복기 질문과 예시 답변 · 꼬리질문</span>
          </Link>
        </div>
      </section>
      <section style={{ marginTop: 32 }}>
        <div className="section-title">학습 자료</div>
        <div className="exam-company-grid">
          <Link to={privatePath('banks')} className="exam-company-card">
            <span className="exam-company-abbr">문제집</span>
            <span className="exam-company-name">비공개 문제집</span>
            <span className="exam-company-meta">복기 문제집 · SSAFY · 컴퓨터일반 {bankCount}개</span>
          </Link>
        </div>
      </section>
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
          <p className="exam-lede">{group.desc}</p>
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
