import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { INTERVIEW_TRACKS, TECHNICAL_INTERVIEW, INTERVIEW_REFERENCES } from '../data/technicalInterview';
import { account, onAccountChange } from '../sync';
import './CsNotesPage.css';
import './TechnicalInterviewPage.css';

const identity = () => account()?.token || '';
const knownIds = new Set(TECHNICAL_INTERVIEW.map(q => q.id));
const randomQuestion = questions => questions[Math.floor(Math.random() * questions.length)];
export default function TechnicalInterviewPage({ back = { to: '/chanung', label: '← 기업별 면접 준비' } }) {
  const token = useSyncExternalStore(onAccountChange, identity, () => '');
  return <InterviewWorkspace key={token} back={back} />;
}
function InterviewWorkspace({ back }) {
  const { hash, search, pathname } = useLocation();
  const requestedTrack = new URLSearchParams(search).get('track');
  const navigate = useNavigate();
  const selected = TECHNICAL_INTERVIEW.find(q => q.id === hash.slice(1));
  const [track, setTrack] = useState(selected?.source || (INTERVIEW_TRACKS.some(t => t.id === requestedTrack) ? requestedTrack : 'aws'));
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [hideDone, setHideDone] = useState(false);
  const [opened, setOpened] = useState({});
  const storageKey = `technical-interview:v1:${account() ? `user:${account().id || account().nickname}` : 'guest'}`;
  const [completed, setCompleted] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem(storageKey));
      return Array.isArray(data) ? data.filter(id => knownIds.has(id)) : [];
    } catch { return []; }
  });
  const [storageError, setStorageError] = useState(false);
  const trackQuestions = TECHNICAL_INTERVIEW.filter(q => q.source === track);
  const categories = [...new Set(trackQuestions.map(q => q.category))];
  const normalized = query.trim().toLocaleLowerCase();
  const visible = trackQuestions.filter(q => (!category || q.category === category) && (!hideDone || !completed.includes(q.id))
    && `${q.question} ${q.category} ${q.answer}`.toLocaleLowerCase().includes(normalized));
  const source = INTERVIEW_TRACKS.find(item => item.id === track);
  const toggleDone = id => {
    const next = completed.includes(id) ? completed.filter(value => value !== id) : [...completed, id];
    setCompleted(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  };
  const choose = id => {
    navigate(`${pathname}?track=${track}#${id}`, { replace: true });
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const chooseTrack = id => {
    setTrack(id); setCategory(''); setQuery('');
    navigate(`${pathname}?track=${id}`, { replace: true });
  };
  const chooseRandom = () => {
    if (!visible.length) return;
    const pool = visible.length > 1 ? visible.filter(q => q.id !== selected?.id) : visible;
    choose(randomQuestion(pool).id);
  };
  return <div className="cs-notes technical-interview-notes">
    <header className="notes-heading">
      <div><Link to={back.to}>{back.label}</Link><h1>{source.name}</h1><p>{INTERVIEW_TRACKS.length}개 자료 / 총 {TECHNICAL_INTERVIEW.length}개 질문</p></div>
      <div className="notes-progress"><strong>학습 완료 {completed.length} / {TECHNICAL_INTERVIEW.length}</strong><progress value={completed.length} max={TECHNICAL_INTERVIEW.length} aria-label="기술면접 학습 완료" /></div>
      <Link to="/account">내 계정 →</Link>
    </header>
    <div className="notes-save-status" role="status">{storageError ? '브라우저 저장이 차단되어 완료 표시를 유지하지 못합니다.' : '학습 완료 표시는 현재 브라우저에 저장됩니다. 기술면접 연습은 티어 풀이 수에 포함되지 않습니다.'}</div>
    <div className="tech-note-toolbar">
      <div className="tech-note-tracks" aria-label="면접 자료 선택">
        {INTERVIEW_TRACKS.map(item => <button type="button" className="exam-btn sm" key={item.id} aria-pressed={track === item.id} onClick={() => chooseTrack(item.id)}>{item.name}<span>{TECHNICAL_INTERVIEW.filter(q => q.source === item.id).length}개 질문</span></button>)}
      </div>
      <div className="tech-note-links"><Link to="/notes">전공노트 →</Link><Link to="/interview">카메라로 공통질문 연습 →</Link></div>
    </div>
    <div className="notes-layout">
      <aside className="notes-index">
        <div className="notes-filters">
          <input type="search" aria-label="면접 질문 검색" value={query} onChange={event => setQuery(event.target.value)} placeholder="질문 검색…" />
          <select aria-label="면접 주제" value={category} onChange={event => setCategory(event.target.value)}><option value="">전체 주제</option>{categories.map(title => <option key={title} value={title}>{title}</option>)}</select>
          <label><input type="checkbox" aria-label="완료한 질문 숨기기" checked={hideDone} onChange={event => setHideDone(event.target.checked)} /> 완료한 질문 숨기기</label>
        </div>
        <div className="tech-note-list-head"><span>{visible.length}개 질문</span><button type="button" disabled={!visible.length} onClick={chooseRandom}>랜덤 질문</button></div>
        <nav className="notes-questions" aria-label="기술면접 질문 목록">
          {categories.map(title => {
            const list = visible.filter(q => q.category === title);
            if (!list.length) return null;
            const all = trackQuestions.filter(q => q.category === title);
            return <section key={title}><h2>{title}<small>{all.filter(q => completed.includes(q.id)).length}/{all.length}</small></h2><ul>{list.map(q => <li key={q.id} className={`${completed.includes(q.id) ? 'is-done' : ''} ${selected?.id === q.id ? 'is-selected' : ''}`}>
              <input type="checkbox" aria-label={`${q.question} 학습 완료`} checked={completed.includes(q.id)} onChange={() => toggleDone(q.id)} />
              <button type="button" aria-current={selected?.id === q.id ? 'true' : undefined} onClick={() => choose(q.id)}>{q.question}</button>
            </li>)}</ul></section>;
          })}
          {!visible.length && <p className="notes-empty">조건에 맞는 질문이 없습니다.</p>}
        </nav>
      </aside>
      <div className="notes-content">
        <p className="notes-list-intro">질문 출처: {source.file}<br />내 말로 먼저 답한 뒤 ‘답 보기’로 예시를 확인하고 학습 완료를 체크하세요. 답변과 꼬리질문은 학습을 위해 새로 작성했으며 회사의 공식 정답을 뜻하지 않습니다.</p>
        {selected && hideDone && completed.includes(selected.id) && <p className="notes-empty">이 링크의 질문은 학습 완료되어 숨겨져 있습니다. ‘완료한 질문 숨기기’를 해제하면 다시 볼 수 있습니다.</p>}
        {categories.map(title => {
          const list = visible.filter(q => q.category === title);
          if (!list.length) return null;
          const headingId = `interview-subject-${track}-${list[0].section}`;
          return <section className="notes-subject" key={title} aria-labelledby={headingId}>
            <h2 id={headingId} className="notes-subject-title">{title}<small>{list.length}개 질문</small></h2>
            {list.map(q => <InterviewNote key={q.id} question={q} done={completed.includes(q.id)} toggleDone={toggleDone} open={!!opened[q.id]} toggleOpen={() => setOpened(prev => ({ ...prev, [q.id]: !prev[q.id] }))} />)}
          </section>;
        })}
        {!visible.length && <div className="notes-empty"><h2>표시할 질문이 없습니다.</h2><p>완료한 질문 숨기기를 해제하거나 검색과 주제 조건을 바꿔 보세요.</p></div>}
        <details className="notes-sources"><summary>개념 확인용 공식 문서</summary><ul>{INTERVIEW_REFERENCES.map(([label, url]) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{label} ↗</a></li>)}</ul></details>
      </div>
    </div>
  </div>;
}
function InterviewNote({ question: q, done, toggleDone, open, toggleOpen }) {
  const kind = q.kind === 'experience' ? '경험 답변 구성 예시' : q.kind === 'reverse' ? '역질문 준비 가이드' : '기술 답변 예시';
  return <article id={q.id} className={`notes-detail-card ${done ? 'is-done' : ''}`} aria-label={q.question}>
    <div className="notes-detail-top"><span>{q.source === 'aws' ? `AWS 자료 ${q.page}쪽` : '오토에버 1차 자료'}</span><label><input type="checkbox" aria-label={`${q.question} 본문 학습 완료`} checked={done} onChange={() => toggleDone(q.id)} /> 학습 완료</label></div>
    <h3 className="notes-question">{q.question}</h3>
    <button type="button" className="exam-btn sm notes-reveal" aria-expanded={open} aria-controls={`tech-answer-${q.id}`} onClick={toggleOpen}>{open ? '답 숨기기' : '답 보기'}</button>
    <div id={`tech-answer-${q.id}`} hidden={!open}>
      {open && <section className="notes-answer" aria-label={kind}><h4>{kind}</h4><p>{q.answer}</p>
        {q.kind === 'experience' && <div className="notes-tip">대괄호는 본인의 실제 경험으로 바꿔 주세요. 자료 속 지원자의 직함과 프로젝트, 성과를 본인 경험으로 사용하지 마세요.</div>}
        {q.kind === 'reverse' && <div className="notes-tip">지원자가 면접관에게 묻는 역질문입니다. 실제로 궁금한 내용을 골라 준비하세요.</div>}
        <details className="tech-note-followups"><summary>이 주제의 꼬리질문 연습</summary>{q.followUps.map(([question, answer]) => <section key={question}><h4>{question}</h4><details><summary>답변 포인트 보기</summary><p>{answer}</p></details></section>)}</details>
      </section>}
    </div>
  </article>;
}
