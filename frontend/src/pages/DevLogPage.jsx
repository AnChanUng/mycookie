import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import OnboardingTabs from '../components/OnboardingTabs';
import { DEV_LOG } from '../data/devLog';
import './OnboardingPage.css';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const label = date => {
  const [y, m, d] = date.split('-').map(Number);
  return { short: `${m}.${d}`, long: `${y}년 ${m}월 ${d}일 (${WEEK[new Date(y, m - 1, d).getDay()]})` };
};
const newId = () => Math.random().toString(36).slice(2, 10);
const todayKst = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
const nextDay = date => new Date(Date.parse(`${date}T00:00:00Z`) + 86400000).toISOString().slice(0, 10);
const auth = () => (account()?.token ? { Authorization: `Bearer ${account().token}` } : {});
// 서버가 보낸 문구가 있으면 그대로, 없으면(서버까지 못 닿음, 시간 초과, 재시작 중) 원인을 알 수 있게 상태를 붙인다
const failure = (error, what) => error?.response?.data?.error
  || `${what} 못했어요. 잠시 후 다시 시도해 주세요. (${error?.response?.status ? `오류 ${error.response.status}` : error?.code === 'ECONNABORTED' ? '시간 초과' : '서버에 연결하지 못함'})`;
const leaves = items => items.flatMap(i => (i.sub?.length ? i.sub : [i]));
const isComplete = items => leaves(items).length > 0 && leaves(items).every(l => l.done);

// 코드에 적어 둔 첫 일지(devLog.js)를 서버 형식으로 바꾼다. 서버에 같은 날짜가 없을 때만 보인다
const fromSeed = e => ({
  date: e.date, title: e.title, owner: e.owner || '', version: null, seed: true,
  items: e.items.map((it, i) => ({ id: `s${i}`, text: it.text, note: it.note || '', done: false,
    sub: (it.sub || []).map((s, j) => ({ id: `s${i}-${j}`, text: s.text, note: s.note || '', done: false })) })),
});

// 개발 일지. 왼쪽 날짜를 누르면 그날 할 일이 열린다(?d=2026-11-20으로 바로 열기).
// 체크하자마자 저장되고(팀 내부 페이지라 로그인 없이도 된다), "수정"으로 제목과 할 일을 고치거나 "새 날짜"로 하루를 더할 수 있다.
export default function DevLogPage() {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, offline: false, canEdit: false, entries: DEV_LOG.map(fromSeed) });
  const [draft, setDraft] = useState(null);   // 수정 중인 하루(새 날짜 포함)
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/devlog', { headers: auth(), timeout: 15000 });
      const saved = Array.isArray(data?.entries) ? data.entries : [];
      const seeds = DEV_LOG.filter(s => !saved.some(e => e.date === s.date)).map(fromSeed);
      setState({ loading: false, offline: false, canEdit: !!data?.canEdit, entries: [...saved, ...seeds].sort((a, b) => b.date.localeCompare(a.date)) });
    } catch {
      setState(s => ({ ...s, loading: false, offline: true, canEdit: false }));
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const entries = state.entries;
  const current = draft || entries.find(e => e.date === params.get('d')) || entries[0];
  const goals = DEV_LOG.find(e => e.date === current?.date)?.goals;

  async function save(entry, { check = false, wasComplete = false } = {}) {
    setBusy(true); setMessage('');
    try {
      const { data } = await api.put(`/devlog/${entry.date}`, { title: entry.title, owner: entry.owner, items: entry.items, version: entry.version }, { headers: auth(), timeout: 15000 });
      setState(s => ({ ...s, entries: [data, ...s.entries.filter(e => e.date !== data.date)].sort((a, b) => b.date.localeCompare(a.date)) }));
      setDraft(null);
      setParams({ d: data.date }, { replace: true });
      setMessage(check ? (data.complete && !wasComplete ? '오늘 할 일을 모두 끝냈어요!' : '') : '저장했어요.');
    } catch (error) {
      setMessage(failure(error, '저장하지'));
      if (error?.response?.status === 409) load();
    } finally { setBusy(false); }
  }

  function toggle(itemId, subId) {
    const items = current.items.map(it => it.id !== itemId ? it
      : subId ? { ...it, sub: it.sub.map(s => s.id === subId ? { ...s, done: !s.done } : s) } : { ...it, done: !it.done });
    save({ ...current, items }, { check: true, wasComplete: isComplete(current.items) });
  }

  async function remove() {
    if (!window.confirm(`${label(current.date).long} 일지를 지울까요?`)) return;
    setBusy(true);
    try { await api.delete(`/devlog/${current.date}`, { headers: auth() }); setParams({}, { replace: true }); await load(); setMessage('지웠어요.'); }
    catch (error) { setMessage(failure(error, '지우지')); }
    finally { setBusy(false); }
  }

  // 오늘이 비어 있으면 오늘, 이미 있으면 가장 최근 날짜의 다음 날로 시작한다(날짜는 바꿀 수 있다)
  const startNew = () => {
    const taken = new Set(entries.map(e => e.date));
    let date = todayKst();
    if (taken.has(date)) date = nextDay(entries.map(e => e.date).sort().at(-1));
    setMessage('');
    setDraft({ date, title: `개발 ${entries.length + 1}일차`, owner: '', version: null, isNew: true, items: [{ id: newId(), text: '', note: '', done: false, sub: [] }] });
  };
  const saveDraft = () => {
    if (draft.isNew && entries.some(e => e.date === draft.date)) { setMessage('이미 일지가 있는 날짜예요. 다른 날짜를 고르거나 그날 일지를 수정해 주세요.'); return; }
    save(draft);
  };

  return (
    <div className="ob">
      <header className="ob-hero ob-hero--slim">
        <OnboardingTabs />
        <p className="ob-eyebrow">나의쿠키</p>
        <h1>개발 일지</h1>
        <p className="ob-lead">날마다 정한 할 일과 메모를 남깁니다. 날짜를 누르면 그날 기록이 열리고, 끝낸 일은 체크해 주세요.</p>
      </header>

      <div className="dl">
        <nav className="dl-dates" aria-label="날짜">
          {state.canEdit && <button type="button" className="dl-new" onClick={startNew} disabled={busy || !!draft}><b>+ 새 날짜</b><small>오늘 할 일 적기</small></button>}
          {entries.map(e => {
            const l = label(e.date), on = !draft && e === current;
            return <button key={e.date} type="button" className={on ? 'on' : ''} aria-current={on ? 'true' : undefined}
              onClick={() => { setDraft(null); setMessage(''); setParams({ d: e.date }, { replace: true }); }}>
              <b>{l.short}{isComplete(e.items) && <span className="dl-done-mark" aria-label="완료"> ✓</span>}</b><small>{e.title}</small>
            </button>;
          })}
        </nav>

        {current && (draft
          ? <Editor draft={draft} setDraft={setDraft} busy={busy} onCancel={() => { setDraft(null); setMessage(''); }} onSave={saveDraft} message={message} />
          : <article className="dl-entry" aria-labelledby="dl-title">
            <div className="dl-head">
              <div>
                <p className="dl-meta">{label(current.date).long}{current.owner && <> · 담당 <b>{current.owner}</b></>}</p>
                <h2 id="dl-title">{current.title}{isComplete(current.items) && <span className="dl-badge">완료</span>}</h2>
              </div>
              {state.canEdit && <div className="dl-tools">
                <button type="button" className="dl-goal-btn" disabled={busy} onClick={() => { setMessage(''); setDraft(structuredClone(current)); }}>수정</button>
                {!current.seed && <button type="button" className="dl-goal-btn" disabled={busy} onClick={remove}>지우기</button>}
              </div>}
            </div>
            <Progress items={current.items} />
            <ol className="dl-items">
              {current.items.map(item => <li key={item.id}>
                {item.sub?.length ? <b>{item.text}</b> : <Check item={item} canEdit={state.canEdit} busy={busy} onToggle={() => toggle(item.id)} strong />}
                {item.note && <p>{item.note}</p>}
                {!!item.sub?.length && <ol className="dl-sub">
                  {item.sub.map(s => <li key={s.id}>
                    <div><Check item={s} canEdit={state.canEdit} busy={busy} onToggle={() => toggle(item.id, s.id)} />{s.note && <p>{s.note}</p>}</div>
                  </li>)}
                </ol>}
              </li>)}
            </ol>
            {message && <p className="dl-goals-lead" role="status">{message}</p>}
            {state.offline && <p className="dl-hint">지금은 서버에 연결하지 못해 저장된 기록 대신 처음 적어 둔 내용을 보여 드려요. 체크와 수정은 연결된 뒤에 할 수 있어요.</p>}
            {goals && <GoalRanking key={current.date} date={current.date} owner={current.owner} goals={goals} />}
          </article>)}
      </div>
    </div>
  );
}

function Progress({ items }) {
  const all = leaves(items), done = all.filter(l => l.done).length;
  if (!all.length) return null;
  return <div className="dl-progress" aria-label={`할 일 ${all.length}개 중 ${done}개 완료`}>
    <span><i style={{ width: `${Math.round(done / all.length * 100)}%` }} /></span><small>{done} / {all.length} 완료</small>
  </div>;
}

function Check({ item, canEdit, busy, onToggle, strong }) {
  const Text = strong ? 'b' : 'span';
  return <label className={`dl-check${item.done ? ' done' : ''}${canEdit ? '' : ' readonly'}`}>
    <input type="checkbox" checked={!!item.done} disabled={!canEdit || busy} onChange={onToggle} />
    <Text>{item.text}</Text>
  </label>;
}

// 하루치 수정: 날짜(새 날짜일 때만), 제목, 담당, 할 일과 하위 항목, 메모
function Editor({ draft, setDraft, busy, onCancel, onSave, message }) {
  const set = patch => setDraft(d => ({ ...d, ...patch }));
  const setItem = (id, patch) => set({ items: draft.items.map(it => it.id === id ? { ...it, ...patch } : it) });
  const setSub = (id, sid, patch) => setItem(id, { sub: draft.items.find(it => it.id === id).sub.map(s => s.id === sid ? { ...s, ...patch } : s) });
  const filled = draft.title.trim() && draft.items.every(it => it.text.trim() && (it.sub || []).every(s => s.text.trim()));
  return <form className="dl-entry dl-editor" onSubmit={e => { e.preventDefault(); onSave(); }} aria-label="개발 일지 수정">
    <div className="dl-edit-row">
      <label>날짜<input type="date" value={draft.date} disabled={!draft.isNew} required onChange={e => set({ date: e.target.value })} /></label>
      <label>담당<input value={draft.owner || ''} maxLength={40} placeholder="예: 보민" onChange={e => set({ owner: e.target.value })} /></label>
    </div>
    <label className="dl-edit-title">제목<input value={draft.title} maxLength={80} required onChange={e => set({ title: e.target.value })} /></label>
    <ol className="dl-edit-items">
      {draft.items.map((it, i) => <li key={it.id}>
        <div className="dl-edit-line">
          <span className="dl-no">{i + 1}</span>
          <input aria-label={`할 일 ${i + 1}`} value={it.text} maxLength={200} placeholder="할 일" required onChange={e => setItem(it.id, { text: e.target.value })} />
          <button type="button" className="dl-x" aria-label={`할 일 ${i + 1} 지우기`} onClick={() => set({ items: draft.items.filter(x => x.id !== it.id) })}>✕</button>
        </div>
        <textarea aria-label={`할 일 ${i + 1} 메모`} rows={2} maxLength={1000} placeholder="메모(선택)" value={it.note || ''} onChange={e => setItem(it.id, { note: e.target.value })} />
        {(it.sub || []).map((s, j) => <div key={s.id} className="dl-edit-sub">
          <div className="dl-edit-line">
            <span className="dl-no">{i + 1}.{j + 1}</span>
            <input aria-label={`할 일 ${i + 1}.${j + 1}`} value={s.text} maxLength={200} placeholder="하위 항목" required onChange={e => setSub(it.id, s.id, { text: e.target.value })} />
            <button type="button" className="dl-x" aria-label={`할 일 ${i + 1}.${j + 1} 지우기`} onClick={() => setItem(it.id, { sub: it.sub.filter(x => x.id !== s.id) })}>✕</button>
          </div>
          <textarea aria-label={`할 일 ${i + 1}.${j + 1} 메모`} rows={2} maxLength={1000} placeholder="메모(선택)" value={s.note || ''} onChange={e => setSub(it.id, s.id, { note: e.target.value })} />
        </div>)}
        <button type="button" className="dl-add sub" onClick={() => setItem(it.id, { sub: [...(it.sub || []), { id: newId(), text: '', note: '', done: false }] })}>+ 하위 항목</button>
      </li>)}
    </ol>
    <button type="button" className="dl-add" disabled={draft.items.length >= 30} onClick={() => set({ items: [...draft.items, { id: newId(), text: '', note: '', done: false, sub: [] }] })}>+ 할 일 추가</button>
    {message && <p className="dl-goals-lead" role="alert">{message}</p>}
    <div className="dl-goal-actions">
      <span />
      <button type="button" className="dl-goal-btn" onClick={onCancel} disabled={busy}>취소</button>
      <button className="dl-goal-btn primary" disabled={busy || !filled}>{busy ? '저장하는 중…' : '저장'}</button>
    </div>
  </form>;
}

// 목표 우선순위 매기기. 누른 순서대로 1, 2, 3…이 붙고, 다시 누르면 빠진다. 순서는 이 브라우저에만 저장한다
const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
function GoalRanking({ date, owner, goals }) {
  const storeKey = `devlog:goals:${date}`;
  const known = new Set(goals.list.map(g => g.key));
  const [order, setOrder] = useState(() => read(storeKey).filter(k => known.has(k)));
  const [copied, setCopied] = useState('');
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(order)); } catch { /* 저장 못 해도 화면은 동작 */ } }, [storeKey, order]);
  const toggle = key => { setCopied(''); setOrder(o => o.includes(key) ? o.filter(k => k !== key) : [...o, key]); };
  const done = order.length === goals.list.length;
  const result = `${owner ? owner + '의 ' : ''}나의쿠키 목표 우선순위\n` + order.map((k, i) => `${i + 1}. ${goals.list.find(g => g.key === k).text}`).join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(result); setCopied('복사했어요. Mattermost에 붙여 넣어 주세요.'); }
    catch { setCopied('복사하지 못했어요. 아래 순서를 직접 옮겨 적어 주세요.'); }
  }
  return <section className="dl-goals" aria-labelledby="dl-goals-title">
    <h3 id="dl-goals-title">{goals.title}</h3>
    <p className="dl-goals-lead">{goals.lead}</p>
    <ul className="dl-goal-list">
      {goals.list.map(g => {
        const rank = order.indexOf(g.key) + 1;
        return <li key={g.key}>
          <button type="button" className={rank ? 'on' : ''} aria-pressed={!!rank} onClick={() => toggle(g.key)}>
            <span className="dl-rank" aria-label={rank ? `${rank}위` : '순위 없음'}>{rank || ''}</span>
            <span><b>{g.text}</b><small>{g.note}</small></span>
          </button>
        </li>;
      })}
    </ul>
    <div className="dl-goal-actions">
      <span role="status">{done ? '모두 매겼어요!' : `${order.length} / ${goals.list.length} 매김`}</span>
      <button type="button" className="dl-goal-btn" onClick={() => { setOrder([]); setCopied(''); }} disabled={!order.length}>처음부터</button>
      <button type="button" className="dl-goal-btn primary" onClick={copy} disabled={!order.length}>결과 복사</button>
    </div>
    {copied && <p className="dl-goals-lead" role="alert">{copied}</p>}
  </section>;
}
