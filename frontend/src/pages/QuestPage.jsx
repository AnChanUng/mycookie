import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account, onAccountChange } from '../sync';
import { membershipHeaders } from '../membership';
import './PointShopPage.css';

// 오늘의 퀘스트와 포인트 받는 법. 상점에는 아이템만 두고, 포인트를 모으는 쪽은 이 화면에서 본다.
// 지급 기준은 서버 PointService와 같은 값이다
const RULES = [
  { icon: '📅', title: '출석', text: '접속하면 하루 10P 자동', sub: '7일 연속마다 50P 더' },
  { icon: '✏️', title: '문제 풀이', text: '새로 푼 문제 1개당 1P', sub: '같은 문제는 한 번만 · 하루 100문제까지' },
  { icon: '🏅', title: '승급', text: '단계마다 20 · 50 · 100 · 150 · 300P', sub: '새 등급에 오르면 200~1,500P 더' },
];
const snapshot = () => account()?.token || '';

export default function QuestPage() {
  const token = useSyncExternalStore(onAccountChange, snapshot, () => '');
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;
    const controller = new AbortController();
    api.get('/points', { headers: membershipHeaders(), signal: controller.signal, timeout: 30000 })
      .then(({ data }) => { setS(data); setError(''); })
      .catch(() => { if (!controller.signal.aborted) setError('퀘스트를 불러오지 못했어요. 새로고침해 주세요.'); });
    return () => controller.abort();
  }, [token]);

  return <div className="ps fade-in">
    <header className="page-header">
      <h1>오늘의 퀘스트</h1>
      <p>문제를 풀어 퀘스트를 채우면 포인트가 자동으로 들어와요. 모은 포인트는 <Link to="/shop">상점</Link>에서 써요.</p>
    </header>

    {!token && <div className="ps-card ps-empty">
      <p>퀘스트와 포인트는 로그인한 계정에 쌓여요.</p>
      <Link to="/account#settings" className="ds-btn ds-btn--primary ds-btn--sm">로그인하기</Link>
    </div>}
    {error && <p className="ps-message bad" role="alert">{error}</p>}

    {s?.quests?.length > 0 && <section className="ps-quests" aria-label="오늘의 퀘스트">
      <div className="ps-section-head"><h2>오늘 진행</h2><span>오늘 새로 푼 문제 {s.todaySolved.toLocaleString()}개 · 다 채우면 자동으로 받아요</span></div>
      <ul>
        {s.quests.map(q => {
          const percent = Math.min(100, Math.round(s.todaySolved / q.count * 100));
          return <li key={q.count} className={q.done ? 'done' : ''}>
            <div><b>{q.count}문제 풀기</b><span>{q.done ? '✓ 받음' : `+${q.point}P`}</span></div>
            <span className="ps-quest-bar" role="progressbar" aria-valuemin={0} aria-valuemax={q.count} aria-valuenow={Math.min(q.count, s.todaySolved)} aria-label={`${q.count}문제 퀘스트 진행`}><i style={{ width: `${percent}%` }} /></span>
            <small>{Math.min(q.count, s.todaySolved)} / {q.count}</small>
          </li>;
        })}
      </ul>
      <Link to="/exam" className="ps-quest-go">문제 풀러 가기 →</Link>
    </section>}

    <section className="ps-rules" aria-label="포인트 받는 법">
      {RULES.map(r => <div key={r.title}><span className="ps-rule-icon" aria-hidden="true">{r.icon}</span><b>{r.title}</b><p>{r.text}</p><small>{r.sub}</small></div>)}
    </section>
  </div>;
}
