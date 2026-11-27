import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import InterviewAudio from '../components/InterviewAudio';
import { PERSONAL_QUESTIONS, TECH_QUESTIONS, drawQuestion } from '../data/interviewPractice';
import './CsNotesPage.css';
import './WebEssentialsPage.css';
import './ChanungPage.css';
import './InterviewPracticePage.css';

function Answer({ question, label }) {
  return <section className="notes-answer ip-answer" aria-label={label}>
    {question.answer.split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    <Link to={question.noteLink}>노트에서 상세 설명 확인 →</Link>
    {question.sourceUrl && <p><a href={question.sourceUrl} target="_blank" rel="noreferrer">ksundong 원문</a></p>}
    {!!question.references.length && <ul>{question.references.map(ref => <li key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a></li>)}</ul>}
  </section>;
}

function ReferenceQuestion({ question, number, active, disabled, practice }) {
  const [open, setOpen] = useState(false);
  return <article id={`reference-${question.id}`} className="notes-detail-card">
    <div className="notes-detail-top"><span>Q{number}</span><button type="button" className="ip-practice-link" disabled={disabled} onClick={practice}>{active ? '현재 연습 중' : '이 질문 연습'}</button></div>
    <h3 className="notes-question">{question.text}</h3>
    {question.answer && <details className="web-answer-toggle" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>답안 보기</summary>{open && <Answer question={question} />}
    </details>}
  </article>;
}

export default function InterviewPracticePage() {
  const [mode, setMode] = useState('personal');
  const [source, setSource] = useState('all');
  const [category, setCategory] = useState('');
  const [session, setSession] = useState(() => {
    const first = drawQuestion(PERSONAL_QUESTIONS, []);
    return { current: first, seen: [first.id] };
  });
  const [open, setOpen] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [recordings, setRecordings] = useState({});
  const promptRef = useRef(null);
  const focusAfterSelection = useRef(false);
  useEffect(() => {
    if (!focusAfterSelection.current) return;
    focusAfterSelection.current = false;
    promptRef.current?.focus({ preventScroll: true });
    globalThis.document?.getElementById('interview-random')?.scrollIntoView({ block: 'start' });
  }, [session]);
  const bank = mode === 'personal' ? PERSONAL_QUESTIONS : TECH_QUESTIONS;
  const sourcePool = bank.filter(q => mode !== 'tech' || source === 'all' || q.source === source);
  const categoryOf = q => mode === 'personal' ? q.category : q.categoryId;
  const categories = [...new Map(sourcePool.map(q => [categoryOf(q), q.category])).entries()];
  const pool = sourcePool.filter(q => !category || categoryOf(q) === category);
  const groups = categories.map(([id, title]) => ({ id, title, items: pool.filter(q => categoryOf(q) === id) })).filter(group => group.items.length);
  const current = session.current;
  const used = new Set(session.seen);
  const practiced = pool.filter(q => used.has(q.id)).length;
  const numbers = new Map(pool.map((q, index) => [q.id, index + 1]));

  const choose = (nextPool, restart = false) => {
    setOpen(false);
    setSession(prev => {
      const ids = new Set(nextPool.map(q => q.id));
      const seen = restart ? prev.seen.filter(id => !ids.has(id)) : prev.seen;
      const next = drawQuestion(nextPool, seen);
      return { current: next, seen: next ? [...seen, next.id] : seen };
    });
  };
  const switchMode = next => {
    if (next === mode || audioBusy) return;
    setMode(next); setSource('all'); setCategory('');
    choose(next === 'personal' ? PERSONAL_QUESTIONS : TECH_QUESTIONS);
  };
  const switchSource = next => {
    setSource(next); setCategory('');
    choose(TECH_QUESTIONS.filter(q => next === 'all' || q.source === next));
  };
  const switchCategory = next => {
    setCategory(next);
    choose(sourcePool.filter(q => !next || categoryOf(q) === next));
  };
  const practice = question => {
    if (audioBusy) return;
    focusAfterSelection.current = true;
    setOpen(false);
    setSession(prev => ({ current: question, seen: prev.seen.includes(question.id) ? prev.seen : [...prev.seen, question.id] }));
  };

  return <div className="cs-notes web-channel interview-practice fade-in">
    <header className="notes-heading">
      <div><h1>면접 연습</h1><p>먼저 말해 보고, 질문 노트로 답변을 다듬어 보세요.</p></div>
      <Link to="/web-essentials">웹노트 →</Link>
    </header>
    <section id="interview-random" className="ip-random" aria-label="랜덤 면접 연습">
      <div className="ip-random-heading"><div><span className="ip-eyebrow">RANDOM PRACTICE</span><h2>오늘은 어떤 질문이 나올까요?</h2></div><span className="ip-count">{practiced} / {pool.length}문항 출제</span></div>
      <div className="ip-toolbar">
        <div className="web-levels ip-modes" role="group" aria-label="면접 종류">
          <button type="button" aria-pressed={mode === 'personal'} className={mode === 'personal' ? 'on' : ''} disabled={audioBusy} onClick={() => switchMode('personal')}>인성면접</button>
          <button type="button" aria-pressed={mode === 'tech'} className={mode === 'tech' ? 'on' : ''} disabled={audioBusy} onClick={() => switchMode('tech')}>기술면접</button>
        </div>
        {mode === 'tech' && <label className="ip-filter">노트<select aria-label="노트 선택" value={source} disabled={audioBusy} onChange={e => switchSource(e.target.value)}>
          <option value="all">전체 노트</option><option value="cs">전공노트</option><option value="web">웹노트</option>
        </select></label>}
        <label className="ip-filter">카테고리<select aria-label="질문 카테고리" value={category} disabled={audioBusy} onChange={e => switchCategory(e.target.value)}>
          <option value="">전체 카테고리</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <button type="button" className="exam-btn ip-shuffle" disabled={audioBusy} onClick={() => choose(pool)}>랜덤 질문</button>
      </div>
      {current ? <article className="ip-focus" aria-label="현재 면접 질문">
        <div className="notes-detail-top"><span>{current.category}</span><span>면접관 질문</span></div>
        <h2 id="interview-prompt-heading" ref={promptRef} tabIndex={-1} data-testid="interview-prompt" aria-live="polite">{current.text}</h2>
        <InterviewAudio key={current.id} studio questionId={current.id} recording={recordings[current.id]} saveRecording={(id, recording) => setRecordings(prev => ({ ...prev, [id]: recording }))} onBusyChange={setAudioBusy} gradingDisabled />
        <div className="ip-question-actions">
          {mode === 'tech' ? <button type="button" className="exam-btn" aria-expanded={open} aria-controls="ip-answer" onClick={() => setOpen(value => !value)}>{open ? '모범답안 접기' : '모범답안 보기'}</button> : <span className="ip-personal-hint">상황 → 행동 → 결과 순으로 실제 경험을 말씀해 주세요.</span>}
          <button type="button" className="exam-btn" disabled={audioBusy} onClick={() => choose(pool)}>다음 질문</button>
        </div>
        {mode === 'tech' && <div id="ip-answer" hidden={!open}>{open && <Answer question={current} label="구술형 모범답안" />}</div>}
      </article> : <div className="notes-empty" role="status"><h2>{pool.length ? '선택한 범위의 질문을 모두 연습했습니다' : '선택한 범위에 질문이 없습니다'}</h2><p>범위를 바꾸거나 처음부터 다시 연습해 보세요.</p>{!!pool.length && <button type="button" className="exam-btn" onClick={() => choose(pool, true)}>이 범위 다시 연습</button>}</div>}
      <p className="ip-session-note">{audioBusy ? '녹음이나 음성 인식을 마친 뒤 질문을 바꿀 수 있습니다.' : `남은 질문 ${pool.length - practiced}개 · 랜덤 질문은 중복 없이 출제됩니다.`} 출제 기록과 녹음은 페이지를 나가면 초기화됩니다.</p>
    </section>
    <div className="ip-library-heading"><h2>질문 노트 <small>{pool.length}문항</small></h2><p>목차에서 질문을 고르거나, 원하는 질문으로 녹음 연습을 시작하세요.</p></div>
    <div className="web-channel-layout">
      <nav className="web-channel-toc" aria-label="질문 목차"><h2>목차</h2>
        {groups.map(group => <div key={group.id} className="web-toc-group"><a className="web-toc-topic" href={`#group-${group.id}`}>{group.title}<small>{group.items.length}</small></a><ul>{group.items.map(q => <li key={q.id}><a href={`#reference-${q.id}`} aria-current={current?.id === q.id ? 'location' : undefined}><span>{numbers.get(q.id)}</span>{q.text}</a></li>)}</ul></div>)}
      </nav>
      <div className="web-channel-content">{groups.map(group => <section key={group.id} id={`group-${group.id}`} className="web-channel-topic"><h2>{group.title}<small>{group.items.length}문항</small></h2>{group.items.map(q => <ReferenceQuestion key={q.id} question={q} number={numbers.get(q.id)} active={current?.id === q.id} disabled={audioBusy} practice={() => practice(q)} />)}</section>)}</div>
    </div>
  </div>;
}
