import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import { visitorId } from '../track';
import TierBadge from './TierBadge';
import './HomeRank.css';

// 첫 화면 맨 위 "실시간 순위" 카드. 1~3위는 시상대, 4~5위는 짧은 줄, 내 순위는 맨 아래에 고정한다.
// 읽기만 한다(문제 수 보고 · 기기 동기화는 전체 순위 화면의 SolveRank가 맡는다).
// 서버가 잠들어 있어도 첫 화면이 늦어지지 않게, 마지막으로 받은 순위를 먼저 보여 주고 새 순위로 바꾼다
const CACHE = 'home-rank:v1';
const LIST = 5;
const PODIUM_ORDER = [1, 0, 2]; // 2위 · 1위 · 3위 순서로 놓아 1위가 가운데 오게 한다

function readCache() {
  try {
    const v = JSON.parse(localStorage.getItem(CACHE));
    return v && Array.isArray(v.top) ? v : null;
  } catch { return null; }
}

export default function HomeRank() {
  const [rank, setRank] = useState(readCache);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const headers = { 'X-Visitor-Id': visitorId(), ...(account() ? { Authorization: `Bearer ${account().token}` } : {}) };
    api.get('/rank/solved', { headers, signal: controller.signal, timeout: 90000 })
      .then(({ data }) => {
        if (!data || !Array.isArray(data.top)) return;
        setRank(data);
        try { localStorage.setItem(CACHE, JSON.stringify({ top: data.top, totalSolvers: data.totalSolvers, totalSolved: data.totalSolved, me: data.me })); } catch { /* 저장 못 해도 화면은 그대로 */ }
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);

  const top = rank?.top.slice(0, LIST) || [];
  const podium = PODIUM_ORDER.map(i => top[i]).filter(Boolean);
  const rest = top.slice(3);
  const me = rank?.me && rank.me.rank > LIST ? rank.me : null;

  return <section className="hr" aria-labelledby="hr-title">
    <header className="hr-head">
      <h2 id="hr-title"><i className="hr-live" aria-hidden="true" />실시간 순위</h2>
      {rank && <span className="hr-total">{(rank.totalSolvers || 0).toLocaleString()}명 참여</span>}
      <Link to="/all" className="hr-more">전체 보기</Link>
    </header>

    {!rank ? <p className="hr-empty" role="status">{failed ? '순위를 불러오지 못했어요.' : '순위를 불러오는 중…'}</p> : <>
      <ol className="hr-podium" aria-label="1위부터 3위">
        {podium.map(r => <li key={r.rank} className={`hr-step p${r.rank}${r.me ? ' me' : ''}`} value={r.rank}>
          <span className="hr-medal">{r.rank}</span>
          <TierBadge tier={r.tier} division={r.division} />
          <b className="hr-pname" title={r.nickname}>{r.nickname}</b>
          <span className="hr-pcount">{Number(r.count).toLocaleString()}문제</span>
        </li>)}
      </ol>
      {(rest.length > 0 || me) && <ol className="hr-list" start={4}>
        {rest.map(r => <Row key={r.rank} r={r} />)}
        {me && <Row r={{ ...me, me: true }} pinned />}
      </ol>}
      {!rank.me && <p className="hr-hint">문제를 풀면 내 순위가 여기 생겨요</p>}
    </>}
  </section>;
}

function Row({ r, pinned }) {
  return <li className={`hr-row${r.me ? ' me' : ''}${pinned ? ' pinned' : ''}`} value={r.rank}>
    <span className="hr-rank">{r.rank}</span>
    <TierBadge tier={r.tier} division={r.division} />
    <span className="hr-name">{r.nickname}{r.me && <em>나</em>}</span>
    <b className="hr-count">{Number(r.count).toLocaleString()}</b>
  </li>;
}
