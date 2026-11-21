import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account, onAccountChange } from '../sync';
import { TOPICS } from '../data/topicBank';
import { CS_NOTES } from '../data/csNotes';
import { useExamProgress, recordAnswer } from '../hooks/useExamProgress';
import QuestionExplanation from '../components/QuestionExplanation';
import { EXAMS, SUBJECTS, SCOPES, today, daysLeft, readPlan, storePlan, makePlan, taskDone } from '../studyCoach';
import './StudyCoachPage.css';

const tokenSnapshot = () => account()?.token || '';
const NOTE_RULES = { db: /데이터베이스|SQL/, os: /운영체제|컴퓨터구조/, net: /네트워크/, ds: /자료구조|알고리즘/, sec: /보안/, se: /디자인 패턴|소프트웨어/, pl: /Java|자바/, bd: /빅데이터|AI/ };
const BY_ID = new Map(TOPICS.questions.map(q => [q.id, q]));
export default function StudyCoachPage() {
  const token = useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  return <Coach key={token} user={account()} />;
}
function Coach({ user }) {
  const [plan, setPlan] = useState(() => readPlan(user));
  const [editing, setEditing] = useState(!plan);
  const [form, setForm] = useState(plan?.form || { exam: 'backend', date: '', minutes: 60, weak: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [active, setActive] = useState(null);
  const { data, save } = useExamProgress('topics');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  function persist(next) {
    setPlan(next);
    setSaveError(storePlan(user, next) ? '' : '브라우저 저장소를 사용할 수 없어 새로고침하면 계획이 사라질 수 있어요.');
  }
  async function create(useAi) {
    setError('');
    try { makePlan(form, TOPICS.questions, data.stats); } catch (e) { setError(e.message); return; }
    if (useAi && !user) { setError('AI 계획은 로그인 후 사용할 수 있어요. 기본 계획은 바로 만들 수 있습니다.'); return; }
    setBusy(true);
    const controller = new AbortController(); request.current = controller;
    try {
      // Only enumerated goal/scope/time go to AI. No profile, free text, answers or learning records.
      const recommendation = useAi ? (await api.post('/study-coach/plan', { exam: form.exam, days: daysLeft(form.date), minutes: form.minutes },
        { headers: { Authorization: `Bearer ${user.token}` }, timeout: 45000, signal: controller.signal })).data : null;
      if (controller.signal.aborted) return;
      persist(makePlan(form, TOPICS.questions, data.stats, recommendation)); setEditing(false); setActive(null);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.response?.data?.message || e.response?.data?.error || 'AI 계획을 만들지 못했어요. 잠시 후 다시 시도하거나 기본 계획으로 시작하세요.');
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }
  function updateTask(index, patch) {
    persist({ ...plan, tasks: plan.tasks.map((t, i) => i === index ? { ...t, ...patch } : t) });
  }
  function answer(index, q, choice) {
    const task = plan.tasks[index];
    if (task.answers.some(a => a.id === q.id)) return;
    const ok = q.a === choice;
    save(prev => ({ ...prev, stats: recordAnswer(prev.stats, q.id, ok) }));
    updateTask(index, { answers: [...task.answers, { id: q.id, choice, ok }] });
  }
  const complete = plan?.tasks.every(taskDone);
  return <main className="coach-page">
    <header><span className="ds-eyebrow">나에게 맞는 공부 순서</span><h1>AI 학습 코치</h1><p>목표를 정하고, 핵심 노트를 복습한 뒤 바로 문제를 풀어보세요.</p></header>
    {saveError && <p role="alert">{saveError}</p>}
    {editing ? <form className="coach-form" onSubmit={e => { e.preventDefault(); create(true); }}>
      <h2>{plan ? '학습 계획 수정' : '어떤 시험을 준비하나요?'}</h2>
      <div className="coach-fields">
        <label>준비하는 시험<select value={form.exam} disabled={busy} onChange={e => setForm({ ...form, exam: e.target.value, weak: [] })}>{Object.entries(EXAMS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label>시험 날짜<input required type="date" min={today()} value={form.date} disabled={busy} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label>하루 공부 가능 시간<select value={form.minutes} disabled={busy} onChange={e => setForm({ ...form, minutes: Number(e.target.value) })}>{[15, 30, 45, 60, 90, 120, 180].map(n => <option key={n} value={n}>{n}분</option>)}</select></label>
      </div>
      <fieldset disabled={busy}><legend>약한 과목 · 모르면 선택하지 않아도 돼요</legend><div className="coach-subjects">{SCOPES[form.exam].map(id => <label key={id}><input type="checkbox" checked={form.weak.includes(id)} onChange={e => setForm({ ...form, weak: e.target.checked ? [...form.weak, id] : form.weak.filter(x => x !== id) })} />{SUBJECTS[id]}</label>)}</div></fieldset>
      <p className="coach-muted">추천 범위: {SCOPES[form.exam].map(id => SUBJECTS[id]).join(' · ')}. 실제 시험 공고와 범위를 확인해 주세요. 현재는 CS 기초 학습을 지원합니다.</p>
      <p className="coach-muted">주제별 문제집의 풀이 기록으로 약점을 보완합니다. 기록이 없으면 기초 진단부터 시작해요. 날짜·시간은 예상 계획의 기준이며 합격을 보장하지 않습니다.</p>
      {error && <p role="alert" className="coach-error">{error}</p>}
      {!user && <p><Link to="/account">로그인</Link>하면 AI 계획을 만들 수 있어요.</p>}
      <div className="coach-actions"><button className="ds-btn ds-btn--primary" disabled={busy} type="submit">{busy ? '계획을 구성하고 있어요…' : 'AI 학습 계획 만들기'}</button><button className="ds-btn" disabled={busy} type="button" onClick={() => create(false)}>기본 계획으로 시작</button>{plan && <button type="button" className="ds-btn" disabled={busy} onClick={() => { setEditing(false); setError(''); }}>돌아가기</button>}</div>
      <p className="coach-muted">AI에는 시험 유형·남은 일수·공부 시간만 전송합니다. 이름, 계정 정보, 답변과 풀이 기록은 전송하지 않습니다. 계획은 이 브라우저에 계정별로 저장됩니다.</p>
    </form> : plan && <>
      <section className="coach-overview"><div><span className="ds-eyebrow">{plan.source === 'ai' ? 'AI 추천 + 풀이 기록 반영' : '기본 학습 계획'} · {plan.day}</span><h2>{EXAMS[plan.form.exam]} · 약 {plan.form.minutes}분</h2><p>{plan.summary}</p><p>{plan.tasks.filter(taskDone).length} / {plan.tasks.length}개 학습 완료</p></div><button className="ds-btn" onClick={() => { setForm(plan.form); setEditing(true); }}>계획 수정</button></section>
      {plan.day !== today() && <p className="coach-notice">이전 날짜의 계획입니다. 이어서 공부하거나 ‘계획 수정’에서 오늘의 계획을 만들어 주세요.</p>}
      <div className="coach-tasks">{plan.tasks.map((task, index) => {
        const note = CS_NOTES.find(s => NOTE_RULES[task.subject]?.test(s.title))?.items?.[0];
        const done = taskDone(task);
        return <section className={`coach-task${done ? ' is-done' : ''}`} key={`${plan.createdAt}:${task.subject}`}>
          <span className="ds-eyebrow">{index + 1}번째 학습 · 약 {task.minutes}분</span><h2>{SUBJECTS[task.subject]} {done && '✓'}</h2><p>{task.reason}</p>
          <ol><li>{note ? <Link to={`/notes#${note.id}`}>핵심 노트 복습 →</Link> : <Link to="/notes">전공노트에서 개념 복습 →</Link>}</li><li>문제 {task.ids.length}개 풀기 · {task.answers.length}개 제출</li><li>정답과 해설 확인하기</li></ol>
          <button className="ds-btn ds-btn--primary" onClick={() => setActive(active === index ? null : index)} aria-expanded={active === index}>{active === index ? '문제 접기' : task.answers.length ? '이어서 풀기 · 해설 보기' : '공부 시작하기'}</button>
          {active === index && <Practice task={task} onAnswer={(q, c) => answer(index, q, c)} />}
          {task.answers.length === task.ids.length && <label className="coach-review"><input type="checkbox" checked={task.reviewed} onChange={e => updateTask(index, { reviewed: e.target.checked })} />해설까지 복습했어요 · 정답 {task.answers.filter(a => a.ok).length}/{task.ids.length}</label>}
        </section>;
      })}</div>
      {complete && <section className="coach-overview"><div><h2>계획한 공부를 마쳤어요!</h2><p>이번 풀이를 반영해 다음 계획을 만들 수 있어요. 틀린 문제를 먼저 복습하도록 조정합니다.</p></div><button className="ds-btn ds-btn--primary" onClick={() => { setForm(plan.form); setEditing(true); }}>결과 반영해 다시 계획하기</button></section>}
      <p className="coach-muted">계획은 이 브라우저에 저장됩니다. 문제풀이 기록은 기존 주제별 문제집과 연결됩니다. 공부 시간은 복습·풀이·해설 확인을 합친 예상치예요.</p>
    </>}
    <Link className="coach-free" to="/">계획 없이 자유롭게 공부하기 →</Link>
  </main>;
}
function Practice({ task, onAnswer }) {
  return <div className="coach-practice">{task.ids.map((id, index) => {
    const q = BY_ID.get(id); const result = task.answers.find(a => a.id === id);
    if (!q) return <p key={id}>문제가 변경되었습니다. 계획을 다시 만들어 주세요.</p>;
    return <article key={id}><h3>{index + 1}. {q.q}</h3>{q.code && <pre>{q.code}</pre>}{q.ctx && <p className="coach-answer">{q.ctx}</p>}
      <div className="coach-options">{q.o.map((option, choice) => <button key={choice} disabled={!!result} className={result && choice === q.a ? 'correct' : result?.choice === choice ? 'incorrect' : ''} onClick={() => onAnswer(q, choice)}>{choice + 1}. {option}</button>)}</div>
      {result && <div role="status"><strong>{result.ok ? '정답입니다.' : `오답입니다. 정답은 ${q.a + 1}번입니다.`}</strong><p className="coach-answer">{q.e}</p><QuestionExplanation q={q} /></div>}
    </article>;
  })}</div>;
}
