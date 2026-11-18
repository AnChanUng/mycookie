import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompanyExam } from './ExamCompanyPage';
import RagAssistant from './RagAssistant';
import './CsNotesPage.css';

const AdminPage = lazy(() => import('./AdminPage'));

// 비공개 문제집 입구. 비밀번호는 저장소에 원문으로 두지 않고 해시만 비교한다.
// 화면 잠금일 뿐 서버 인증이 아니므로, 문제 데이터는 잠금을 푼 뒤에만 따로 불러와 공개 화면 번들과 분리한다.
const SALT = 'cs-study:private-chanung:';
const HASH = 'f213708a8ac885488c9d63259093a953f3820b9fed68fd452c10758ce8a285a4';
const STORE = 'private-chanung-unlocked';
const BASE = '/private/chanung';

async function sha256(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function readUnlocked() {
  try { return sessionStorage.getItem(STORE) === HASH; } catch { return false; }
}

export default function PrivateChanungPage() {
  const { id } = useParams();
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const trouble = id === 'trouble';
  const assistant = id === 'assistant';
  const patches = id === 'patch-notes';
  const admin = id === 'admin';

  useEffect(() => {
    if (!unlocked || data || trouble || assistant || patches || admin) return;
    let alive = true;
    import('../data/privateBanks')
      .then(m => { if (alive) setData(m); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, [unlocked, data, trouble, assistant, patches, admin]);

  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />;
  if (trouble) return <TroubleLog />;
  if (assistant) return <RagAssistant />;
  if (patches) return <PatchNotes />;
  if (admin) return <Suspense fallback={<p role="status">관리자 화면을 불러오는 중…</p>}><AdminPage back={{ to: BASE, label: '← 관리자 페이지' }} /></Suspense>;
  if (loadError) return <div className="fade-in"><p role="alert">문제집을 불러오지 못했습니다. 새로고침해 주세요.</p></div>;
  if (!data) return <div className="fade-in"><p role="status">문제집을 불러오는 중…</p></div>;

  if (id) {
    const found = data.findPrivateBank(id);
    if (!found) return <div className="fade-in"><p role="alert">찾을 수 없는 문제집입니다. <Link to={BASE}>비공개 문제집 목록</Link></p></div>;
    return <CompanyExam company={found.bank} back={{ to: BASE, label: '← 관리자 페이지' }} />;
  }
  return <PrivateList data={data} onLock={() => { try { sessionStorage.removeItem(STORE); } catch { /* 저장소를 못 쓰면 새로고침으로 잠긴다 */ } setUnlocked(false); }} />;
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

function Gate({ onUnlock }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const ok = (await sha256(SALT + value.trim())) === HASH;
    setBusy(false);
    if (!ok) { setError(true); setValue(''); return; }
    try { sessionStorage.setItem(STORE, HASH); } catch { /* 이번 화면에서만 열어 둔다 */ }
    onUnlock();
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>관리자 페이지</h1>
        <p>비밀번호를 입력해야 볼 수 있습니다.</p>
      </div>
      <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          id="private-password" type="password" inputMode="numeric" autoComplete="off" autoFocus
          value={value} onChange={e => { setValue(e.target.value); setError(false); }}
          placeholder="비밀번호" aria-label="비밀번호" aria-invalid={error} aria-describedby={error ? 'private-password-error' : undefined}
          style={{ padding: '10px 12px', fontSize: 16, minWidth: 0, flex: '1 1 160px', maxWidth: 240 }}
        />
        <button type="submit" className="exam-btn" disabled={busy || !value.trim()}>열기</button>
      </form>
      {error && <p id="private-password-error" role="alert" style={{ marginTop: 8 }}>비밀번호가 맞지 않습니다.</p>}
    </div>
  );
}

function PrivateList({ data, onLock }) {
  const [banksOpen, setBanksOpen] = useState(false);
  const bankCount = data.PRIVATE_GROUPS.reduce((n, g) => n + g.banks.length, 0);
  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>관리자 페이지</h1>
        <p>개발 기록과 운영 지표, 비공개 학습 자료를 모아 둔 곳입니다. 공개 메뉴에는 나오지 않습니다.</p>
        <button type="button" className="exam-btn" onClick={onLock}>잠그기</button>
      </div>
      <section style={{ marginTop: 24 }}>
        <div className="section-title">개발 기록</div>
        <div className="exam-company-grid">
          <Link to={`${BASE}/trouble`} className="exam-company-card">
            <span className="exam-company-abbr">LOG</span>
            <span className="exam-company-name">트러블슈팅 기록</span>
            <span className="exam-company-meta">개발하면서 겪은 기술 문제 · 원인 · 해결 · 측정 결과</span>
          </Link>
          <Link to={`${BASE}/admin`} className="exam-company-card">
            <span className="exam-company-abbr">ADMIN</span>
            <span className="exam-company-name">관리자 모니터링</span>
            <span className="exam-company-meta">이용 현황 · 풀이 · 방문자 · 보안 · 제보 · 채팅 · 계정 · 시스템</span>
          </Link>
          <Link to={`${BASE}/patch-notes`} className="exam-company-card">
            <span className="exam-company-abbr">NOTE</span>
            <span className="exam-company-name">개발 패치노트</span>
            <span className="exam-company-meta">버전별 새 기능 · 개선 · 수정 · 보안 · 인프라 변경</span>
          </Link>
          <Link to={`${BASE}/assistant`} className="exam-company-card">
            <span className="exam-company-abbr">RAG</span>
            <span className="exam-company-name">RAG 학습 도우미</span>
            <span className="exam-company-meta">학습 자료 근거로만 답하고, 근거 없는 질문은 거부</span>
          </Link>
        </div>
      </section>
      <section style={{ marginTop: 32 }}>
        <button type="button" className="exam-btn" aria-expanded={banksOpen} aria-controls="private-banks" onClick={() => setBanksOpen(o => !o)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', fontSize: 16 }}>
          <span><strong>비공개 문제집</strong> <span style={{ opacity: 0.7, fontWeight: 400 }}>· 복기 문제집 · SSAFY · 컴퓨터일반 {bankCount}개</span></span>
          <span aria-hidden="true">{banksOpen ? '접기 ▲' : '펼치기 ▼'}</span>
        </button>
        <div id="private-banks" hidden={!banksOpen}>
      {banksOpen && data.PRIVATE_GROUPS.map(group => (
        <section key={group.key} style={{ marginTop: 24 }}>
          <div className="section-title">{group.name}</div>
          <p className="exam-lede">{group.desc}</p>
          <div className="exam-company-grid">
            {group.banks.map(bank => (
              <Link key={data.privateBankId(group, bank)} to={`${BASE}/${data.privateBankId(group, bank)}`} className="exam-company-card">
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
      </section>
    </div>
  );
}
