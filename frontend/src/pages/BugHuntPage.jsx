import { useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { recordAnswer, useExamProgress } from '../hooks/useExamProgress';
import { BUG_HUNT, drawBugCases, gradeBugCase } from '../data/bugHunt';
import Code, { CodeTokens } from '../components/Code';
import { tokenize } from '../codeTokens';
import { track } from '../track';
import './BugHuntPage.css';

const BY_ID = Object.fromEntries(BUG_HUNT.questions.map(q => [q.id, q]));
const identity = () => account()?.token || '';

function readRound(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (!saved || !Array.isArray(saved.ids) || !saved.ids.length || saved.ids.length > 5
      || new Set(saved.ids).size !== saved.ids.length || saved.ids.some(id => !BY_ID[id])
      || !Number.isInteger(saved.index) || saved.index < 0 || saved.index > saved.ids.length) return null;
    const answers = {};
    for (let i = 0; i < saved.ids.length; i++) {
      const id = saved.ids[i], answer = saved.answers?.[id], q = BY_ID[id];
      if (!answer) { if (i < saved.index) return null; continue; }
      if (i > saved.index || !Number.isInteger(answer.line) || answer.line < 1 || answer.line > q.code.split('\n').length
        || !Number.isInteger(answer.reason) || answer.reason < 0 || answer.reason >= q.reasons.length) return null;
      answers[id] = gradeBugCase(q, answer.line, answer.reason);
    }
    return { ids: saved.ids, index: saved.index, answers };
  } catch { return null; }
}

export default function BugHuntPage() {
  const token = useSyncExternalStore(onAccountChange, identity, () => '');
  return <BugHuntGame key={token} />;
}

function BugHuntGame() {
  const { data, save } = useExamProgress(BUG_HUNT.key);
  const roundKey = `bug-hunt:round:v1:${account() ? `user:${account().id || account().nickname}` : 'guest'}`;
  const [round, setRound] = useState(() => readRound(roundKey));
  const latest = useRef(round);
  const [language, setLanguage] = useState('all');
  const [empty, setEmpty] = useState(false);
  const stats = data.stats || {};
  const solved = BUG_HUNT.questions.filter(q => (stats[q.id]?.c || 0) + (stats[q.id]?.w || 0) > 0).length;
  const correct = BUG_HUNT.questions.filter(q => stats[q.id]?.last === 'r').length;
  const wrong = BUG_HUNT.questions.filter(q => stats[q.id]?.last === 'w' && (language === 'all' || q.sec === language)).length;
  function updateRound(next) {
    latest.current = next;
    setRound(next);
    try {
      if (next) localStorage.setItem(roundKey, JSON.stringify(next));
      else localStorage.removeItem(roundKey);
    } catch { /* Keep playing when browser storage is unavailable. */ }
  }
  function start(wrongOnly = false) {
    const ids = drawBugCases(BUG_HUNT.questions, stats, { language, wrongOnly });
    if (!ids.length) { setEmpty(true); return; }
    setEmpty(false);
    updateRound({ ids, index: 0, answers: {} });
  }
  function submit(line, reason) {
    const current = latest.current;
    const q = BY_ID[current?.ids[current.index]];
    if (!q || current.answers[q.id] || !Number.isInteger(line) || line < 1 || line > q.code.split('\n').length
      || !Number.isInteger(reason) || reason < 0 || reason >= q.reasons.length) return;
    const answer = gradeBugCase(q, line, reason);
    updateRound({ ...current, answers: { ...current.answers, [q.id]: answer } });
    save(previous => ({ ...previous, stats: recordAnswer(previous.stats || {}, q.id, answer.correct) }));
    track('exam', '/bug-hunt', q.id, { score: Number(answer.correct), total: 1 });
  }
  function nextCase() {
    const current = latest.current;
    if (!current || !current.answers[current.ids[current.index]]) return;
    updateRound({ ...current, index: current.index + 1 });
  }
  const complete = round && round.index === round.ids.length;
  const current = round && !complete ? BY_ID[round.ids[round.index]] : null;
  const points = round ? Object.values(round.answers).reduce((sum, answer) => sum + answer.points, 0) : 0;
  return <div className="bug-hunt fade-in">
    <header className="page-header">
      <Link to="/" className="back-link">← 홈으로</Link>
      <span className="bug-hunt-kicker">DEBUG CHALLENGE</span>
      <h1>코드 범인 찾기</h1>
      <p>수상한 코드 한 줄, 그 이유까지 찾아보세요.</p>
    </header>
    {!round ? <>
      <section className="bug-hunt-intro" aria-label="게임 안내">
        <div><span className="bug-hunt-step">01</span><strong>범인 줄 선택</strong><p>코드에서 버그의 원인이 되는 줄을 누릅니다.</p></div>
        <div><span className="bug-hunt-step">02</span><strong>이유 추리</strong><p>왜 잘못됐는지 네 가지 보기 중 고릅니다.</p></div>
        <div><span className="bug-hunt-step">03</span><strong>수정 코드 확인</strong><p>정답과 해설을 보고 다음 사건으로 넘어갑니다.</p></div>
      </section>
      <section className="bug-hunt-lobby">
        <h2>오늘은 어떤 코드를 조사할까요?</h2>
        <label>언어 <select value={language} onChange={event => { setLanguage(event.target.value); setEmpty(false); }}>
          <option value="all">전체 · C / Java / Python</option>
          {Object.entries(BUG_HUNT.sections).map(([key, section]) => <option key={key} value={key}>{section.name}</option>)}
        </select></label>
        <p>한 판 최대 5문제 · 아직 풀지 않은 문제 우선 · 줄과 이유 각 10점</p>
        <div className="bug-hunt-actions">
          <button type="button" className="exam-btn primary" onClick={() => start()}>수사 시작</button>
          <button type="button" className="exam-btn" disabled={!wrong} onClick={() => start(true)}>오답만 재수사 ({wrong})</button>
        </div>
        {empty && <p role="status">선택한 조건의 문제가 없습니다. 다른 언어를 골라 주세요.</p>}
        <p className="bug-hunt-record">전체 {BUG_HUNT.questions.length}사건 중 {solved}사건 조사 · 최근 정답 {correct}사건</p>
        <p>한 문제에서 줄과 이유를 모두 맞히면 정답으로 기록됩니다. 풀이와 오답은 내 계정·오답노트에도 반영됩니다. 비로그인은 이 브라우저에, 로그인하면 서버에도 저장됩니다.</p>
      </section>
    </> : complete ? <section className="bug-hunt-result" aria-label="수사 결과">
      <span className="bug-hunt-kicker">CASE CLOSED</span>
      <h2>{Object.values(round.answers).every(answer => answer.correct) ? '모든 범인을 찾았습니다! 🎉' : '수사 완료! 놓친 단서를 확인하세요.'}</h2>
      <p className="bug-hunt-score">{points}<span> / {round.ids.length * 20}점</span></p>
      <p>완전 정답 {Object.values(round.answers).filter(answer => answer.correct).length} / {round.ids.length}문제</p>
      <ul>{round.ids.map(id => <li key={id}><span>{round.answers[id].correct ? '✅' : '🔎'} {BY_ID[id].title}</span><span>{round.answers[id].points} / 20점</span></li>)}</ul>
      <div className="bug-hunt-actions"><button className="exam-btn primary" onClick={() => updateRound(null)}>다음 수사 준비</button><Link className="exam-btn" to="/account/retry">오답노트 보기</Link><Link className="exam-btn" to="/">홈으로</Link></div>
    </section> : <>
      <div className="bug-hunt-round" aria-label="수사 진행"><span>사건 {round.index + 1} / {round.ids.length}</span><span>현재 {points}점</span></div>
      <progress aria-label="수사 완료 문항" value={Object.keys(round.answers).length} max={round.ids.length} />
      <BugCase key={`${round.ids.join(',')}:${round.index}`} question={current} answer={round.answers[current.id]} onSubmit={submit} />
      {round.answers[current.id] && <div className="bug-hunt-actions"><button type="button" className="exam-btn primary" onClick={nextCase}>{round.index + 1 === round.ids.length ? '수사 결과 보기' : '다음 사건'}</button></div>}
      <p className="bug-hunt-record">제출한 답과 진행 상황은 이 브라우저에 자동 저장됩니다. 홈으로 나갔다 돌아와도 이어서 풀 수 있습니다.</p>
    </>}
  </div>;
}

function BugCase({ question: q, answer, onSubmit }) {
  const [line, setLine] = useState(answer?.line ?? null);
  const [reason, setReason] = useState(answer?.reason ?? null);
  const [hint, setHint] = useState(false);
  return <article className="bug-hunt-case">
    <div className="bug-hunt-tags"><span>{BUG_HUNT.sections[q.sec].name}</span><span>{q.difficulty}</span></div>
    <h2>{q.title}</h2><p className="bug-hunt-prompt">{q.prompt}</p>
    <fieldset className="bug-hunt-fieldset"><legend>1. 버그의 원인이 되는 줄은?</legend>
      <div className="bug-hunt-code" role="group" aria-label="버그가 있는 코드 줄 선택">
        {q.code.split('\n').map((code, i) => {
          const number = i + 1;
          const state = answer ? number === q.bugLine ? 'correct' : number === line ? 'wrong' : '' : number === line ? 'selected' : '';
          return <button type="button" key={number} className={`bug-hunt-line ${state}`} aria-pressed={number === line}
            aria-label={`${number}행: ${code || '빈 줄'}`} disabled={Boolean(answer)} onClick={() => setLine(number)}>
            <span className="bug-hunt-line-number" aria-hidden="true">{number}</span><code><CodeTokens tokens={tokenize(code || ' ')} /></code>
            {answer && number === q.bugLine && <span className="bug-hunt-line-label">범인</span>}
          </button>;
        })}
      </div>
      <p className="bug-hunt-record">{line ? `${line}행 선택됨` : '코드 줄을 누르거나 Tab 키로 이동한 뒤 Enter로 선택하세요.'}</p>
    </fieldset>
    <fieldset className="bug-hunt-fieldset"><legend>2. 그 줄이 잘못된 이유는?</legend>
      <div className="bug-hunt-reasons">{q.reasons.map((option, i) => <button type="button" key={i}
        aria-pressed={reason === i} disabled={Boolean(answer)} onClick={() => setReason(i)}
        className={answer ? i === q.a ? 'correct' : i === reason ? 'wrong' : '' : i === reason ? 'selected' : ''}>
        <span>{i + 1}</span>{option}{answer && i === q.a && <b>정답</b>}
      </button>)}</div>
    </fieldset>
    {!answer ? <div className="bug-hunt-submit">
      <button type="button" className="exam-btn primary" disabled={line === null || reason === null} onClick={() => onSubmit(line, reason)}>범인 지목하기</button>
      <button type="button" className="exam-btn" aria-expanded={hint} onClick={() => setHint(value => !value)}>{hint ? '힌트 접기' : '힌트 보기'}</button>
      {hint && <p className="bug-hunt-hint">힌트: {q.hint}</p>}
    </div> : <section className={`bug-hunt-review ${answer.correct ? 'correct' : ''}`} aria-label="사건 해설">
      <h3 role="status">{answer.correct ? '정확히 검거했습니다!' : '놓친 단서를 확인해 보세요.'} · {answer.points} / 20점</h3>
      <p>줄 찾기 {answer.lineCorrect ? '정답' : '오답'} · 이유 찾기 {answer.reasonCorrect ? '정답' : '오답'}</p>
      <p><strong>정답: {q.bugLine}행 · {q.reasons[q.a]}</strong></p>
      <p>{q.e}</p><h4>이렇게 고치면 됩니다</h4><Code code={q.fixedCode} />
    </section>}
  </article>;
}
