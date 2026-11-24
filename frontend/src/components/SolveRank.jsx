import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { visitorId } from '../track';
import { NICKNAME_MAX, cleanNickname, saveNickname, savedNickname } from '../nickname';
import { BANKS, PRIVATE_BANK_KEYS } from '../data/examQuestions';
import { syncAllProgress } from '../hooks/useExamProgress';
import { account, onAccountChange } from '../sync';
import TierBadge, { CookieIcon } from './TierBadge';
import ProfileAvatar from './ProfileAvatar';
import { usePublicLooks } from '../profileStore';
import RankMedal from './RankMedal';
import TierGuide from './TierGuide';

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 5000;
const identitySnapshot = () => `${account()?.token || ''}:${account()?.nickname || ''}`;

// 이 브라우저에 남은 풀이 기록에서 한 번이라도 푼 문제를 센다. 같은 문제를 여러 번 풀어도 한 문제다
function solvedCount() {
  let count = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('exam-progress:')) {
        try { count += Object.keys(JSON.parse(localStorage.getItem(key))?.stats || {}).length; } catch { /* 깨진 기록은 건너뛴다 */ }
      } else if (key.startsWith('cospro:solved:') && localStorage.getItem(key) === 'pass') {
        count++;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return count;
}

// 로그인해 있으면 다른 기기에서 푼 기록을 모두 받아 온다. 문제은행을 하나씩 열지 않아도 푼 문제 수가 맞게 나온다.
// 문제은행 수만큼 서버를 부르므로 한동안은 다시 하지 않는다
const SYNC_KEYS = [...BANKS.map(b => b.key), ...PRIVATE_BANK_KEYS, 'topics', 'bug-hunt'];
const SYNC_AT = 'sync:all-at';
const SYNC_EVERY_MS = 10 * 60 * 1000;

function pullOtherDevices() {
  if (!account()) return null;
  const key = `${SYNC_AT}:${account().id || account().nickname}`;
  const token = account().token;
  try {
    if (Date.now() - Number(sessionStorage.getItem(key) || 0) < SYNC_EVERY_MS) return null;
  } catch { /* storage unavailable */ }
  return syncAllProgress(SYNC_KEYS).then(result => {
    if (account()?.token === token) {
      try { sessionStorage.setItem(key, String(Date.now())); } catch { /* storage unavailable */ }
    }
    return result;
  });
}

// 문제를 많이 푼 사람 순위. 지금까지 푼 문제 수를 서버에 알리고 순위를 받아 온다
export default function SolveRank() {
  const identity = useSyncExternalStore(onAccountChange, identitySnapshot, () => '');
  const user = account();
  const cacheKey = `rank:last:v1:${user ? `user:${user.id || user.nickname}` : `visitor:${visitorId()}`}`;
  return <SolveRankContent key={identity} cacheKey={cacheKey} />;
}

function validRank(value) {
  const row = r => r && Number.isFinite(r.rank) && Number.isFinite(r.count) && typeof r.nickname === 'string';
  return value && Array.isArray(value.top) && value.top.every(row) && (!value.me || row(value.me));
}
function readRank(key) {
  try { const value = JSON.parse(localStorage.getItem(key)); return validRank(value) ? value : null; }
  catch { return null; }
}

function SolveRankContent({ cacheKey }) {
  const [rank, setRank] = useState(() => readRank(cacheKey));
  const [settledTick, setSettledTick] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let stale = false;
    let timer;
    const id = visitorId();
    const count = solvedCount();
    // 로그인한 기기는 계정을 함께 알려, 같은 계정의 다른 기기와 순위에서 한 줄로 합쳐지게 한다
    const token = account()?.token;
    // 내 문제 수를 먼저 알린 뒤 순위를 받는다. 잠든 서버가 깨어나는 동안에도 기다렸다가 보여 준다
    const load = (attempt) => {
      const report = id && count > 0
        ? api.put('/rank/solved', { visitorId: id, count }, { headers: token ? { Authorization: `Bearer ${token}` } : {}, timeout: 180000 }).catch(() => {})
        : Promise.resolve();
      report
        .then(() => api.get('/rank/solved', { params: { all: true }, headers: { ...(id ? { 'X-Visitor-Id': id } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, timeout: 180000 }))
        .then(res => {
          if (stale) return;
          if (!validRank(res.data)) throw new Error('Invalid ranking response');
          setRank(res.data);
          setFailed(false);
          setSettledTick(tick);
          try { localStorage.setItem(cacheKey, JSON.stringify(res.data)); } catch { /* display works without storage */ }
        })
        .catch(() => {
          if (stale) return;
          // 깨어나는 중인 서버는 요청을 한두 번 놓치기도 한다. 잠시 뒤 다시 받아 본다
          if (attempt < MAX_RETRIES) timer = setTimeout(() => load(attempt + 1), RETRY_DELAY_MS);
          else { setFailed(true); setSettledTick(tick); }
        });
    };
    load(0);
    // 다른 기기 기록을 받아 푼 문제 수가 달라졌으면 순위를 다시 받는다
    pullOtherDevices()?.then(() => { if (!stale && solvedCount() !== count) setTick(t => t + 1); }).catch(() => {});
    return () => { stale = true; clearTimeout(timer); };
  }, [tick, cacheKey]);

  // 여러 번 다시 받아 봐도 순위를 주지 못하면 자리만 차지하지 않게 비워 둔다
  // 순위에 나온 사람들의 대표 아이콘(고른 사람만). 아래의 조건부 return보다 먼저 불러야 한다
  const looks = usePublicLooks([...(rank?.top || []).map(r => r.nickname), rank?.me?.nickname]);
  if (failed && !rank) return null;

  const save = (e) => {
    e.preventDefault();
    const name = cleanNickname(draft);
    const id = visitorId();
    if (!name || !id) return;
    setError('');
    api.put('/profile', { visitorId: id, nickname: name }, { timeout: 20000 })
      .then(() => { saveNickname(name); setNaming(false); setTick(t => t + 1); })
      .catch(err => setError(err.response?.data?.error || '저장하지 못했습니다.'));
  };

  // 5위 밖이면 내 기록을 목록 아래에 한 줄 덧붙인다
  const me = rank?.me;
  const visible = rank ? (expanded ? rank.top : rank.top.slice(0, 5)) : [];
  const rows = me && !visible.some(r => r.me) ? [...visible, { ...me, me: true }] : visible;

  return (
    <aside className="solve-rank">
      <div className="solve-rank-head">
        <div className="solve-rank-title"><h2><button className="solve-rank-toggle" type="button" aria-expanded={expanded} aria-controls="solve-rank-results" onClick={() => setExpanded(value => !value)}><span className="solve-rank-icon"><CookieIcon tier="GOLD" /></span> {expanded ? '전체 순위' : '순위'} <small>{expanded ? '접기 ↑' : '전체 보기 ↓'}</small></button></h2><TierGuide /></div>
        {rank && Number.isFinite(rank.totalSolved) && <p className="solve-rank-total" aria-label={`전체 총 ${rank.totalSolved.toLocaleString()}문제 풀이 완료`}>전체 <strong>{rank.totalSolved.toLocaleString()}</strong>문제</p>}
      </div>

      {rank && <p className="solve-rank-empty" role="status">{settledTick !== tick ? '저장된 순위 · 업데이트 중…' : failed ? '업데이트하지 못했어요 · 마지막 순위 표시 중' : '최신 조회 결과'}</p>}
      <div id="solve-rank-results" className={expanded ? 'solve-rank-expanded' : undefined}>
      {!rank && <p className="solve-rank-empty">순위를 불러오는 중...</p>}
      {rank && rows.length === 0 && <p className="solve-rank-empty">아직 순위가 없습니다. 첫 번째로 이름을 올려 보세요.</p>}
      {rows.length > 0 && (
        <ol className="solve-rank-list">
          {rows.map(r => (
            <li key={r.rank} className={r.me ? 'me' : ''}>
              <span className="solve-rank-no"><RankMedal rank={r.rank} /></span>
              <span className="solve-rank-name"><ProfileAvatar look={looks[r.nickname]} size={22} /><span className="solve-rank-nickname" title={r.nickname}>{r.nickname}</span><TierBadge tier={r.tier} division={r.division} />{r.me && <em>나</em>}</span>
              <span className="solve-rank-count">{r.count.toLocaleString()}문제</span>
            </li>
          ))}
        </ol>
      )}

      {rank && !me && (
        <p className="solve-rank-empty"><Link to="/exam">한 세트 풀고</Link> 순위에 올라 보세요.</p>
      )}
      </div>

      {rank && (naming ? (
        <form className="solve-rank-nick" onSubmit={save}>
          <input value={draft} onChange={e => setDraft(e.target.value)} maxLength={NICKNAME_MAX} placeholder="순위에 보일 닉네임" autoFocus aria-label="닉네임" />
          <button type="submit">저장</button>
          <button type="button" onClick={() => setNaming(false)}>취소</button>
          {error && <span className="solve-rank-error" role="alert">{error}</span>}
        </form>
      ) : (
        <div className="solve-rank-nick">
          <span>
            {rank.nickname
              ? <>내 닉네임 <b>{rank.nickname}</b></>
              : me ? <>익명 닉네임 <b>{me.nickname}</b></> : '닉네임을 정하지 않으면 익명 닉네임으로 나옵니다.'}
          </span>
          {!rank.account && (
            <button type="button" onClick={() => { setDraft(rank.nickname || savedNickname()); setNaming(true); }}>
              {rank.nickname ? '바꾸기' : '닉네임 정하기'}
            </button>
          )}
        </div>
      ))}
      {/* 로그인하지 않은 기기는 순위에 따로 나온다. 같은 계정으로 로그인하면 한 줄로 합쳐진다 */}
      {rank && me && !rank.account && !account() && (
        <p className="solve-rank-empty">폰과 PC가 따로 나오나요? <Link to="/exam">같은 계정으로 로그인</Link>하면 합쳐집니다.</p>
      )}
    </aside>
  );
}
