import { useEffect, useState } from 'react';
import api from '../api';
import { account } from '../sync';
import { visitorId } from '../track';
import TierBadge from './TierBadge';
import './HomeRank.css';

// 첫 화면 순위표. 읽기만 한다(문제 수 보고 · 기기 동기화는 전체 순위 화면의 SolveRank가 맡는다).
// 서버가 잠들어 있어도 첫 화면이 늦어지지 않게, 마지막으로 받은 순위를 먼저 보여 주고 새 순위로 바꾼다
const CACHE = 'home-rank:v1';
const SHOW = 5;

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

  if (!rank) return <div className="hr-card"><p className="hr-empty" role="status">{failed ? '순위를 불러오지 못했어요. 잠시 후 새로고침해 주세요.' : '순위를 불러오는 중…'}</p></div>;

  const top = rank.top.slice(0, SHOW);
  const me = rank.me && rank.me.rank > SHOW ? rank.me : null;
  return <div className="hr-card">
    <ol className="hr-list">
      {top.map(r => <Row key={`${r.rank}-${r.nickname}`} r={r} />)}
      {me && <><li className="hr-gap" aria-hidden="true">⋯</li><Row r={{ ...me, me: true }} /></>}
    </ol>
    <div className="hr-foot">
      <span>{(rank.totalSolvers || 0).toLocaleString()}명이 함께 {(rank.totalSolved || 0).toLocaleString()}문제를 풀었어요</span>
      {!rank.me && <span className="hr-hint">문제를 풀면 내 순위가 생겨요</span>}
    </div>
  </div>;
}

function Row({ r }) {
  return <li className={`hr-row${r.me ? ' me' : ''}${r.rank <= 3 ? ` top${r.rank}` : ''}`}>
    <span className="hr-rank">{r.rank}</span>
    <TierBadge tier={r.tier} division={r.division} />
    <span className="hr-name">{r.nickname}{r.me && <em> 나</em>}</span>
    <span className="hr-tier">{r.tierName}</span>
    <b className="hr-count">{Number(r.count).toLocaleString()}<small>문제</small></b>
  </li>;
}
