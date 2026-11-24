import { useEffect, useState } from 'react';
import api from '../api';
import { membershipHeaders, TIER_NAMES } from '../membership';
import { PROFILE_AVATARS, PROFILE_INTERESTS, PROFILE_MAX_INTERESTS, PROFILE_MAX_TEXT } from '../data/profileOptions';
import TierBadge from './TierBadge';
import './ProfileCard.css';

const EMPTY = { avatar: null, bio: null, goal: null, interests: [] };
const labelOf = key => PROFILE_INTERESTS.find(i => i.key === key)?.label || key;
const length = text => [...(text || '')].length;

// 다음 등급(또는 다음 단계)까지 얼마나 왔는지 0~1
function progressOf(m) {
  if (!m || m.nextThreshold == null) return 1;
  const span = m.nextThreshold - (m.currentThreshold || 0);
  return span > 0 ? Math.min(1, Math.max(0, (m.solvedCount - (m.currentThreshold || 0)) / span)) : 1;
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
  const avatar = profile.avatar || [...(user.nickname || '?')][0];

  return (
    <section className="profile-card" aria-label="내 프로필">
      <div className="profile-main">
        <span className={`profile-avatar${profile.avatar ? ' emoji' : ''}`} aria-hidden="true">{avatar}</span>
        <div className="profile-who">
          <div className="profile-name">
            <strong>{user.nickname}</strong>
            {m && <TierBadge tier={m.tier} division={m.division} />}
            {m && <span className="profile-tier-name">{m.tierName || TIER_NAMES[m.tier]}</span>}
          </div>
          <p className={`profile-bio${profile.bio ? '' : ' is-empty'}`}>{profile.bio || '한 줄 소개를 적어 보세요.'}</p>
          {profile.interests.length > 0 && (
            <ul className="profile-interests" aria-label="관심 분야">
              {profile.interests.map(k => <li key={k}>{labelOf(k)}</li>)}
            </ul>
          )}
        </div>
        {!draft && (
          <button type="button" className="ds-btn ds-btn--ghost ds-btn--sm profile-edit"
            onClick={() => { setMessage(''); setDraft({ avatar: profile.avatar, bio: profile.bio || '', goal: profile.goal || '', interests: [...profile.interests] }); }}>
            프로필 꾸미기
          </button>
        )}
      </div>

      <div className="profile-progress">
        <div className="profile-progress-text">
          {profile.goal && <span className="profile-goal">🎯 {profile.goal}</span>}
          {tier?.loading ? <span>등급을 불러오는 중…</span>
            : !m ? <span>등급을 불러오지 못했어요.</span>
            : m.nextThreshold == null ? <span>최고 등급이에요! 누적 {m.solvedCount.toLocaleString()}문제</span>
            : <span>누적 <b>{m.solvedCount.toLocaleString()}</b>문제 · <b>{m.nextTierName || TIER_NAMES[m.nextTier]}</b>까지 <b>{m.remaining.toLocaleString()}</b>문제</span>}
        </div>
        {m && <span className="profile-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="다음 등급까지 진행">
          <i style={{ width: `${percent}%` }} />
        </span>}
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
