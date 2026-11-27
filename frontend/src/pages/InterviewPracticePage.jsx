import { useState } from 'react';
import { Link } from 'react-router-dom';
import InterviewAudio from '../components/InterviewAudio';
import InterviewCamera from '../components/InterviewCamera';
import { PERSONAL_QUESTIONS, TECH_QUESTIONS, drawQuestion } from '../data/interviewPractice';
import './CsNotesPage.css';
import './ChanungPage.css';
import './InterviewPracticePage.css';

export default function InterviewPracticePage() {
  const [mode, setMode] = useState('personal');
  const [source, setSource] = useState('all');
  const [category, setCategory] = useState('');
  const [session, setSession] = useState(() => {
    const first = drawQuestion(PERSONAL_QUESTIONS, []);
    return { current: first, seen: [first.id] };
  });
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const [recordings, setRecordings] = useState({});
  const bank = mode === 'personal' ? PERSONAL_QUESTIONS : TECH_QUESTIONS;
  const sourcePool = bank.filter(q => mode !== 'tech' || source === 'all' || q.source === source);
  const categoryOf = q => mode === 'personal' ? q.category : q.categoryId;
  const categories = [...new Map(sourcePool.map(q => [categoryOf(q), q.category])).entries()];
  const pool = sourcePool.filter(q => !category || categoryOf(q) === category);
  const current = session.current;
  const used = new Set(session.seen);
  const practiced = pool.filter(q => used.has(q.id)).length;

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

  return <div className="cs-notes interview-practice fade-in">
    <header className="notes-heading">
      <div><h1>면접 연습</h1><p>질문 하나에 집중하고, 내 말로 답해 보세요.</p></div>
      <Link to="/notes">전공노트 복습 →</Link>
    </header>
    <div className="ip-modes" role="group" aria-label="면접 종류">
      <button type="button" aria-pressed={mode === 'personal'} disabled={audioBusy} onClick={() => switchMode('personal')}>인성면접</button>
      <button type="button" aria-pressed={mode === 'tech'} disabled={audioBusy} onClick={() => switchMode('tech')}>기술면접</button>
    </div>
    <div className="ip-layout">
      <aside className="ip-settings notes-detail-card" aria-label="출제 설정">
        <h2>연습 범위</h2>
        <p>{mode === 'personal' ? '기본 17 · 직무/회사 13 · 개발 공통 19' : '전공노트와 웹노트의 질문을 골고루 연습하세요.'}</p>
        {mode === 'tech' && <label>노트<select aria-label="노트 선택" value={source} disabled={audioBusy} onChange={e => switchSource(e.target.value)}>
          <option value="all">전체 노트</option><option value="cs">전공노트</option><option value="web">웹노트</option>
        </select></label>}
        <label>카테고리<select aria-label="질문 카테고리" value={category} disabled={audioBusy} onChange={e => switchCategory(e.target.value)}>
          <option value="">전체 카테고리</option>{categories.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select></label>
        <div className="ip-progress"><strong>{practiced} / {pool.length}문항 출제</strong><progress value={practiced} max={pool.length || 1} aria-label="현재 범위 출제 진행률" /></div>
        <p>한 번 나온 질문은 다시 나오지 않습니다. 범위를 바꿔도 이번 연습의 출제 기록은 유지됩니다.</p>
        <p>출제 기록과 녹음은 이 페이지를 나가면 초기화됩니다. 보관할 녹음은 내려받아 주세요.</p>
        <Link to="/web-essentials">웹노트 복습 →</Link>
      </aside>
      <div className="notes-content">
        {current ? <article className="notes-detail-card ip-question" aria-label="현재 면접 질문">
          <div className="notes-detail-top"><span>{current.category}</span><span>면접관 질문</span></div>
          <h2 className="notes-question" data-testid="interview-prompt" aria-live="polite">{current.text}</h2>
          <p className="ip-prompt-hint">결론을 먼저 말씀하신 뒤, 근거나 경험을 덧붙여 주세요.</p>
          <InterviewAudio key={current.id} questionId={current.id} recording={recordings[current.id]} saveRecording={(id, recording) => setRecordings(prev => ({ ...prev, [id]: recording }))} onBusyChange={setAudioBusy} gradingDisabled gradingHint="녹음한 답변을 다시 듣고, 기술 질문은 모범답안과 비교해 보세요." />
          {mode === 'tech' ? <>
            <button type="button" className="exam-btn notes-reveal" aria-expanded={open} aria-controls="ip-answer" onClick={() => setOpen(value => !value)}>{open ? '모범답안 접기' : '모범답안 보기'}</button>
            <div id="ip-answer" hidden={!open}>{open && <section className="notes-answer ip-answer" aria-label="구술형 모범답안">
              <h3>구술형 모범답안</h3>
              {current.answer.split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
              <Link to={current.noteLink}>노트에서 상세 설명 확인 →</Link>
              {current.sourceUrl && <p><a href={current.sourceUrl} target="_blank" rel="noreferrer">ksundong 원문</a> · 질문 말투와 답변을 보완했습니다.</p>}
              {!!current.references.length && <ul>{current.references.map(ref => <li key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title}</a></li>)}</ul>}
            </section>}</div>
          </> : <p className="ip-personal-hint">실제 경험으로 답해 주세요. 당시 상황, 본인의 행동, 결과와 배운 점을 연결하면 좋습니다.</p>}
          <div className="ip-next"><button type="button" className="exam-btn" disabled={audioBusy} onClick={() => choose(pool)}>다음 질문</button><span>{audioBusy ? '녹음이나 음성 인식을 마친 뒤 이동할 수 있습니다.' : `남은 질문 ${pool.length - practiced}개 · 무작위 출제`}</span></div>
        </article> : <section className="notes-detail-card notes-empty" role="status">
          <h2>{pool.length ? '선택한 범위의 질문을 모두 연습했습니다' : '선택한 범위에 질문이 없습니다'}</h2>
          <p>다른 카테고리를 선택하거나 이 범위를 다시 연습해 보세요.</p>
          {!!pool.length && <button type="button" className="exam-btn" onClick={() => choose(pool, true)}>이 범위 다시 연습</button>}
        </section>}
        <details className="ip-camera" open={camera} onToggle={e => setCamera(e.currentTarget.open)}>
          <summary>카메라로 표정 확인하기 (선택)</summary>
          {camera && <InterviewCamera />}
        </details>
      </div>
    </div>
    <details className="notes-sources">
      <summary>질문 출처 · 이용 조건</summary>
      <p>인성 49문항은 사용자가 제공한 원문을 기반으로 면접관 존댓말로 다듬었습니다. 기술면접은 기존 전공노트와 웹노트를 연결하며, 노트의 질문 ID와 학습 기록은 변경하지 않습니다.</p>
      <p>전공노트의 원문 저작자는 ksundong 및 저장소 기여자입니다. <a href="https://github.com/ksundong/backend-interview-question" target="_blank" rel="noreferrer">backend-interview-question</a>의 질문을 선별·분리한 기존 노트에 구술형 말투와 보완 답변을 적용했습니다. 해당 이식·보완 문답은 저작자표시·비영리·동일조건(CC BY-NC-SA)으로 제공합니다. 원문은 CC BY-NC-SA라고 명시하고 <a href="https://creativecommons.org/licenses/by-nc/2.0/kr/" target="_blank" rel="noreferrer">CC BY-NC 2.0 KR</a> 링크도 함께 제공합니다. 원문과 변경 전 내용은 각 문항의 원문 링크에서 확인할 수 있습니다.</p>
      <p>웹노트 답변은 프로젝트에서 별도로 작성한 학습 예시입니다. 모범답안은 면접 구술 연습용이며 회사의 공식 답변이 아닙니다.</p>
    </details>
  </div>;
}
