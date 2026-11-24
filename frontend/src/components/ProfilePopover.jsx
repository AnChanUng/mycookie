import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import { membershipHeaders } from '../membership';
import { PROFILE_INTERESTS, PROFILE_THEMES } from '../data/profileOptions';
import TierBadge from './TierBadge';
import '../styles/profile-frames.css';
import './ProfilePopover.css';

// 채팅 · 순위에서 닉네임을 누르면 뜨는 작은 프로필 카드.
// 아이콘 · 등급 · 한 줄 소개 · 관심 분야를 보여 주고, 로그인했으면 친구 요청 · 1:1 대화로 바로 이어 준다(목표는 보이지 않는다)

const CARD_WIDTH = 300;
const cache = new Map(); // 닉네임 → { data | null(계정 아님), at }
const KEEP_MS = 60 * 1000;
const labelOf = key => PROFILE_INTERESTS.find(i => i.key === key)?.label || key;
const config = () => ({ headers: membershipHeaders(), timeout: 15000 });

// 1:1 대화 버튼: 채팅 창(StudyCount)이 이 신호를 받아 창을 열고 그 사람과의 대화로 간다
export const OPEN_DIRECT_EVENT = 'mycookie:open-direct';

async function loadCard(nickname) {
  const hit = cache.get(nickname);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.data;
  try {
    const { data } = await api.get(`/profiles/public/${encodeURIComponent(nickname)}`, { timeout: 15000 });
    cache.set(nickname, { data, at: Date.now() });
    return data;
  } catch (error) {
    if (error?.response?.status === 404) { cache.set(nickname, { data: null, at: Date.now() }); return null; }
    throw error;
  }
}

// 닉네임을 감싸는 버튼. 누르면 그 옆에 프로필 카드가 뜬다
export function ProfileName({ nickname, className = '', children }) {
  const [anchor, setAnchor] = useState(null);
  const button = useRef(null);
  if (!nickname) return children || null;
  return <>
    <button type="button" ref={button} className={`profile-name-btn ${className}`.trim()} aria-haspopup="dialog" aria-expanded={!!anchor}
      onClick={e => { e.stopPropagation(); setAnchor(a => (a ? null : button.current.getBoundingClientRect())); }}>
      {children || nickname}
    </button>
    {anchor && createPortal(<ProfilePopover nickname={nickname} anchor={anchor} onClose={() => setAnchor(null)} returnFocus={button} />, document.body)}
  </>;
}

function ProfilePopover({ nickname, anchor, onClose, returnFocus }) {
  const [state, setState] = useState({ loading: true, data: null, error: false });
  const [relation, setRelation] = useState(null); // { friendship, threadId }
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const box = useRef(null);
  const [pos, setPos] = useState({ top: anchor.bottom + 8, left: anchor.left });
  const me = account();
  const isMe = !!me && me.nickname === nickname;

  useEffect(() => {
    let alive = true;
    loadCard(nickname).then(data => { if (alive) setState({ loading: false, data, error: false }); })
      .catch(() => { if (alive) setState({ loading: false, data: null, error: true }); });
    return () => { alive = false; };
  }, [nickname]);

  // 친구 관계(로그인했고, 계정인 다른 사람일 때만)
  const loadRelation = useCallback(async () => {
    if (!account() || isMe) return;
    try {
      const { data } = await api.post('/direct/members', { nicknames: [nickname] }, config());
      setRelation(Array.isArray(data) && data[0] ? data[0] : null);
    } catch { /* 관계를 못 불러와도 카드는 보여 준다 */ }
  }, [nickname, isMe]);
  useEffect(() => { if (state.data) loadRelation(); }, [state.data, loadRelation]);

  // 화면 밖으로 나가지 않게 자리를 잡는다. 아래가 모자라면 위로 띄운다
  useLayoutEffect(() => {
    const h = box.current?.offsetHeight || 260;
    const left = Math.min(Math.max(8, anchor.left), window.innerWidth - CARD_WIDTH - 8);
    const below = anchor.bottom + 8;
    const top = below + h > window.innerHeight - 8 ? Math.max(8, anchor.top - h - 8) : below;
    setPos({ top, left });
  }, [anchor, state, relation, note]);

  // 바깥을 누르거나 Esc, 스크롤하면 닫는다
  useEffect(() => {
    const close = () => onClose();
    // 이름 버튼을 다시 누른 건 버튼이 직접 닫으므로 여기서는 건너뛴다
    const onDown = e => { if (!box.current?.contains(e.target) && !returnFocus.current?.contains(e.target)) close(); };
    const onKey = e => { if (e.key === 'Escape') { close(); returnFocus.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true);
    };
  }, [onClose, returnFocus]);

  const requestFriend = async () => {
    setBusy(true); setNote('');
    try {
      let threadId = relation?.threadId;
      if (!threadId) threadId = (await api.post('/direct', { nickname }, config())).data.id;
      const action = relation?.friendship === 'received' ? 'accept' : 'request';
      await api.post(`/direct/${threadId}/friend`, { action }, config());
      setNote(action === 'accept' ? '이제 친구예요!' : '친구 요청을 보냈어요.');
      await loadRelation();
    } catch (error) {
      setNote(error?.response?.data?.error || '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };
  const openDirect = () => {
    window.dispatchEvent(new CustomEvent(OPEN_DIRECT_EVENT, { detail: { nickname } }));
    onClose();
  };

  const d = state.data;
  const theme = PROFILE_THEMES.find(t => t.key === d?.theme) || PROFILE_THEMES[0];
  const initial = [...(nickname || '?')][0];
  const frame = d?.frame ? ` frame-${d.frame}` : '';
  const friendLabel = { none: '친구 요청', sent: '요청 보냄', received: '친구 수락', friends: '친구 ✓' }[relation?.friendship || 'none'];

  return (
    <div ref={box} className="profile-pop" role="dialog" aria-label={`${nickname} 프로필`} style={{ top: pos.top, left: pos.left, width: CARD_WIDTH, '--profile-accent': theme.color }}>
      <div className="profile-pop-banner" aria-hidden="true" />
      <div className="profile-pop-body">
        <div className="profile-pop-head">
          <span className={`profile-pop-avatar${d?.avatar ? ' emoji' : ''}${frame}`} aria-hidden="true">{d?.avatar || initial}</span>
          {d && <span className="profile-pop-tier" title={d.tierName}><TierBadge tier={d.tier} division={d.division} /></span>}
        </div>
        <strong className="profile-pop-name">{nickname}</strong>
        {state.loading ? <p className="profile-pop-muted">불러오는 중…</p>
          : state.error ? <p className="profile-pop-muted">프로필을 불러오지 못했어요.</p>
          : !d ? <p className="profile-pop-muted">로그인하지 않은 방문자예요.</p>
          : <>
            <p className="profile-pop-meta"><b>{d.tierName}</b> · 누적 {Number(d.solvedCount || 0).toLocaleString()}문제</p>
            {d.bio && <p className="profile-pop-bio">{d.bio}</p>}
            {d.interests?.length > 0 && <ul className="profile-pop-tags" aria-label="관심 분야">{d.interests.map(k => <li key={k}>#{labelOf(k)}</li>)}</ul>}
            <div className="profile-pop-actions">
              {isMe ? <Link to="/account" className="profile-pop-btn primary" onClick={onClose}>내 프로필 꾸미기</Link>
                : !me ? <Link to="/account" className="profile-pop-btn primary" onClick={onClose}>로그인하고 친구 맺기</Link>
                : <>
                  <button type="button" className="profile-pop-btn primary" disabled={busy || relation?.friendship === 'sent' || relation?.friendship === 'friends'} onClick={requestFriend}>{friendLabel}</button>
                  <button type="button" className="profile-pop-btn" disabled={busy} onClick={openDirect}>1:1 대화</button>
                </>}
            </div>
            {note && <p className="profile-pop-note" role="status">{note}</p>}
          </>}
      </div>
    </div>
  );
}
