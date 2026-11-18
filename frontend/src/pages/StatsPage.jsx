import { useMemo, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { useMembership, TIER_NAMES } from '../membership';
import { ACCOUNT_BANKS } from '../accountRecords';
import { allQuestions } from '../data/examQuestions';
import { TECHNICAL_INTERVIEW } from '../data/technicalInterview';
import { CS_NOTES } from '../data/csNotes';
import TierBadge from '../components/TierBadge';
import TodayCs from '../components/TodayCs';
import ContinueCard from '../components/ContinueCard';
import './MyLearning.css';

// 내 학습: 오늘 할 일 · 연속 학습 · 약한 주제 · 진도를 한 화면에 모은다.
// 풀이 기록은 문제은행마다 이 브라우저에 저장된 것(로그인하면 계정과 동기화됨)을 읽는다

const DAY = 24 * 60 * 60 * 1000;
const kstDay = (t) => Math.floor((t + 9 * 60 * 60 * 1000) / DAY); // 한국 날짜 번호

function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}

function collect(user) {
  const areas = new Map();
  const days = new Set();
  const recent = [];
  let attempts = 0, correct = 0, solved = 0, wrongOpen = 0, week = 0;
  const now = Date.now();
  for (const bank of ACCOUNT_BANKS) {
    const stats = readJson(`exam-progress:${bank.key}`, {})?.stats || {};
    if (!Object.keys(stats).length) continue;
    const byId = new Map(allQuestions(bank).map(q => [String(q.id), q]));
    for (const [id, s] of Object.entries(stats)) {
      const c = Math.max(0, Number(s?.c) || 0), w = Math.max(0, Number(s?.w) || 0);
      if (!(c + w)) continue;
      const q = byId.get(id);
      solved++; attempts += c + w; correct += c;
      if (s.last === 'w') wrongOpen++;
      if (s.at) {
        days.add(kstDay(s.at));
        if (now - s.at < 7 * DAY) week++;
        recent.push({ id: `${bank.key}:${id}`, title: q?.q || `문항 ${id}`, bank: bank.name, ok: s.last !== 'w', at: s.at });
      }
      const name = bank.sections?.[q?.sec]?.name || q?.topic || '기타';
      const a = areas.get(name) || { name, c: 0, w: 0 };
      a.c += c; a.w += w;
      areas.set(name, a);
    }
  }
  // 오늘(또는 어제)까지 하루도 빠지지 않고 이어진 날 수
  let streak = 0;
  const today = kstDay(now);
  let d = days.has(today) ? today : today - 1;
  while (days.has(d)) { streak++; d--; }

  const weak = [...areas.values()]
    .filter(a => a.c + a.w >= 3)
    .map(a => ({ ...a, rate: Math.round(a.c / (a.c + a.w) * 100) }))
    .sort((x, y) => x.rate - y.rate)
    .slice(0, 4);

  const ivKey = `technical-interview:v1:${user ? `user:${user.id || user.nickname}` : 'guest'}`;
  const interviewDone = (readJson(ivKey, []) || []).length;
  const notes = user ? readJson(`cs-notes:v1:${user.nickname}`, {}) : {};
  const notesDone = Object.values(notes || {}).filter(v => v?.done).length;

  recent.sort((a, b) => b.at - a.at);
  return {
    attempts, correct, solved, wrongOpen, week, streak,
    rate: attempts ? Math.round(correct / attempts * 100) : null,
    weak, recent: recent.slice(0, 5), interviewDone, notesDone,
  };
}

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
};

const userSnapshot = () => account()?.token || '';

export default function StatsPage() {
  useSyncExternalStore(onAccountChange, userSnapshot, () => '');
  const user = account();
  const data = useMemo(() => collect(user), [user]);
  const { membership, error: tierError } = useMembership();
  const interviewTotal = TECHNICAL_INTERVIEW.length;
  const notesTotal = CS_NOTES.reduce((n, s) => n + (s.items?.length || 0), 0);

  return (
    <div className="ml fade-in">
      <header className="ml-head">
        <p className="ml-eyebrow">내 학습</p>
        <h1>{user?.nickname ? `${user.nickname}님, 오늘도 한 걸음` : '오늘도 한 걸음씩'}</h1>
        <p className="ml-sub">
          {user ? '푼 문제와 오답이 계정에 쌓여 여러 기기에서 이어져요.' : <>지금은 이 브라우저에만 저장돼요. <Link to="/account">로그인</Link>하면 여러 기기에서 이어져요.</>}
        </p>
      </header>

      <section className="ml-cards" aria-label="요약">
        <div className="ml-card ml-tier">
          <small>내 등급</small>
          {membership ? (
            <>
              <b><TierBadge tier={membership.tier} division={membership.division} /> {TIER_NAMES[membership.tier]}</b>
              <span>{membership.nextTier ? `승급까지 ${membership.remaining.toLocaleString()}문제` : '최고 등급이에요'}</span>
            </>
          ) : <b className="ml-muted">{tierError ? "등급을 확인할 수 없어요" : "불러오는 중…"}</b>}
        </div>
        <div className="ml-card"><small>연속 학습</small><b>{data.streak}<em>일</em></b><span>{data.streak ? '끊기지 않게 오늘도!' : '오늘 한 문제로 시작해요'}</span></div>
        <div className="ml-card"><small>이번 주 푼 문제</small><b>{data.week}<em>문제</em></b><span>누적 {data.solved.toLocaleString()}문제</span></div>
        <div className="ml-card"><small>정답률</small><b>{data.rate ?? '-'}<em>{data.rate === null ? '' : '%'}</em></b><span>{data.attempts.toLocaleString()}번 풀이 기준</span></div>
      </section>

      <section className="ml-section" aria-labelledby="ml-today">
        <h2 id="ml-today">오늘 할 일</h2>
        <div className="ml-todo">
          <TodayCs />
          <ContinueCard />
          <Link to="/weak" className={`ml-task${data.wrongOpen ? '' : ' done'}`}>
            <span className="ml-task-icon" aria-hidden="true">↺</span>
            <span><b>틀린 문제 다시 풀기</b><small>{data.wrongOpen ? `아직 못 맞힌 문제 ${data.wrongOpen}개` : '남은 오답이 없어요'}</small></span>
            <span className="ml-go" aria-hidden="true">→</span>
          </Link>
          <Link to="/technical-interview" className="ml-task">
            <span className="ml-task-icon" aria-hidden="true">💬</span>
            <span><b>기술면접 질문 하나 말해 보기</b><small>{interviewTotal - data.interviewDone}개 남음</small></span>
            <span className="ml-go" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <div className="ml-grid">
        <section className="ml-section ml-panel" aria-labelledby="ml-weak">
          <div className="ml-panel-head"><h2 id="ml-weak">약한 주제</h2><Link to="/weak">전체 보기</Link></div>
          {data.weak.length ? data.weak.map(a => (
            <div key={a.name} className="ml-meter">
              <span>{a.name}</span>
              <span className="ml-bar" role="img" aria-label={`정답률 ${a.rate}%`}><i style={{ width: `${Math.max(a.rate, 3)}%` }} data-low={a.rate < 60 || undefined} /></span>
              <b>{a.rate}%</b>
            </div>
          )) : <p className="ml-empty">주제마다 3문제 이상 풀면 약한 주제를 알려 드려요.</p>}
        </section>

        <section className="ml-section ml-panel" aria-labelledby="ml-progress">
          <div className="ml-panel-head"><h2 id="ml-progress">진도</h2></div>
          <Progress label="기술면접 질문" done={data.interviewDone} total={interviewTotal} to="/technical-interview" />
          <Progress label="전공노트" done={data.notesDone} total={notesTotal} to="/notes" hint={user ? null : '로그인하면 기록돼요'} />
          {membership?.nextTier && (
            <Progress label={`${membership.nextTierName || TIER_NAMES[membership.nextTier]} 승급`} done={membership.solvedCount} total={membership.nextThreshold} to="/account" />
          )}
        </section>
      </div>

      <section className="ml-section ml-panel" aria-labelledby="ml-recent">
        <div className="ml-panel-head"><h2 id="ml-recent">최근 푼 문제</h2></div>
        {data.recent.length ? (
          <ul className="ml-recent">
            {data.recent.map(r => (
              <li key={r.id}>
                <span className={`ml-dot${r.ok ? ' ok' : ''}`} aria-label={r.ok ? '정답' : '오답'} />
                <span className="ml-recent-title">{r.title}</span>
                <small>{r.bank} · {ago(r.at)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <div className="ml-empty-cta">
            <p>아직 푼 문제가 없어요.</p>
            <Link to="/exam" className="ml-btn">실전 문제 풀러 가기</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function Progress({ label, done, total, to, hint }) {
  const pct = total ? Math.min(100, Math.round(done / total * 100)) : 0;
  return (
    <Link to={to} className="ml-progress">
      <span className="ml-progress-top"><span>{label}</span><b>{done.toLocaleString()} / {total.toLocaleString()}</b></span>
      <span className="ml-bar"><i style={{ width: `${Math.max(pct, 2)}%` }} /></span>
      {hint && <small>{hint}</small>}
    </Link>
  );
}
