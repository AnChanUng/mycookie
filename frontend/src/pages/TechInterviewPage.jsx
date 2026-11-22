import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import InterviewAudio from '../components/InterviewAudio';
import './CsNotesPage.css';
import './ChanungPage.css';
import './TechInterview.css';

// 기술면접(소유자 전용). 이력서에서 뽑은 주제마다 1~4단계(depth) 꼬리질문을 차례로 연습한다.
// 질문과 답변 포인트는 서버(OWNER 권한)에만 저장해 두고 이 화면이 권한으로 받아 온다. 화면 코드와 저장소에는 두지 않는다.
// 자료 모양: [{ id, title, source, levels: [{ depth: 1~4, questions: [{ q, intent, points: [..] }] }] }]
// 화면 구성은 면접 준비 화면(질문 목차 + 녹음 연습 + 직접 적어보기 + 학습 완료)과 같고, 카메라만 뺐다.
const DOC = '/private/docs/tech-interview';
const DEPTH_NAME = { 1: '1단계 · 기본 질문', 2: '2단계 · 꼬리질문', 3: '3단계 · 깊은 꼬리질문', 4: '4단계 · 한계까지' };
const GRADING_HINT = '기술면접 답변은 녹음하고 다시 들으며 연습해요. 아래 답변 포인트와 비교해 보세요.';
const headers = () => ({ Authorization: `Bearer ${account()?.token || ''}` });

const validTopics = data => Array.isArray(data) && data.every(t => t && typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.levels));

// 주제 → 단계 순서로 펼친 질문 목록. id는 주제·단계·순번으로 만든다
const flatten = topics => topics.flatMap(t => [...t.levels].sort((a, b) => a.depth - b.depth).flatMap(l => (l.questions || []).map((q, i) => ({
  id: `${t.id}-${l.depth}-${i}`, topicId: t.id, topic: t.title, source: t.source, depth: l.depth, ...q,
}))));

const readJson = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } };

export default function TechInterviewPage({ back }) {
  const [state, setState] = useState({ status: 'loading', topics: [] });
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    api.get(DOC, { headers: headers(), timeout: 15000 })
      .then(({ data }) => { if (alive) setState({ status: 'ready', topics: validTopics(data?.data) ? data.data : [] }); })
      .catch(() => { if (alive) setState({ status: 'error', topics: [] }); });
    return () => { alive = false; };
  }, []);
  useEffect(() => load(), [load]);

  const save = async () => {
    setMessage('');
    let parsed;
    try { parsed = JSON.parse(draft); } catch { setMessage('JSON 형식이 올바르지 않아요.'); return; }
    if (!validTopics(parsed)) { setMessage('자료 모양이 맞지 않아요. [{ id, title, levels: [...] }] 형태여야 해요.'); return; }
    setSaving(true);
    try {
      await api.put(DOC, { data: parsed }, { headers: headers(), timeout: 20000 });
      setDraft('');
      setMessage('저장했어요.');
      load();
    } catch (e) {
      setMessage(e?.response?.data?.error || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setSaving(false); }
  };

  const questions = useMemo(() => flatten(state.topics), [state.topics]);

  return (
    <div className="cs-notes chanung-page ti-page fade-in">
      <header className="notes-heading">
        <div><h1>기술면접</h1><p>이력서의 경험마다 기본 질문에서 시작해 꼬리질문을 4단계까지 이어서 연습해요.</p></div>
        <div><Link to={back.to}>{back.label}</Link> · <Link to="/">홈으로</Link></div>
      </header>

      {state.status === 'loading' && <p role="status">질문을 불러오는 중…</p>}
      {state.status === 'error' && <p role="alert">질문을 불러오지 못했어요. 로그인 상태와 권한을 확인한 뒤 새로고침해 주세요.</p>}
      {state.status === 'ready' && !questions.length && <p className="ti-empty">아직 등록된 질문이 없어요. 아래 "질문 등록·수정"에 자료를 붙여 넣어 저장하면 돼요.</p>}

      {questions.length > 0 && <Practice topics={state.topics} questions={questions} />}

      <details className="ti-edit">
        <summary>질문 등록·수정</summary>
        <p className="exam-note">JSON 배열을 붙여 넣고 저장하면 서버에 보관돼요. 저장한 내용은 이 계정에서만 볼 수 있어요.</p>
        <textarea aria-label="질문 JSON" rows={10} value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false} />
        <div><button type="button" className="exam-btn" disabled={saving || !draft.trim()} onClick={save}>{saving ? '저장하는 중…' : '저장'}</button></div>
        {message && <p role="status" className="ti-message">{message}</p>}
      </details>
    </div>
  );
}

function Practice({ topics, questions }) {
  const user = account();
  const owner = user ? `user:${user.id || user.nickname}` : 'guest';
  const draftKey = `tech-interview:drafts:v1:${owner}`;
  const doneKey = `tech-interview:done:v1:${owner}`;
  const [drafts, setDrafts] = useState(() => readJson(draftKey));
  const [done, setDone] = useState(() => readJson(doneKey));
  const [recordings, setRecordings] = useState({});
  const [saveError, setSaveError] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [query, setQuery] = useState('');
  const [topicId, setTopicId] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const persist = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); setSaveError(false); } catch { setSaveError(true); } };
  const write = (id, value) => { const next = { ...drafts, [id]: value }; setDrafts(next); persist(draftKey, next); };
  const toggleDone = id => { const next = { ...done, [id]: !done[id] }; setDone(next); persist(doneKey, next); };
  const saveRecording = (id, recording) => setRecordings(prev => ({ ...prev, [id]: recording }));

  const visible = questions.filter(q => (showDone || !done[q.id]) && (!topicId || q.topicId === topicId)
    && `${q.q} ${q.topic}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = visible.find(q => q.id === selectedId) || visible[0];
  const doneCount = questions.filter(q => done[q.id]).length;
  const select = id => { setSelectedId(id); document.getElementById(id)?.scrollIntoView({ block: 'start' }); };
  const random = () => {
    const pool = visible.filter(q => q.id !== selected?.id);
    // 버튼을 눌렀을 때만 실행되는 함수라 렌더 중 무작위 값이 아니다
    if (pool.length) select(pool[Math.floor(Math.random() * pool.length)].id);
  };

  return <>
    <p className="notes-list-intro">주제마다 1단계 기본 질문에서 4단계까지 꼬리질문이 이어져요. 먼저 내 말로 녹음해 답해 본 뒤 답변 포인트를 확인하세요. 실제 질문은 면접에 따라 달라질 수 있어요.</p>
    <p className="notes-save-status" role="status">{saveError ? '저장에 실패했습니다. 입력한 답변을 따로 복사해 주세요.' : '직접 적은 연습 답변과 학습 완료는 현재 브라우저에 저장됩니다.'}</p>
    <div className="notes-layout">
      <aside className="notes-index">
        <div className="notes-filters">
          <input type="search" aria-label="기술면접 질문 검색" placeholder="질문 검색" value={query} onChange={e => setQuery(e.target.value)} />
          <select aria-label="기술면접 주제" value={topicId} onChange={e => setTopicId(e.target.value)}>
            <option value="">전체 주제</option>
            {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <label><input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} /> 완료한 질문도 표시 ({doneCount})</label>
        </div>
        <div className="chanung-list-meta"><span>{visible.length}문항 · 작성 {questions.filter(q => drafts[q.id]?.trim()).length}/{questions.length}</span><button type="button" disabled={visible.length < 2} onClick={random}>랜덤 질문</button></div>
        <nav className="notes-questions" aria-label="기술면접 질문 목차">{topics.map(t => {
          const list = visible.filter(q => q.topicId === t.id);
          return list.length ? <section key={t.id}><h2>{t.title}<small>{list.length}</small></h2><ul>{list.map(q => <li key={q.id} className={selected?.id === q.id ? 'is-selected' : ''}><button type="button" aria-current={selected?.id === q.id ? 'true' : undefined} onClick={() => select(q.id)}>[{q.depth}단계] {q.q}{drafts[q.id]?.trim() && <small> · 작성함</small>}</button></li>)}</ul></section> : null;
        })}</nav>
      </aside>
      <div className="notes-content">
        {topics.map(t => {
          const list = visible.filter(q => q.topicId === t.id);
          return list.length ? <section key={t.id} className="interview-stage">
            <h2>{t.title}</h2>
            {t.source && <p className="ti-source">이력서: {t.source}</p>}
            {list.map(q => <TechQuestion key={q.id} q={q} draft={drafts[q.id] || ''} write={write} recording={recordings[q.id]} saveRecording={saveRecording} active={selected?.id === q.id} activate={() => select(q.id)} done={!!done[q.id]} toggleDone={() => toggleDone(q.id)} />)}
          </section> : null;
        })}
        {!visible.length && <p className="notes-empty">표시할 질문이 없습니다. 완료한 질문 표시를 켜거나 검색 조건을 바꿔 주세요.</p>}
      </div>
    </div>
  </>;
}

function TechQuestion({ q, draft, write, recording, saveRecording, active, activate, done, toggleDone }) {
  const [open, setOpen] = useState(false);
  return <article className={`notes-detail-card ${done ? 'is-done' : ''}`} id={q.id}>
    <div className="notes-detail-top"><span>{DEPTH_NAME[q.depth] || `${q.depth}단계`}</span><label><input type="checkbox" aria-label={`${q.q} 학습 완료`} checked={done} onChange={toggleDone} /> 학습 완료</label></div>
    <h2 className="notes-question">{q.q}</h2>
    {active ? <InterviewAudio gradingDisabled gradingHint={GRADING_HINT} questionId={q.id} recording={recording} saveRecording={saveRecording} /> : <button type="button" className="exam-btn sm" onClick={activate}>이 질문 녹음 연습</button>}
    <details className="chanung-draft-panel">
      <summary>직접 적어보기{draft.trim() ? ' · 작성한 답변 있음' : ' (선택)'}</summary>
      <label className="chanung-label" htmlFor={`draft-${q.id}`}>내 연습 답변</label>
      <textarea id={`draft-${q.id}`} rows={2} value={draft} onChange={e => write(q.id, e.target.value)} placeholder="핵심만 짧게 적어 보세요." />
    </details>
    <div className="chanung-actions"><button type="button" className="exam-btn sm" aria-expanded={open} aria-controls={`answer-${q.id}`} onClick={() => setOpen(value => !value)}>{open ? '답변 포인트 숨기기' : '기억 안 나요 · 답변 포인트 보기'}</button></div>
    <div id={`answer-${q.id}`} hidden={!open}>{open && <section className="notes-answer" aria-label="답변 포인트">
      {q.intent && <p className="chanung-note"><strong>면접관 의도</strong> {q.intent}</p>}
      {Array.isArray(q.points) && q.points.length > 0 && <ul>{q.points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
    </section>}</div>
  </article>;
}
