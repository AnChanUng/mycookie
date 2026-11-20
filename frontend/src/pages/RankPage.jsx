import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import { visitorId } from '../track';
import TierBadge from '../components/TierBadge';
import RankMedal from '../components/RankMedal';
import '../components/HomeRank.css';
import './RankPage.css';

// 전체 순위. 첫 화면 순위 카드의 "전체 보기"에서 온다. 푼 문제 수 기준, 같은 문제를 여러 번 풀어도 1문제다
const PAGE = 50;

export default function RankPage() {
  // 전체 순위는 서버 계산이 오래 걸릴 때가 있어, 첫 화면이 저장해 둔 상위 순위를 먼저 보여 준다
  const [state, setState] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('home-rank:v1'));
      if (cached && Array.isArray(cached.top)) return { loading: true, error: false, data: cached };
    } catch { /* 저장소를 못 쓰면 빈 화면에서 시작 */ }
    return { loading: true, error: false, data: null };
  });
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const controller = new AbortController();
    const headers = { 'X-Visitor-Id': visitorId(), ...(account() ? { Authorization: `Bearer ${account().token}` } : {}) };
    api.get('/rank/solved', { params: { all: true }, headers, signal: controller.signal, timeout: 90000 })
      .then(({ data }) => setState({ loading: false, error: false, data }))
      .catch(() => { if (!controller.signal.aborted) setState(s => ({ loading: false, error: true, data: s.data })); });
    return () => controller.abort();
  }, []);

  const myName = account()?.nickname;
  const rows = useMemo(() => (state.data?.top || []).map(r => ({ ...r, me: r.me || (!!myName && r.nickname === myName) })), [state.data, myName]);
  const shown = rows.filter(r => r.nickname.toLowerCase().includes(query.trim().toLowerCase()));
  const me = rows.find(r => r.me) || state.data?.me;

  return <div className="rk fade-in">
    <header className="page-header">
      <Link to="/" className="back-link">← 홈으로</Link>
      <h1>전체 순위</h1>
      <p>지금까지 푼 문제 수로 정해요. 같은 문제를 여러 번 풀어도 1문제로 세요.</p>
    </header>

    {state.data && <div className="rk-summary">
      <div><span>참여</span><b>{(state.data.totalSolvers || 0).toLocaleString()}명</b></div>
      <div><span>함께 푼 문제</span><b>{(state.data.totalSolved || 0).toLocaleString()}</b></div>
      <div><span>내 순위</span><b>{me ? `${me.rank}위` : '–'}</b></div>
    </div>}

    <input className="rk-search" type="search" placeholder="닉네임 찾기" aria-label="닉네임 찾기" value={query} onChange={e => { setQuery(e.target.value); setLimit(PAGE); }} />

    <div className="hr rk-card">
      {state.loading && <p className={state.data ? 'rk-loading' : 'hr-empty'} role="status">{state.data ? '전체 순위를 불러오는 중… 지금은 상위 순위만 보여요.' : '순위를 불러오는 중… 서버가 깨어나는 데 시간이 걸릴 수 있어요.'}</p>}
      {state.error && <p className="hr-empty" role="alert">순위를 불러오지 못했어요. 새로고침해 주세요.</p>}
      {state.data && !state.loading && !shown.length && <p className="hr-empty">찾는 닉네임이 없어요.</p>}
      <ol className="hr-list rk-list">
        {shown.slice(0, limit).map(r => <li key={`${r.rank}-${r.nickname}`} className={`hr-row rk-row${r.me ? ' me' : ''}${r.rank <= 3 ? ` t${r.rank}` : ''}`} value={r.rank}>
          <span className="hr-rank"><RankMedal rank={r.rank} /></span>
          <TierBadge tier={r.tier} division={r.division} />
          <span className="hr-name">{r.nickname}{r.me && <em>나</em>}</span>
          <span className="rk-tier">{r.tierName}</span>
          <b className="hr-count">{Number(r.count).toLocaleString()}<small>문제</small></b>
        </li>)}
      </ol>
    </div>
    {shown.length > limit && <button type="button" className="rk-more" onClick={() => setLimit(n => n + PAGE)}>더 보기 ({limit}/{shown.length})</button>}
  </div>;
}
