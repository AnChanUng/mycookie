import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import InterviewAudio from '../components/InterviewAudio';
import InterviewCamera from '../components/InterviewCamera';
import { account, onAccountChange } from '../sync';
import { CHANUNG_QUESTIONS as currentQuestions, CHANUNG_CATEGORIES as currentCategories, INTERVIEW_STAGES as currentStages } from '../data/chanung';
import { PORTFOLIO_GROUPS as currentPortfolio } from '../data/portfolioFollowups';
import snapshot from '../data/interview-versions/20261103_ver1.json';
import { coreParts, coreMarkdown } from '../data/answerCores';
import AnswerVersions from '../components/AnswerVersions';
import useChanungCompletion from '../hooks/useChanungCompletion';
import './CsNotesPage.css';
import './ChanungPage.css';
import './CompanyPrep.css';

const isConcept = q => q.id === 'cu-rag' || q.id.endsWith('-concept');

const identity = () => account()?.token || '';
export default function ChanungPage() {
  const token = useSyncExternalStore(onAccountChange, identity, () => '');
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const version = params.get('version');
  const archived = version === snapshot.id;
  const versionMissing = version && !archived;
  return <div className="cs-notes chanung-page">
    <header className="notes-heading"><div><h1>딜로이트 안진 면접 준비</h1><p>딜로이트 안진 · 경영지원부문 IT AI 엔지니어</p></div><div><Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/experience">경험 정리</Link> · <Link to="/">홈으로</Link></div></header>
    <nav className="prep-entry-links" aria-label="딜로이트 준비 메뉴"><Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/ai-focus">AI 직무 집중 준비 →</Link><Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/loyalty">기업 로열티 집중 준비 →</Link><Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/companies">기업 선택</Link><Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/experience">경험 정리</Link></nav>
    {params.get('view') === 'versions' ? <AnswerVersions snapshot={snapshot} /> : versionMissing
      ? <p role="alert">찾을 수 없는 답변 버전입니다. <Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?view=versions">저장된 버전 보기</Link></p>
      : <><p><Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?view=versions">답변 버전 관리</Link> · 현재 답변: <strong>{archived ? snapshot.id : '최신 답변'}</strong> {archived && <Link to="/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9">최신 답변으로 돌아가기</Link>}</p>
      <Practice key={token + ':' + (archived ? snapshot.id : 'latest')} snapshot={archived ? snapshot : null} /></>}
  </div>;
}

function Practice({ snapshot }) {
  const CHANUNG_QUESTIONS = snapshot?.questions || currentQuestions;
  const CHANUNG_CATEGORIES = snapshot?.categories || currentCategories;
  const INTERVIEW_STAGES = snapshot?.stages || currentStages;
  const PORTFOLIO_GROUPS = snapshot?.portfolioGroups || currentPortfolio;
const concepts = CHANUNG_QUESTIONS.filter(isConcept);
const conceptTopics = [...new Set(concepts.map(q => q.topic))];
const portfolioQuestions = PORTFOLIO_GROUPS.flatMap(group => group.questions);
const allQuestions = [...CHANUNG_QUESTIONS, ...portfolioQuestions];
const mainQuestions = CHANUNG_QUESTIONS.filter(q => !isConcept(q));
const questionById = new Map([
  ...mainQuestions.map(q => [q.id, q]),
  ...portfolioQuestions.map(q => [q.id, { ...q, category: '자소서꼬리질문', portfolio: true }]),
]);
const flowQuestions = INTERVIEW_STAGES.flatMap(stage => stage.ids.map(id => questionById.get(id)));


  const [cameraWidth, setCameraWidth] = useState(320);
  const [recordings, setRecordings] = useState({});
  const saveRecording = (id, recording) => setRecordings(prev => ({ ...prev, [id]: recording }));
  const { hash } = useLocation();
  const navigate = useNavigate();
  const user = account();
  const storageKey = `chanung:practice:v1:${user ? `user:${user.id || user.nickname}` : 'guest'}${snapshot ? `:version:${snapshot.id}` : ''}`;
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      return Object.fromEntries(allQuestions.filter(q => typeof saved?.[q.id] === 'string').map(q => [q.id, saved[q.id]]));
    } catch { return {}; }
  });
  const { completed, status: completionStatus, toggle: toggleCompleted, retry: retryCompletion } = useChanungCompletion(user, allQuestions.map(q => q.id), snapshot?.id);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const visible = flowQuestions
    .filter(q => (showCompleted || !completed.includes(q.id)) && (!category || q.category === category) && `${q.question} ${q.category}`.toLowerCase().includes(query.trim().toLowerCase()));
  const selected = visible.find(q => q.id === hash.slice(1)) || visible[0];
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const select = id => {
    navigate(`/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9${snapshot ? `?version=${snapshot.id}` : ''}#${id}`, { replace: true });
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  };
  const write = (id, value) => {
    const next = { ...drafts, [id]: value };
    setDrafts(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setSaveError(false); }
    catch { setSaveError(true); }
  };
  const random = () => {
    const pool = visible.filter(q => q.id !== selected?.id);
    // 버튼을 눌렀을 때만 실행되는 함수라 렌더 중 무작위 값이 아니다
    // eslint-disable-next-line react-hooks/purity
    if (pool.length) select(pool[Math.floor(Math.random() * pool.length)].id);
  };
  return <>
    <p className="notes-list-intro">자기소개부터 마지막 한마디까지 면접 순서로 연습하세요. 프로젝트 설명 뒤에 관련 꼬리질문이 이어집니다. 실제 질문 순서는 면접에 따라 달라질 수 있습니다.</p>
    <p><a href="#ai-review">필수 AI 개념 복습으로 이동 ↓</a></p>
    <p className="notes-save-status" role="status">{saveError ? '저장에 실패했습니다. 입력한 답변을 따로 복사해 주세요.' : '직접 적은 연습 답변은 현재 브라우저에 저장됩니다.'}</p>
    <p className="notes-save-status" role="status">{({
      guest: '학습 완료는 이 브라우저에 유지됩니다. 다른 세션·기기에서 이어 보려면 로그인해 주세요.',
      loading: '학습 완료 기록을 불러오는 중…', saving: '학습 완료 기록을 계정에 저장하는 중…',
      saved: '학습 완료 기록이 계정에 저장되었습니다. 같은 계정으로 다시 로그인해도 유지됩니다.',
      error: '계정 저장에 실패했습니다. 체크는 이 기기에 보관되며 다시 연결하면 재시도합니다.',
      expired: '로그인이 만료되었습니다. 다시 로그인하면 계정 기록을 불러옵니다.',
    })[completionStatus]} {completionStatus === 'error' && <button type="button" onClick={retryCompletion}>다시 저장</button>} {!user && <Link to="/account">로그인</Link>}</p>
    <div className="notes-layout" style={{ '--camera-width': `${cameraWidth}px` }}>
      <aside className="notes-index">
        <div className="notes-filters"><input type="search" aria-label="면접 질문 검색" placeholder="질문 검색" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="면접 질문 분류" value={category} onChange={e => setCategory(e.target.value)}><option value="">전체 질문</option>{CHANUNG_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><label><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} /> 완료한 답변도 표시 ({completed.length})</label></div>
        <div className="chanung-list-meta"><span>{visible.length}문항 · 작성 {flowQuestions.filter(q => drafts[q.id]?.trim()).length}/{flowQuestions.length}</span><button type="button" disabled={visible.length < 2} onClick={random}>랜덤 질문</button></div>
        <nav className="notes-questions" aria-label="면접 질문 목차">{INTERVIEW_STAGES.map(stage => {
          const list = visible.filter(q => stage.ids.includes(q.id));
          return list.length ? <section key={stage.title}><h2>{stage.title}<small>{list.length}</small></h2><ul>{list.map(q => <li key={q.id} className={selected?.id === q.id ? 'is-selected' : ''}><button type="button" aria-current={selected?.id === q.id ? 'true' : undefined} onClick={() => select(q.id)}>{q.question}{drafts[q.id]?.trim() && <small> · 작성함</small>}</button></li>)}</ul></section> : null;
        })}</nav>
      </aside>
      <div className="chanung-camera-dock">
        <label className="camera-size-control" htmlFor="camera-size">카메라 크기 <input id="camera-size" type="range" min="240" max="400" step="20" value={cameraWidth} onChange={e => setCameraWidth(Number(e.target.value))} /></label>
        <InterviewCamera />
      </div>
      <div className="notes-content">
        {INTERVIEW_STAGES.map((stage, index) => {
          const list = visible.filter(q => stage.ids.includes(q.id));
          return list.length ? <section key={stage.title} className="interview-stage" id={`interview-stage-${index}`}>
            <h2>{stage.title}</h2>
            {list.map(q => q.portfolio
              ? <PortfolioQuestion key={q.id} q={q} draft={drafts[q.id] || ''} write={write} done={completed.includes(q.id)} toggleDone={() => toggleCompleted(q.id)} />
              : <PracticeQuestion key={q.id} archived={Boolean(snapshot)} q={q} draft={drafts[q.id] || ''} write={write} recording={recordings[q.id]} saveRecording={saveRecording} active={selected?.id === q.id} activate={() => select(q.id)} done={completed.includes(q.id)} toggleDone={() => toggleCompleted(q.id)} />)}
          </section> : null;
        })}
        {!visible.length && <p className="notes-empty">표시할 답변이 없습니다. 완료한 답변 표시를 켜거나 검색 조건을 바꿔 주세요.</p>}
        <details className="chanung-concept-review" id="ai-review">
          <summary>필수 AI 개념 복습 · {concepts.length}개</summary>
          <p className="audio-hint">질문을 보고 먼저 답한 뒤, 답변 보기 버튼으로 정의를 확인하세요.</p>
          <nav className="portfolio-topics" aria-label="AI 질문 주제">{conceptTopics.map((topic, index) => <a key={topic} href={`#ai-topic-${index}`}>{topic}</a>)}</nav>
          {conceptTopics.map((topic, index) => {
            const list = concepts.filter(q => q.topic === topic && (showCompleted || !completed.includes(q.id)));
            return list.length ? <section key={topic} id={`ai-topic-${index}`} className="portfolio-group"><h3>{topic}</h3>{list.map(q => <ConceptQuestion key={q.id} q={q} done={completed.includes(q.id)} toggleDone={() => toggleCompleted(q.id)} />)}</section> : null;
          })}
          {concepts.every(q => completed.includes(q.id)) && !showCompleted && <p className="audio-hint">기초 개념을 모두 완료했습니다. ‘완료한 답변도 표시’를 켜면 다시 볼 수 있습니다.</p>}
        </details>
      </div>
    </div>
  </>;
}

function PracticeQuestion({ archived, q, draft, write, recording, saveRecording, active, activate, done, toggleDone }) {
  const [open, setOpen] = useState(false);
  return <article className={`notes-detail-card ${done ? 'is-done' : ''}`} id={q.id}>
    <div className="notes-detail-top"><span>{q.category}</span><span>{q.original ? '내가 작성한 원문' : '모범답변 예시'}</span><label><input type="checkbox" aria-label={`${q.question} 학습 완료`} checked={done} onChange={toggleDone} /> 학습 완료</label></div>
    <h2 className="notes-question">{q.question}</h2>
    {active ? <InterviewAudio gradingDisabled={archived} questionId={q.id} recording={recording} saveRecording={saveRecording} /> : <button type="button" className="exam-btn sm" onClick={activate}>이 질문 녹음 연습</button>}
    <details className="chanung-draft-panel">
      <summary>직접 적어보기{draft.trim() ? ' · 작성한 답변 있음' : ' (선택)'}</summary>
      <label className="chanung-label" htmlFor={`draft-${q.id}`}>내 연습 답변</label>
      <textarea id={`draft-${q.id}`} rows={2} value={draft} onChange={e => write(q.id, e.target.value)} placeholder="핵심만 짧게 적어 보세요." />
    </details>
    <div className="chanung-actions"><button type="button" className="exam-btn sm" disabled={!draft.trim()} onClick={() => setOpen(true)} aria-controls={`answer-${q.id}`}>답변 제출하고 비교</button><button type="button" className="exam-btn sm" aria-expanded={open} aria-controls={`answer-${q.id}`} onClick={() => setOpen(value => !value)}>{open ? '답변 숨기기' : '기억 안 나요 · 답변 보기'}</button></div>
    <div id={`answer-${q.id}`} hidden={!open}>{open && <section className="notes-answer" aria-label="참고 답변">
      <h3>{q.original ? '내가 작성한 답변 · 원문 그대로' : '모범답변 · 말하기 예시'}</h3>
      {q.original ? <div className="chanung-original">{<CoreText text={q.answer} id={q.id} />}</div> : <div className="notes-markdown"><ReactMarkdown components={{ strong: ({ children }) => <span className="answer-core">{children}</span> }}>{coreMarkdown(q.answer, q.id)}</ReactMarkdown></div>}
      {q.note && <p className="chanung-note"><strong>준비 메모</strong> {q.note}</p>}
    </section>}</div>
  </article>;
}

function ConceptQuestion({ q, done, toggleDone }) {
  const [open, setOpen] = useState(false);
  return <section className="notes-detail-card" id={q.id}>
    <div className="notes-detail-top"><h3>{q.question}</h3><label><input type="checkbox" aria-label={`${q.question} 학습 완료`} checked={done} onChange={toggleDone} /> 학습 완료</label></div>
    <button type="button" className="exam-btn sm" aria-expanded={open} aria-controls={`answer-${q.id}`} onClick={() => setOpen(value => !value)}>{open ? '답변 숨기기' : '답변 보기'}</button>
    <div id={`answer-${q.id}`} hidden={!open}>{open && (q.original ? <div className="chanung-original">{<CoreText text={q.answer} id={q.id} />}</div> : <div className="notes-markdown"><ReactMarkdown components={{ strong: ({ children }) => <span className="answer-core">{children}</span> }}>{coreMarkdown(q.answer, q.id)}</ReactMarkdown></div>)}</div>
  </section>;
}

function PortfolioQuestion({ q, draft, write, done, toggleDone }) {
  const [open, setOpen] = useState(false);
  return <section className="notes-detail-card portfolio-question" id={q.id}>
    <div className="notes-detail-top"><span>{q.depth}단계 · {['', '설명', '구현·선택 이유', '검증·개선'][q.depth]}</span><label><input type="checkbox" aria-label={`${q.question} 학습 완료`} checked={done} onChange={toggleDone} /> 학습 완료</label></div>
    <h4 className="notes-question">{q.question}</h4>
    <details className="chanung-draft-panel"><summary>직접 적어보기{draft.trim() ? ' · 작성한 답변 있음' : ' (선택)'}</summary>
      <label className="chanung-label" htmlFor={`draft-${q.id}`}>내 연습 답변</label>
      <textarea id={`draft-${q.id}`} value={draft} onChange={e => write(q.id, e.target.value)} placeholder="실제로 맡은 역할과 구현·검증한 내용을 적어 보세요." />
    </details>
    <button type="button" className="exam-btn sm" aria-expanded={open} aria-controls={`hint-${q.id}`} onClick={() => setOpen(value => !value)}>{q.answer ? (open ? '답변 숨기기' : '모범답변 보기') : (open ? '준비 포인트 숨기기' : '답변 준비 포인트 보기')}</button>
    <div id={`hint-${q.id}`} hidden={!open}>{open && <>{q.answer && <div className="chanung-original"><CoreText text={q.answer} id={q.id} /></div>}{q.answerNote && <p className="chanung-note"><strong>확인할 점</strong> {q.answerNote}</p>}<p className="chanung-note"><CoreText text={q.hint} id={q.id} /></p></>}</div>
  </section>;
}

function CoreText({ text, id }) {
  return coreParts(text, id).map((part, index) => part.bold ? <span className="answer-core" key={index}>{part.text}</span> : part.text);
}
