import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api';
import { TOPICS } from '../data/topicBank';
import { myNickname } from '../nickname';
import { recordAnswer, useExamProgress } from '../hooks/useExamProgress';
import { visitorId } from '../track';
import Code from '../components/Code';
import { account } from '../sync';
import './DuelPage.css';
import './DuelLobby.css';

const CIRC = ['①', '②', '③', '④', '⑤'];
const SIZE = 10;
// 무료 서버가 잠들어 있으면 깨어나는 데 1분쯤 걸려서 넉넉히 기다린다
const SLOW = { timeout: 90000 };
const BY_ID = Object.fromEntries(TOPICS.questions.map(q => [q.id, q]));
const clock = (ms) => { const d = new Date(ms); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
// 방 만들기 요청을 구분하는 키. 같은 시도를 다시 보낼 때는 같은 키를 쓴다
const requestKey = () => (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

// 상대와의 전적. 방마다 상대 닉네임별 결과(w·l·d)를 이 브라우저에 적어 두고 닉네임 기준으로 합친다
const RECORD_KEY = 'duel:record';
function loadRecord() {
  try { return JSON.parse(localStorage.getItem(RECORD_KEY)) || {}; } catch { return {}; }
}
function tallyOf(record, nickname) {
  const t = { w: 0, l: 0, d: 0 };
  for (const room of Object.values(record)) if (room[nickname]) t[room[nickname]]++;
  return t;
}
const tallyText = (t) => [t.w && `${t.w}승`, t.l && `${t.l}패`, t.d && `${t.d}무`].filter(Boolean).join(' ');

// 대결에서 고른 답은 주제별 통합 문제집('topics') 풀이 기록에 바로 넣어 푼 문제 수 · 등급 · 포인트에 들어가게 한다.
// 방마다 몇 번째 문제까지 넣었는지 적어 두어, 새로고침하거나 창을 두 개 열어도 같은 풀이를 두 번 넣지 않는다
const COUNTED_KEY = 'duel:counted';
function claimAnswer(code, index) {
  let counted = {};
  try { counted = JSON.parse(localStorage.getItem(COUNTED_KEY)) || {}; } catch { /* 깨진 값은 새로 쓴다 */ }
  if ((counted[code] ?? -1) >= index) return false;
  // 오래된 방 기록은 최근 100개만 남긴다
  const next = Object.fromEntries([...Object.entries(counted).filter(([k]) => k !== code).slice(-99), [code, index]]);
  try { localStorage.setItem(COUNTED_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return true;
}

// 혼자 풀기 최고 기록. 과목별로 많이 맞힌 기록, 같으면 빨리 끝낸 기록을 남긴다
const BEST_KEY = 'duel:solo-best';
function loadBest() {
  try { return JSON.parse(localStorage.getItem(BEST_KEY)) || {}; } catch { return {}; }
}
const better = (a, b) => !b || a.score > b.score || (a.score === b.score && a.seconds < b.seconds);
const subjectName = (subject) => (subject === 'all' || !TOPICS.sections[subject] ? '전체 과목' : TOPICS.sections[subject].name);
const pickQuestions = (subject, except = []) => {
  const pool = TOPICS.questions.filter(q => (subject === 'all' || q.sec === subject) && !except.includes(q.id));
  return shuffle(pool).slice(0, SIZE);
};

// /duel 은 방 만들기, /duel/solo 는 혼자 풀기, /duel/:code 는 그 방에서 같은 문제를 풀고 점수를 겨루는 화면
export default function DuelPage() {
  const { code } = useParams();
  if (code?.toLowerCase() === 'solo') return <Solo />;
  return code ? <Room key={code} code={code.toUpperCase()} /> : <Lobby />;
}

// 문제 한 개. 보기를 고르면 정답과 해설을 펼친다
function QuestionCard({ q, picked, onChoose, onNext, last }) {
  return (
    <div className="exam-qcard">
      <div className="exam-qtop">
        <span className="exam-chip sec">{TOPICS.sections[q.sec].name}</span>
        <span className="exam-chip">{q.topic}</span>
      </div>
      {q.ctx && <div className="exam-ctx">{q.ctx}</div>}
      {q.code && <Code code={q.code} />}
      <p className="exam-qtext">{q.q}</p>
      <ul className="exam-opts">
        {q.o.map((opt, i) => {
          let cls = 'exam-opt';
          if (picked !== null) { if (i === q.a) cls += ' right'; else if (i === picked) cls += ' wrong'; }
          return (
            <li key={i}>
              <button type="button" className={cls} disabled={picked !== null} onClick={() => onChoose(i)}>
                <span className="no">{i + 1}</span><span className="tx">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <>
          <div className={`exam-expl ${picked === q.a ? 'ok' : 'bad'}`}>
            <div className="lab">{picked === q.a ? '정답' : `오답 · 정답은 ${CIRC[q.a]}`}</div>
            <div>{q.e}</div>
          </div>
          <div className="exam-actions">
            <button type="button" className="exam-btn primary" onClick={onNext}>{last ? '결과 보기' : '다음'}</button>
          </div>
        </>
      )}
    </div>
  );
}

// 혼자 풀기: 방을 만들지 않고 이 화면에서 10문제를 풀어 내 최고 기록과 겨룬다. 로그인하지 않아도 된다
function Solo() {
  const [params] = useSearchParams();
  const subject = TOPICS.sections[params.get('s')] ? params.get('s') : 'all';
  const name = subjectName(subject);
  const { save: saveTopics } = useExamProgress('topics');
  const [round, setRound] = useState(() => ({ id: requestKey(), questions: pickQuestions(subject) }));
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [marks, setMarks] = useState('');
  const [result, setResult] = useState(null); // { score, seconds, best, newBest }
  const [openRow, setOpenRow] = useState(null);
  const startedAt = useRef(0);
  const { questions } = round;
  const total = questions.length;
  const score = [...marks].filter(m => m === '1').length;
  const best = loadBest()[subject];

  const start = () => { startedAt.current = Date.now(); setStarted(true); };
  const choose = (i) => {
    if (picked !== null) return;
    const q = questions[idx];
    setPicked(i);
    setMarks(marks + (i === q.a ? '1' : '0'));
    if (claimAnswer(`solo:${round.id}`, idx)) saveTopics(prev => ({ ...prev, stats: recordAnswer(prev.stats, q.id, i === q.a) }));
  };
  const next = () => {
    setPicked(null);
    if (idx + 1 < total) { setIdx(idx + 1); return; }
    const mine = { score, seconds: Math.floor((Date.now() - startedAt.current) / 1000), at: Date.now() };
    const all = loadBest();
    const newBest = better(mine, all[subject]);
    if (newBest) {
      try { localStorage.setItem(BEST_KEY, JSON.stringify({ ...all, [subject]: mine })); } catch { /* storage unavailable */ }
    }
    setResult({ ...mine, best: all[subject], newBest });
  };
  const again = () => {
    setRound({ id: requestKey(), questions: pickQuestions(subject, questions.map(q => q.id)) });
    setStarted(true); setIdx(0); setPicked(null); setMarks(''); setResult(null); setOpenRow(null);
    startedAt.current = Date.now();
  };

  if (!total) {
    return (
      <div className="fade-in">
        <div className="empty"><div className="empty-icon">📭</div>이 과목에는 풀 문제가 없습니다.</div>
        <div className="exam-actions"><Link className="exam-btn" to="/duel">대결로 돌아가기</Link></div>
      </div>
    );
  }
  const q = questions[idx];
  return (
    <div className="fade-in exam-quiz duel-page duel-solo">
      <div className="page-header">
        <Link to="/duel" className="back-link">← 대결</Link>
        <h1>혼자 풀기 · {name}</h1>
        <p>{total}문제 · 많이 맞힐수록, 같으면 빨리 끝낼수록 좋은 기록입니다 · 푼 문제는 풀이 기록에 들어갑니다</p>
      </div>
      <div className="exam-quiz-main">
        {!started && (
          <div className="exam-qcard duel-ready">
            <p>{best ? `내 최고 기록은 ${best.score}점 · ${fmt(best.seconds)}입니다. 이 기록을 넘어 보세요.` : '준비되면 시작하세요. 시작하는 순간부터 시간이 흐릅니다.'}</p>
            <button type="button" className="exam-btn primary" onClick={start}>시작하기</button>
          </div>
        )}
        {started && !result && q && (
          <>
            <div className="exam-qhead"><span className="prog">{idx + 1} / {total}</span><span className="prog">맞힘 {score}</span></div>
            <div className="exam-pbar"><i style={{ width: `${Math.round(idx / total * 100)}%` }} /></div>
            <QuestionCard q={q} picked={picked} onChoose={choose} onNext={next} last={idx + 1 >= total} />
          </>
        )}
        {result && (
          <div className={`exam-qcard duel-ready duel-result ${result.newBest ? 'win' : 'draw'}`}>
            <span className="duel-result-icon" aria-hidden="true">{result.newBest ? '🏆' : '💪'}</span>
            <h2>{result.newBest ? (result.best ? '최고 기록을 넘었습니다!' : '첫 기록을 세웠습니다!') : '수고했어요!'}</h2>
            <div className="exam-score"><span className="big">{result.score}</span><span className="of">/ {total}문제</span></div>
            <p>걸린 시간 {fmt(result.seconds)}{result.best && ` · 이전 최고 기록 ${result.best.score}점 · ${fmt(result.best.seconds)}`}</p>
            <p>푼 문제는 풀이 기록에 들어갔어요. 틀린 문제는 주제별 통합 문제집의 오답노트에서 다시 풀 수 있어요.</p>
            <div className="exam-actions">
              <button type="button" className="exam-btn primary" onClick={again}>새 문제로 한 번 더</button>
              <Link className="exam-btn" to="/duel">친구와 대결하기</Link>
            </div>
          </div>
        )}
      </div>
      {result && (
        <div className="duel-review">
          <div className="section-title">문제별 복기</div>
          <p className="exam-lede">문제를 누르면 정답과 해설이 펼쳐집니다.</p>
          <div className="exam-table-wrap">
            <table className="exam-table duel-review-table">
              <thead><tr><th>#</th><th>문제</th><th className="mk">나</th></tr></thead>
              <tbody>
                {questions.map((x, n) => [
                  <tr key={n} className={openRow === n ? 'open' : ''} onClick={() => setOpenRow(openRow === n ? null : n)}>
                    <td className="num">{n + 1}</td>
                    <td><b>{x.topic}</b><span>{x.q}</span></td>
                    <td className={`mk ${marks[n] === '1' ? 'r' : 'w'}`}>{marks[n] === '1' ? '○' : '✕'}</td>
                  </tr>,
                  openRow === n && (
                    <tr key={`${n}-open`} className="detail">
                      <td />
                      <td colSpan={2}>
                        {x.ctx && <div className="exam-ctx">{x.ctx}</div>}
                        {x.code && <Code code={x.code} />}
                        <div className="ans">정답 {CIRC[x.a]} {x.o[x.a]}</div>
                        <div className="ex">{x.e}</div>
                      </td>
                    </tr>
                  ),
                ])}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Lobby() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [join, setJoin] = useState('');
  const [rooms, setRooms] = useState(null); // 지금 열려 있는 단체전
  const [record, setRecord] = useState(null);
  const [recordError, setRecordError] = useState(false);
  useEffect(() => {
    let alive = true;
    api.get('/duels/record', { ...SLOW, headers: { 'X-Visitor-Id': visitorId() } })
      .then(({data}) => { if(alive) setRecord(data); })
      .catch(() => { if(alive) setRecordError(true); });
    return () => { alive = false; };
  }, []);

  // 열린 단체전 목록은 몇 초마다 새로 받는다
  useEffect(() => {
    let alive = true;
    const load = () => api.get('/duels/open', { timeout: 20000 })
      .then(({ data }) => { if (alive && Array.isArray(data)) setRooms(data); })
      .catch(() => { if (alive) setRooms(r => r || []); });
    load();
    const timer = setInterval(load, 5000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  // open이면 목록에 올라가 누구나 들어오는 단체전, 아니면 링크를 받은 사람만 들어오는 방
  // 같은 과목 · 같은 방식으로 다시 누르면(응답을 못 받은 경우 등) 같은 요청 키와 문제를 보내 방이 두 번 생기지 않게 한다
  const attempt = useRef(null);
  const create = async (open) => {
    setBusy(true);
    setError('');
    if (attempt.current?.subject !== subject || attempt.current?.open !== open) {
      const pool = TOPICS.questions.filter(q => subject === 'all' || q.sec === subject);
      attempt.current = { subject, open, key: requestKey(), questionIds: shuffle(pool).slice(0, SIZE).map(q => q.id) };
    }
    const title = subjectName(subject);
    const { key, questionIds } = attempt.current;
    try {
      const { data } = await api.post('/duels', { questionIds, open, title }, { ...SLOW, headers: { 'Idempotency-Key': key } });
      attempt.current = null;
      navigate(`/duel/${data.code}`);
    } catch {
      setError('방을 만들지 못했습니다. 서버가 깨어나는 중일 수 있으니 잠시 뒤에 다시 눌러 주세요.');
      setBusy(false);
    }
  };

  const lobbyName = subjectName(subject);
  const rate = record?.total ? Math.round(record.wins / record.total * 100) : 0;
  return (
    <div className="fade-in dl">
      <Link to="/" className="back-link">← 홈으로</Link>

      {/* 첫 화면: 나 VS 친구, 링크 하나로 바로 붙는 느낌 */}
      <section className="dl-hero">
        <div className="dl-hero-text">
          <p className="dl-eyebrow">실시간 CS 대결</p>
          <h1>친구랑 한 판, <br />누가 더 잘 알까?</h1>
          <p className="dl-sub">같은 {SIZE}문제를 동시에 풀어요. 많이 맞힌 사람이 이기고, 같으면 더 빨리 끝낸 사람이 이겨요. 혼자서도 풀 수 있고, 푼 문제는 풀이 기록에 들어가요.</p>
        </div>
        <div className="dl-versus" aria-hidden="true">
          <span className="dl-player me"><i>🍪</i><b>나</b></span>
          <span className="dl-vs">VS</span>
          <span className="dl-player you"><i>🔥</i><b>친구</b></span>
        </div>
      </section>

      <section className="dl-panel" aria-label="대결 만들기">
        <h2>1. 과목 고르기</h2>
        <div className="dl-subjects">
          <button type="button" className={subject === 'all' ? 'on' : ''} onClick={() => setSubject('all')}>전체</button>
          {Object.entries(TOPICS.sections).map(([k, sec]) => (
            <button key={k} type="button" className={subject === k ? 'on' : ''} onClick={() => setSubject(k)}>{sec.name}</button>
          ))}
        </div>
        <h2>2. 방식 고르기</h2>
        <div className="dl-modes">
          <button type="button" className="dl-mode friend" disabled={busy} onClick={() => create(false)}>
            <span className="dl-mode-icon" aria-hidden="true">🤝</span>
            <b>1:1 친구 대결</b>
            <small>방을 만들고 링크를 보내면 친구가 바로 들어와요</small>
            <span className="dl-mode-go">{busy ? '방 만드는 중…' : `${lobbyName}로 방 만들기 →`}</span>
          </button>
          <button type="button" className="dl-mode solo" disabled={busy} onClick={() => navigate(`/duel/solo?s=${subject}`)}>
            <span className="dl-mode-icon" aria-hidden="true">🎯</span>
            <b>혼자 풀기</b>
            <small>상대 없이 바로 시작해요. 내 최고 기록을 넘어 보세요</small>
            <span className="dl-mode-go">{`${lobbyName} 바로 풀기 →`}</span>
          </button>
          <button type="button" className="dl-mode crowd" disabled={busy} onClick={() => create(true)}>
            <span className="dl-mode-icon" aria-hidden="true">🏟️</span>
            <b>단체전</b>
            <small>누구나 들어오는 방. 여럿이 함께 순위를 겨뤄요</small>
            <span className="dl-mode-go">{busy ? '방 만드는 중…' : '단체전 열기 →'}</span>
          </button>
        </div>
        {error && <p className="exam-note">{error}</p>}
        <form className="dl-join" onSubmit={e => { e.preventDefault(); if (join.trim()) navigate(`/duel/${join.trim().toUpperCase()}`); }}>
          <span>친구한테 방 번호를 받았나요?</span>
          <input type="text" placeholder="방 번호 6자리" aria-label="방 번호" maxLength={8} value={join} onChange={e => setJoin(e.target.value)} />
          <button type="submit" disabled={!join.trim()}>들어가기</button>
        </form>
      </section>

      <div className="dl-grid">
        <section className="dl-card" aria-label="열려 있는 단체전">
          <h2>지금 열린 단체전 {rooms?.length > 0 && <em className="dl-live">{rooms.length}</em>}</h2>
          {rooms === null && <p className="dl-empty">목록을 불러오는 중…</p>}
          {rooms?.length === 0 && <p className="dl-empty">지금 열린 단체전이 없어요. 하나 열어 보세요!</p>}
          {rooms?.length > 0 && <ul className="dl-rooms">
            {rooms.map(r => (
              <li key={r.code}><Link to={`/duel/${r.code}`}>
                <span><b>{r.title || '대결'}</b><small>{r.total}문제 · {clock(r.createdAt)}에 열림</small></span>
                <span className="dl-room-players">{r.players}명</span>
                <span className="dl-room-go">참가</span>
              </Link></li>
            ))}
          </ul>}
        </section>

        <section className="dl-card" aria-label="누적 대결 전적">
          <h2>나의 누적 전적</h2>
          {!record && <p className="dl-empty">{recordError ? '전적을 불러오지 못했습니다. 새로고침해 주세요.' : '전적을 불러오는 중…'}</p>}
          {record && <>
            <div className="dl-record">
              <div className="dl-rate" style={{ '--rate': `${rate * 3.6}deg` }}><b>{rate}%</b><small>승률</small></div>
              <dl>
                <div className="win"><dt>승</dt><dd>{record.wins}</dd></div>
                <div className="loss"><dt>패</dt><dd>{record.losses}</dd></div>
                <div><dt>무</dt><dd>{record.draws}</dd></div>
                <div><dt>총</dt><dd>{record.total}</dd></div>
              </dl>
            </div>
            {record.recent.length > 0 && <ul className="dl-recent">{record.recent.map(r => (
              <li key={r.code}><Link to={`/duel/${r.code}`}>
                <strong className={r.result}>{({ win: '승리', loss: '패배', draw: '무승부' })[r.result]}</strong>
                <span>{r.score}점 · {fmt(r.seconds)}</span><small>{r.code}</small>
              </Link></li>
            ))}</ul>}
            {!record.total && <p className="dl-empty">첫 대결을 끝내면 여기에 전적이 쌓여요.</p>}
            <p className="dl-note">현재 브라우저 기준 · 2명 이상이 모두 끝낸 대결만 셉니다</p>
          </>}
        </section>
      </div>
    </div>
  );
}

function Room({ code }) {
  const me = useMemo(() => ({ visitorId: visitorId(), nickname: account()?.nickname || myNickname() }), []);
  const [room, setRoom] = useState(null); // { questions, players }
  const [status, setStatus] = useState('loading'); // loading | missing | error | ready
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState(''); // 채팅방에 올린 결과 안내
  const [record, setRecord] = useState(loadRecord);
  const [rematching, setRematching] = useState(false);
  const [marks, setMarks] = useState(''); // 내가 푼 순서대로의 정오답 ("1011…")
  const [picks, setPicks] = useState(''); // 내가 푼 순서대로 고른 보기 번호 ("2031…"). 채점은 서버가 한다
  const [openRow, setOpenRow] = useState(null); // 복기 표에서 펼친 문제
  // 대결 문제는 주제별 통합 문제집의 문제라서, 고른 답을 그 문제집의 풀이 기록에 바로 넣는다
  const { save: saveTopics } = useExamProgress('topics');
  const navigate = useNavigate();
  const startedAt = useRef(0);
  const lastReport = useRef(null);
  const reportBusy = useRef(false);
  const [reportError, setReportError] = useState(false);
  const link = `${window.location.origin}/duel/${code}`;
  const headers = { 'X-Visitor-Id': me.visitorId };

  useEffect(() => {
    let alive = true;
    api.post(`/duels/${code}/join`, me, SLOW)
      .then(() => api.get(`/duels/${code}`, { ...SLOW, headers }))
      .then(({ data }) => {
        if (!alive) return;
        const questions = data.questionIds.map(id => BY_ID[id]).filter(Boolean);
        if (questions.length !== data.questionIds.length) { setStatus('missing'); return; }
        // 풀다가 새로고침했으면 서버에 남은 진행 상황에서 이어 간다
        const mine = data.players.find(p => p.me);
        if (mine?.started) {
          setStarted(true);
          setIdx(mine.answered);
          setScore(mine.score);
          setMarks(mine.marks || '');
          setPicks(mine.picks || '');
          setDone(mine.done || mine.answered >= questions.length);
          startedAt.current = Date.now() - mine.seconds * 1000;
        }
        setRoom({ questions, players: data.players, nextCode: data.nextCode, open: !!data.open, title: data.title });
        setStatus('ready');
      })
      .catch(err => { if (alive) setStatus(err?.response?.status === 404 ? 'missing' : 'error'); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // 상대의 진행 상황을 몇 초마다 다시 받아 온다
  useEffect(() => {
    if (status !== 'ready') return undefined;
    let alive = true, fetching = false;
    const timer = setInterval(() => {
      flushReport();
      if (fetching || document.hidden) return;
      fetching = true;
      api.get(`/duels/${code}`, { headers, timeout: 8000 })
        .then(({ data }) => { if(alive) setRoom(r => (r ? { ...r, players: data.players, nextCode: data.nextCode } : r)); })
        .catch(() => { /* Retry on next poll. */ }).finally(() => { fetching = false; });
    }, 1500);
    const heartbeat = setInterval(() => {
      if(!document.hidden) api.post(`/duels/${code}/join`, me, {timeout:10000}).catch(() => {});
    }, 15000);
    return () => { alive = false; clearInterval(timer); clearInterval(heartbeat); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, code]);

  // 나와 상대가 모두 끝냈으면 이 방의 승패를 한 번 적어 둔다. 점수판 순서(맞힌 수 → 걸린 시간)가 곧 순위다
  useEffect(() => {
    const players = room?.players || [];
    const mine = players.find(p => p.me);
    if (!mine?.done) return;
    const result = {};
    for (const p of players) {
      if (p.me || !p.done) continue;
      result[p.nickname] = p.score === mine.score && p.seconds === mine.seconds ? 'd'
        : (mine.score > p.score || (mine.score === p.score && mine.seconds < p.seconds)) ? 'w' : 'l';
    }
    if (!Object.keys(result).length) return;
    const saved = loadRecord();
    if (JSON.stringify(saved[code]) === JSON.stringify(result)) return;
    const next = { ...saved, [code]: result };
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    setRecord(next);
  }, [room, code]);

  const flushReport = () => {
    const payload = lastReport.current;
    if (!payload || reportBusy.current) return;
    reportBusy.current = true;
    api.put(`/duels/${code}/players`, payload, {timeout:15000})
      .then(({data}) => {
        if(lastReport.current === payload) lastReport.current = null;
        setReportError(false);
        setRoom(r => r ? {...r, players:data.players} : r);
      }).catch(() => setReportError(true)).finally(() => { reportBusy.current = false; });
  };
  // 점수는 서버가 고른 보기로 다시 채점한다. 화면의 점수는 바로 보여 주기 위한 것이다
  const report = (nextPicks, finished) => {
    const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
    lastReport.current = { ...me, picks: nextPicks, answered: nextPicks.length, done: finished, seconds };
    flushReport();
  };

  if (status === 'loading') return <div className="loading"><div className="loading-spinner" />대결 방을 여는 중...</div>;
  if (status !== 'ready') {
    return (
      <div className="fade-in">
        <div className="empty">
          <div className="empty-icon">🚪</div>
          {status === 'missing' ? '없는 방이거나 이 방의 문제를 찾을 수 없습니다.' : '서버에 연결하지 못했습니다. 잠시 뒤에 다시 열어 주세요.'}
        </div>
        <div className="exam-actions"><Link className="exam-btn" to="/duel">새 방 만들기</Link></div>
      </div>
    );
  }

  const total = room.questions.length;
  const settled = room.players.length >= 2 && room.players.every(p => p.done);
  const mine = room.players.find(p => p.me);
  const top = room.players[0];
  const tiedTop = top ? room.players.filter(p => p.score === top.score && p.seconds === top.seconds) : [];
  const outcome = !settled || !mine?.done ? 'waiting' : tiedTop.some(p => p.me) ? (tiedTop.length > 1 ? 'draw' : 'win') : 'loss';
  const q = room.questions[idx];

  const start = () => {
    startedAt.current = Date.now();
    setStarted(true);
    report('', false);
  };
  const choose = (i) => {
    if (picked !== null) return;
    setPicked(i);
    const nextScore = score + (i === q.a ? 1 : 0);
    setScore(nextScore);
    setMarks(marks + (i === q.a ? '1' : '0'));
    const nextPicks = picks + i;
    setPicks(nextPicks);
    report(nextPicks, idx + 1 === total);
    if (claimAnswer(code, idx)) saveTopics(prev => ({ ...prev, stats: recordAnswer(prev.stats, q.id, i === q.a) }));
  };
  const next = () => {
    setPicked(null);
    if (idx + 1 >= total) setDone(true);
    setIdx(idx + 1);
  };
  // 사이트 채팅방에 초대 글을 올린다. 채팅은 글 속의 /duel/방번호 를 참가 버튼으로 바꿔 보여 준다
  const postInvite = async () => {
    const secs = new Set(room.questions.map(x => x.sec));
    const subject = secs.size === 1 ? TOPICS.sections[[...secs][0]].name : '전체 과목';
    setInvite('올리는 중…');
    try {
      await api.post('/lounge/messages', { ...me, text: `⚔️ ${subject} ${total}문제 대결 열었어요. 같이 풀어요! /duel/${code}` }, { timeout: 20000 });
      setInvite('채팅방에 올렸습니다.');
    } catch (err) {
      setInvite(err?.response?.data?.error || '올리지 못했습니다. 잠시 뒤에 다시 눌러 주세요.');
    }
  };
  // 같은 과목에서 새 문제를 뽑아 다음 방을 연다. 상대가 먼저 열었으면 그 방으로 간다
  const rematch = async () => {
    setRematching(true);
    const secs = new Set(room.questions.map(x => x.sec));
    const pool = TOPICS.questions.filter(x => secs.has(x.sec) && !room.questions.includes(x));
    try {
      const { data } = await api.post(`/duels/${code}/rematch`, { questionIds: shuffle(pool).slice(0, total).map(x => x.id) }, SLOW);
      navigate(`/duel/${data.code}`);
    } catch {
      setRematching(false);
    }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setCopied(false); }
    setTimeout(() => setCopied(false), 1500);
  };

  const myWrong = marks.length === total ? room.questions.filter((_, n) => marks[n] === '0') : [];

  // 다 푼 사람끼리 문제별로 누가 맞고 틀렸는지 견주어 본다. 서버는 끝낸 사람에게만 정오답을 준다
  const reviewers = room.players.filter(p => p.done && typeof p.marks === 'string' && p.marks.length === total);
  const review = started && done && reviewers.some(p => p.me) && (
    <div className="duel-review">
      <div className="section-title">문제별 복기</div>
      <p className="exam-lede">
        {reviewers.length > 1
          ? '결과가 갈린 문제는 색으로 표시했습니다. 문제를 누르면 정답과 해설이 펼쳐집니다.'
          : '상대가 다 풀면 문제별로 누가 맞았는지 나란히 볼 수 있습니다. 문제를 누르면 정답과 해설이 펼쳐집니다.'}
      </p>
      {myWrong.length > 0 && (
        <div className="exam-actions">
          <span className="exam-note">틀린 {myWrong.length}문제는 주제별 통합 문제집 오답노트에 자동으로 들어갔어요.</span>
          <Link className="exam-btn" to="/topics">주제별 통합에서 다시 풀기 →</Link>
        </div>
      )}
      <div className="exam-table-wrap">
        <table className="exam-table duel-review-table">
          <thead>
            <tr><th>#</th><th>문제</th>{reviewers.map((p, i) => <th key={i} className="mk">{p.me ? '나' : p.nickname}</th>)}</tr>
          </thead>
          <tbody>
            {room.questions.map((x, n) => {
              const split = new Set(reviewers.map(p => p.marks[n])).size > 1;
              return [
                <tr key={n} className={`${split ? 'split' : ''}${openRow === n ? ' open' : ''}`} onClick={() => setOpenRow(openRow === n ? null : n)}>
                  <td className="num">{n + 1}</td>
                  <td><b>{x.topic}</b><span>{x.q}</span></td>
                  {reviewers.map((p, i) => <td key={i} className={`mk ${p.marks[n] === '1' ? 'r' : 'w'}`}>{p.marks[n] === '1' ? '○' : '✕'}</td>)}
                </tr>,
                openRow === n && (
                  <tr key={`${n}-open`} className="detail">
                    <td />
                    <td colSpan={reviewers.length + 1}>
                      {x.ctx && <div className="exam-ctx">{x.ctx}</div>}
                      {x.code && <Code code={x.code} />}
                      <div className="ans">정답 {CIRC[x.a]} {x.o[x.a]}</div>
                      <div className="ex">{x.e}</div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const board = (
    <aside className="duel-board">
      <div className="duel-board-title">{!started ? '실시간 대기실' : '실시간 점수판'} <span>{room.players.length}명</span></div>
      {room.players.length === 0 && <p className="duel-wait">아직 시작한 사람이 없습니다.</p>}
      <ol>
        {room.players.map((p, i) => (
          <li key={i} className={p.me ? 'me' : ''}>
            <span className="no">{p.started ? i + 1 : '·'}</span>
            <span className="nick">{p.nickname}{p.me && <em>나</em>}{!p.me && tallyText(tallyOf(record, p.nickname)) && <small>내 상대전적 {tallyText(tallyOf(record, p.nickname))}</small>}</span>
            <span className="st">{p.done ? (settled ? (tiedTop.includes(p) ? (tiedTop.length > 1 ? '공동 1위' : '승리') : '패배') : '완료') : !p.started ? '대기 중' : `${p.answered}/${total}`}</span>
            <b>{p.score}</b>
          </li>
        ))}
      </ol>
      <div className="duel-share">
        <span>친구에게 보낼 링크</span>
        <code>{link}</code>
        <button type="button" className="exam-btn sm" onClick={copy}>{copied ? '복사됨' : '링크 복사'}</button>
        <button type="button" className="exam-btn sm primary" onClick={postInvite}>채팅방에 올리기</button>
        {invite && <span className="duel-invite-msg">{invite}</span>}
      </div>
    </aside>
  );

  return (
    <div className="fade-in exam-quiz duel-page">
      <div className="page-header">
        <Link to="/duel" className="back-link">← 대결</Link>
        <h1>{room.open ? '단체전' : '1:1 대결'} · {room.title ? `${room.title} · ` : ''}방 {code}</h1>
        <p>{total}문제 · 맞힌 수가 같으면 빨리 끝낸 사람이 위로 갑니다 · 내 이름: {me.nickname}</p>
      </div>
      {room.nextCode && !(started && done) && (
        <div className="exam-resume">
          <div className="exam-resume-text"><strong>재대결 방이 열렸습니다</strong><span>이 방을 끝낸 사람이 새 문제로 한 판 더를 열었습니다.</span></div>
          <Link className="exam-btn primary" to={`/duel/${room.nextCode}`}>참가하기</Link>
        </div>
      )}
      <div className="exam-quiz-body">
        <div className="exam-quiz-main">
          {!started && (
            <div className="exam-qcard duel-ready">
              <p>준비되면 시작하세요. 시작하는 순간부터 시간이 흐르고, 상대가 들어오지 않아도 먼저 풀 수 있습니다.</p>
              <button type="button" className="exam-btn primary" onClick={start}>시작하기</button>
            </div>
          )}
          {started && !done && q && (
            <>
              <div className="exam-qhead"><span className="prog">{idx + 1} / {total}</span><span className="prog">맞힘 {score}</span></div>
              <div className="exam-pbar"><i style={{ width: `${Math.round(idx / total * 100)}%` }} /></div>
              <QuestionCard q={q} picked={picked} onChoose={choose} onNext={next} last={idx + 1 >= total} />
            </>
          )}
          {reportError && <p role="alert" className="exam-note">진행 기록 전송을 다시 시도하고 있습니다. 저장될 때까지 이 화면을 유지해 주세요.</p>}
          {started && done && (
            <div className={`exam-qcard duel-ready duel-result ${outcome}`}>
              <span className="duel-result-icon" aria-hidden="true">{({win:'🏆',loss:'🌱',draw:'🤝',waiting:'⏳'})[outcome]}</span>
              <h2>{({win:'승리했습니다!',loss:'아쉽게 패배했습니다',draw:'무승부입니다!',waiting:'결과를 기다리고 있어요'})[outcome]}</h2>
              <div className="exam-score"><span className="big">{score}</span><span className="of">/ {total}문제</span></div>
              <p>{settled ? `우승: ${tiedTop.map(p => p.nickname).join(', ')} · ${top.score}점 · ${fmt(top.seconds)}. 점수 우선, 동점이면 소요 시간으로 결정합니다.` : '참가자들이 모두 완료하면 승패가 표시됩니다. 혼자 푼 대결은 전적에 포함되지 않지만, 푼 문제는 풀이 기록에 들어갑니다.'}</p>
              {mine?.done && <p>나의 기록 · {fmt(mine.seconds)} · {room.players.length}명 참가</p>}
              <div className="exam-actions">
                {room.nextCode
                  ? <Link className="exam-btn primary" to={`/duel/${room.nextCode}`}>열린 재대결 방으로 →</Link>
                  : <button type="button" className="exam-btn primary" disabled={rematching} onClick={rematch}>{rematching ? '여는 중…' : '같은 사람들과 한 판 더'}</button>}
                <Link className="exam-btn" to="/duel">새 대결 만들기</Link>
              </div>
            </div>
          )}
        </div>
        {board}
      </div>
      {review}
    </div>
  );
}
