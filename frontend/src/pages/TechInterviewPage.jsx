import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import './TechInterview.css';

// 기술면접(소유자 전용). 이력서에서 뽑은 주제마다 1~4단계(depth) 꼬리질문을 차례로 연습한다.
// 질문과 답변 포인트는 서버(OWNER 권한)에만 저장해 두고 이 화면이 권한으로 받아 온다. 화면 코드와 저장소에는 두지 않는다.
// 자료 모양: [{ id, title, source, levels: [{ depth: 1~4, questions: [{ q, intent, points: [..] }] }] }]
const DOC = '/private/docs/tech-interview';
const DEPTHS = [1, 2, 3, 4];
const DEPTH_NAME = { 1: '1단계 · 기본 질문', 2: '2단계 · 꼬리질문', 3: '3단계 · 깊은 꼬리질문', 4: '4단계 · 한계까지' };
const headers = () => ({ Authorization: `Bearer ${account()?.token || ''}` });

const validTopics = data => Array.isArray(data) && data.every(t => t && typeof t.id === 'string' && typeof t.title === 'string' && Array.isArray(t.levels));

export default function TechInterviewPage({ back }) {
  const [state, setState] = useState({ status: 'loading', topics: [] });
  const [topicId, setTopicId] = useState('');
  const [depth, setDepth] = useState(1);
  const [open, setOpen] = useState({});
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    let alive = true;
    api.get(DOC, { headers: headers(), timeout: 15000 })
      .then(({ data }) => {
        if (!alive) return;
        const topics = validTopics(data?.data) ? data.data : [];
        setState({ status: 'ready', topics });
        setTopicId(id => (topics.some(t => t.id === id) ? id : topics[0]?.id || ''));
      })
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

  const topic = state.topics.find(t => t.id === topicId);
  const level = topic?.levels.find(l => l.depth === depth);
  const nextDepth = DEPTHS.find(d => d > depth && topic?.levels.some(l => l.depth === d));
  const toggle = key => setOpen(o => ({ ...o, [key]: !o[key] }));
  const choose = id => { setTopicId(id); setDepth(1); setOpen({}); };

  return (
    <div className="ti fade-in">
      <div className="page-header">
        <Link to={back.to} className="back-link">{back.label}</Link>
        <h1>기술면접</h1>
        <p>이력서의 경험마다 기본 질문에서 시작해 꼬리질문을 4단계까지 이어서 연습해요. 먼저 내 말로 답해 본 뒤 답변 포인트를 확인하세요.</p>
      </div>

      {state.status === 'loading' && <p role="status">질문을 불러오는 중…</p>}
      {state.status === 'error' && <p role="alert">질문을 불러오지 못했어요. 로그인 상태와 권한을 확인한 뒤 새로고침해 주세요.</p>}
      {state.status === 'ready' && !state.topics.length && <p className="ti-empty">아직 등록된 질문이 없어요. 아래 "질문 등록·수정"에 자료를 붙여 넣어 저장하면 돼요.</p>}

      {state.topics.length > 0 && <div className="ti-layout">
        <nav className="ti-topics" aria-label="이력서 주제">
          {state.topics.map(t => (
            <button key={t.id} type="button" className={t.id === topicId ? 'on' : ''} aria-pressed={t.id === topicId} onClick={() => choose(t.id)}>
              <b>{t.title}</b>{t.source && <small>{t.source}</small>}
            </button>
          ))}
        </nav>

        {topic && <section className="ti-main" aria-label={topic.title}>
          <h2>{topic.title}</h2>
          {topic.source && <p className="ti-source">이력서: {topic.source}</p>}
          <div className="ti-depths" role="tablist" aria-label="꼬리질문 단계">
            {DEPTHS.map(d => {
              const has = topic.levels.some(l => l.depth === d);
              return <button key={d} type="button" role="tab" aria-selected={depth === d} disabled={!has} className={depth === d ? 'on' : ''} onClick={() => { setDepth(d); setOpen({}); }}>{d}단계</button>;
            })}
          </div>
          <p className="ti-depth-name">{DEPTH_NAME[depth]}</p>
          {level?.questions?.length ? level.questions.map((q, i) => {
            const key = `${topic.id}-${depth}-${i}`;
            return <article key={key} className="ti-q">
              <p className="ti-qtext">{q.q}</p>
              <button type="button" className="ti-reveal" aria-expanded={!!open[key]} onClick={() => toggle(key)}>{open[key] ? '답변 포인트 접기' : '답변 포인트 보기'}</button>
              {open[key] && <div className="ti-answer">
                {q.intent && <p><b>면접관 의도</b> {q.intent}</p>}
                {Array.isArray(q.points) && q.points.length > 0 && <ul>{q.points.map((p, j) => <li key={j}>{p}</li>)}</ul>}
              </div>}
            </article>;
          }) : <p className="ti-empty">이 단계의 질문이 없어요.</p>}
          {nextDepth && <button type="button" className="exam-btn primary ti-next" onClick={() => { setDepth(nextDepth); setOpen({}); }}>꼬리질문 {nextDepth}단계로 →</button>}
        </section>}
      </div>}

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
