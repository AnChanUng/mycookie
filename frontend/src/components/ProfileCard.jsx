import { useEffect, useState } from 'react';
import api from '../api';
import { membershipHeaders, TIER_NAMES } from '../membership';
import { PROFILE_AVATARS, PROFILE_FRAMES, PROFILE_INTERESTS, PROFILE_MAX_INTERESTS, PROFILE_MAX_TEXT, PROFILE_THEMES, TIER_ORDER, isUnlocked } from '../data/profileOptions';
import TierBadge from './TierBadge';
import './ProfileCard.css';

const EMPTY = { avatar: null, bio: null, goal: null, interests: [], theme: null, frame: null };
const labelOf = key => PROFILE_INTERESTS.find(i => i.key === key)?.label || key;
const length = text => [...(text || '')].length;

// 다음 등급(또는 다음 단계)까지 얼마나 왔는지 0~1
function progressOf(m) {
  if (!m || m.nextThreshold == null) return 1;
  const span = m.nextThreshold - (m.currentThreshold || 0);
  return span > 0 ? Math.min(1, Math.max(0, (m.solvedCount - (m.currentThreshold || 0)) / span)) : 1;
}

// 지금 등급 바로 다음 등급과, 그 등급이 되면 열리는 테마 · 테두리
function nextRewards(tier) {
  const next = TIER_ORDER[TIER_ORDER.indexOf(tier || 'BRONZE') + 1];
  if (!next) return null;
  const items = [...PROFILE_THEMES.filter(t => t.minTier === next).map(t => `${t.label} 테마`),
    ...PROFILE_FRAMES.filter(f => f.minTier === next).map(f => f.label)];
  return items.length ? { tier: next, items } : null;
}

// 마이페이지 맨 위 프로필 카드. 대표 아이콘 · 한 줄 소개 · 관심 분야 · 목표를 꾸미고, 등급과 다음 등급까지 진행을 함께 보여 준다
export default function ProfileCard({ user, tier }) {
  const [profile, setProfile] = useState(EMPTY);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/me/profile', { headers: membershipHeaders(), signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted && data) setProfile({ ...EMPTY, ...data, interests: Array.isArray(data.interests) ? data.interests : [] }); })
      .catch(() => { /* 프로필을 못 불러와도 기본 카드는 보여 준다 */ });
    return () => controller.abort();
  }, [user.token]);

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await api.put('/me/profile', draft, { headers: membershipHeaders(), timeout: 15000 });
      setProfile({ ...EMPTY, ...data, interests: Array.isArray(data.interests) ? data.interests : [] });
      setDraft(null);
      setMessage('프로필을 저장했어요.');
    } catch (error) {
      setMessage(error?.response?.data?.error || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };
  const toggleInterest = key => setDraft(d => {
    const has = d.interests.includes(key);
    if (!has && d.interests.length >= PROFILE_MAX_INTERESTS) return d;
    return { ...d, interests: has ? d.interests.filter(k => k !== key) : [...d.interests, key] };
  });

  const m = tier?.membership;
  const percent = Math.round(progressOf(m) * 100);
  // 꾸미는 동안에는 고르는 대로 카드에 바로 보여 준다
  const shown = draft ? { ...profile, ...draft } : profile;
  const avatar = shown.avatar || [...(user.nickname || '?')][0];
  const theme = PROFILE_THEMES.find(t => t.key === shown.theme) || PROFILE_THEMES[0];
  const frame = shown.frame && shown.frame !== 'none' ? shown.frame : null;
  const rewards = m ? nextRewards(m.tier) : null;
  const lockText = minTier => `${TIER_NAMES[minTier]}부터`;

  return (
    <section className="profile-card" aria-label="내 프로필" style={{ '--profile-accent': theme.color }}>
      <div className="profile-main">
        <span className={`profile-avatar${shown.avatar ? ' emoji' : ''}${frame ? ` frame-${frame}` : ''}`} aria-hidden="true">{avatar}</span>
        <div className="profile-who">
          <div className="profile-name">
            <strong>{user.nickname}</strong>
            {m && <TierBadge tier={m.tier} division={m.division} />}
            {m && <span className="profile-tier-name">{m.tierName || TIER_NAMES[m.tier]}</span>}
          </div>
          <p className={`profile-bio${shown.bio ? '' : ' is-empty'}`}>{shown.bio || '한 줄 소개를 적어 보세요.'}</p>
          {shown.interests.length > 0 && (
            <ul className="profile-interests" aria-label="관심 분야">
              {shown.interests.map(k => <li key={k}>{labelOf(k)}</li>)}
            </ul>
          )}
        </div>
        {!draft && (
          <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm profile-edit"
            onClick={() => { setMessage(''); setDraft({ avatar: profile.avatar, bio: profile.bio || '', goal: profile.goal || '', interests: [...profile.interests], theme: profile.theme, frame: profile.frame }); }}>
            프로필 꾸미기
          </button>
        )}
      </div>

      <div className="profile-progress">
        <div className="profile-progress-text">
          {shown.goal && <span className="profile-goal">🎯 {shown.goal}</span>}
          {tier?.loading ? <span>등급을 불러오는 중…</span>
            : !m ? <span>등급을 불러오지 못했어요.</span>
            : m.nextThreshold == null ? <span>최고 등급이에요! 누적 {m.solvedCount.toLocaleString()}문제</span>
            : <span>누적 <b>{m.solvedCount.toLocaleString()}</b>문제 · <b>{m.nextTierName || TIER_NAMES[m.nextTier]}</b>까지 <b>{m.remaining.toLocaleString()}</b>문제</span>}
        </div>
        {m && <span className="profile-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="다음 등급까지 진행">
          <i style={{ width: `${percent}%` }} />
        </span>}
        {rewards && <p className="profile-rewards"><span aria-hidden="true">🔓</span> <b>{TIER_NAMES[rewards.tier]}</b>가 되면 열려요: {rewards.items.join(' · ')}</p>}
      </div>

      {draft && (
        <div className="profile-editor">
          <fieldset>
            <legend>대표 아이콘</legend>
            <div className="profile-avatar-grid">
              <button type="button" className={!draft.avatar ? 'on' : ''} aria-pressed={!draft.avatar} onClick={() => setDraft(d => ({ ...d, avatar: null }))}
                aria-label="닉네임 첫 글자 쓰기">{[...(user.nickname || '?')][0]}</button>
              {PROFILE_AVATARS.map(a => (
                <button type="button" key={a} className={draft.avatar === a ? 'on' : ''} aria-pressed={draft.avatar === a}
                  onClick={() => setDraft(d => ({ ...d, avatar: a }))} aria-label={`아이콘 ${a}`}>{a}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>카드 테마 <small>등급이 오르면 더 열려요</small></legend>
            <div className="profile-theme-pick">
              {PROFILE_THEMES.map(t => {
                const open = isUnlocked(t.minTier, m?.tier);
                const on = (draft.theme || 'basic') === t.key;
                return <button type="button" key={t.key} className={on ? 'on' : ''} aria-pressed={on} disabled={!open}
                  style={{ '--swatch': t.color }} onClick={() => setDraft(d => ({ ...d, theme: t.key === 'basic' ? null : t.key }))}
                  aria-label={open ? `${t.label} 테마` : `${t.label} 테마, ${lockText(t.minTier)}`}>
                  <i aria-hidden="true" />{t.label}{!open && <small>🔒 {lockText(t.minTier)}</small>}
                </button>;
              })}
            </div>
          </fieldset>
          <fieldset>
            <legend>아이콘 테두리</legend>
            <div className="profile-frame-pick">
              {PROFILE_FRAMES.map(f => {
                const open = isUnlocked(f.minTier, m?.tier);
                const on = (draft.frame || 'none') === f.key;
                return <button type="button" key={f.key} className={on ? 'on' : ''} aria-pressed={on} disabled={!open}
                  onClick={() => setDraft(d => ({ ...d, frame: f.key === 'none' ? null : f.key }))}
                  aria-label={open ? f.label : `${f.label}, ${lockText(f.minTier)}`}>
                  <span className={`profile-frame-sample${f.key !== 'none' ? ` frame-${f.key}` : ''}`} aria-hidden="true">{[...(user.nickname || '?')][0]}</span>
                  {f.label}{!open && <small>🔒 {lockText(f.minTier)}</small>}
                </button>;
              })}
            </div>
          </fieldset>
          <label>
            <span>한 줄 소개 <small>{length(draft.bio)}/{PROFILE_MAX_TEXT}</small></span>
            <input value={draft.bio} maxLength={PROFILE_MAX_TEXT * 2} placeholder="예: 백엔드 개발자를 준비하고 있어요"
              onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))} aria-label="한 줄 소개" />
          </label>
          <label>
            <span>목표 <small>{length(draft.goal)}/{PROFILE_MAX_TEXT}</small></span>
            <input value={draft.goal} maxLength={PROFILE_MAX_TEXT * 2} placeholder="예: 12월까지 금 쿠키 달성"
              onChange={e => setDraft(d => ({ ...d, goal: e.target.value }))} aria-label="목표" />
          </label>
          <fieldset>
            <legend>관심 분야 <small>{draft.interests.length}/{PROFILE_MAX_INTERESTS}</small></legend>
            <div className="profile-interest-pick">
              {PROFILE_INTERESTS.map(i => {
                const on = draft.interests.includes(i.key);
                return <button type="button" key={i.key} className={on ? 'on' : ''} aria-pressed={on}
                  disabled={!on && draft.interests.length >= PROFILE_MAX_INTERESTS} onClick={() => toggleInterest(i.key)}>{i.label}</button>;
              })}
            </div>
          </fieldset>
          <div className="profile-editor-actions">
            <button type="button" className="ds-btn ds-btn--primary ds-btn--sm" disabled={busy || length(draft.bio) > PROFILE_MAX_TEXT || length(draft.goal) > PROFILE_MAX_TEXT} onClick={save}>저장</button>
            <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm" disabled={busy} onClick={() => { setDraft(null); setMessage(''); }}>취소</button>
          </div>
        </div>
      )}
      {message && <p className="profile-message" role={draft ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}
