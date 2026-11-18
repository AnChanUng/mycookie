import { useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { onNicknameChange, savedNickname } from '../nickname';
import { useMembership } from '../membership';
import TierBadge from './TierBadge';

const snapshot = () => `${account()?.token || ''}:${account()?.nickname || ''}:${savedNickname()}`;
const subscribe = listener => {
  const offAccount = onAccountChange(listener), offNickname = onNicknameChange(listener);
  return () => { offAccount(); offNickname(); };
};
export default function MemberMenu() {
  const identity = useSyncExternalStore(subscribe, snapshot, () => '');
  const location = useLocation();
  const { membership, loading, error } = useMembership(`${identity}:${location.pathname}`);
  const nickname = membership?.nickname || account()?.nickname || savedNickname() || '방문자';
  return <div className="member-menu-actions">
    <Link to="/account#settings" className={`account-nav-link member-menu${location.pathname.startsWith('/account') ? ' active' : ''}`}
      aria-label={`${membership?.tierName || ''} ${nickname} 본인 설정`.trim()} title="본인 설정 · 닉네임 변경과 내 등급">
      {membership ? <TierBadge tier={membership.tier} division={membership.division} /> : <span className="member-tier-status">{loading ? '등급 확인 중' : error ? '등급 확인 필요' : '내 계정'}</span>}
      <span className="member-menu-name">{nickname}</span><span aria-hidden="true">⌄</span>
    </Link>
  </div>;
}
