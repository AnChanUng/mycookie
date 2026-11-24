import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { account, onAccountChange, signOut } from '../sync';
import { onNicknameChange, savedNickname } from '../nickname';
import { useMembership } from '../membership';
import TierBadge from './TierBadge';
import ProfileAvatar from './ProfileAvatar';
import { useMyProfile } from '../profileStore';
import useRoles, { canOpenPrivateBanks } from '../useRoles';
import { privateBanksPath } from '../privatePath';

const snapshot = () => `${account()?.token || ''}:${account()?.nickname || ''}:${savedNickname()}`;
const subscribe = listener => {
  const offAccount = onAccountChange(listener), offNickname = onNicknameChange(listener);
  return () => { offAccount(); offNickname(); };
};

const LINKS = [
  { to: '/stats', label: '내 학습 자세히 보기' },
  { to: '/weak', label: '오답노트' },
  { to: '/account#settings', label: '계정 설정' },
];

// 헤더 오른쪽 내 계정. 누르면 내 등급, 학습 현황, 바로가기, 로그아웃이 담긴 메뉴가 열린다
export default function MemberMenu() {
  const identity = useSyncExternalStore(subscribe, snapshot, () => '');
  const location = useLocation();
  const { membership, loading, error } = useMembership(`${identity}:${location.pathname}`);
  const mine = useMyProfile();
  const signedIn = !!account()?.token;
  const access = useRoles();
  const showCareer = access.signedIn && !access.loading && access.roles.includes('OWNER');
  // 비공개 문제집을 볼 수 있는 계정에게만 바로가기를 보여 준다(찬웅은 [취업] 안찬웅 안에서 들어간다)
  // 관리자 계정(ADMIN 권한)에게만 관리자 페이지 바로가기를 보여 준다
  const showAdmin = access.signedIn && !access.loading && access.roles.includes('ADMIN');
  const showBanks = access.signedIn && !access.loading && !showCareer && canOpenPrivateBanks(access);
  const nickname = membership?.nickname || account()?.nickname || savedNickname() || '방문자';
  const [open, setOpen] = useState(false);
  const [learning, setLearning] = useState(null);
  const [notice, setNotice] = useState('');
  const boxRef = useRef(null);
  const buttonRef = useRef(null);

  // 다른 페이지로 가면 닫는다
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) { setLastPath(location.pathname); setOpen(false); }

  // 바깥을 누르거나 Esc를 누르면 닫는다
  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  // 학습 현황은 메뉴를 열 때마다 이 기기 기록에서 다시 센다(문제 데이터가 커서 처음 열 때 불러온다)
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    import('../learningStats')
      .then(m => { if (alive) setLearning(m.collectLearning(account())); })
      .catch(() => {});
    return () => { alive = false; };
  }, [open, identity]);

  const logout = async () => {
    await signOut();
    setOpen(false);
    setNotice('로그아웃했어요. 이 기기의 학습 기록은 그대로 남아 있어요.');
    setTimeout(() => setNotice(''), 4000);
  };

  const status = membership ? null : loading ? '등급 확인 중' : error ? '등급 확인 필요' : '내 계정';
  // 로그인하지 않았으면 익명 닉네임과 등급을 보여 주지 않는다(헤더의 로그인 버튼으로 로그인을 이끈다). 방금 로그아웃한 안내만 남긴다
  if (!signedIn) return notice ? <div className="member-menu-actions"><p className="member-notice" role="status">{notice}</p></div> : null;
  return <div className="member-menu-actions" ref={boxRef}>
    <button type="button" ref={buttonRef} onClick={() => setOpen(o => !o)}
      className={`account-nav-link member-menu${open || location.pathname.startsWith('/account') ? ' active' : ''}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls="member-panel"
      aria-label={`${membership?.tierName || ''} ${nickname} 내 계정 메뉴`.trim()}>
      {mine?.avatar ? <ProfileAvatar look={mine} size={26} />
        : membership ? <TierBadge tier={membership.tier} division={membership.division} /> : <span className="member-tier-status">{status}</span>}
      <span className="member-menu-name">{nickname}</span><span aria-hidden="true" className={`member-caret${open ? ' on' : ''}`}>⌄</span>
    </button>

    {open && <div id="member-panel" className="member-panel" role="menu" aria-label="내 계정">
      <div className="member-panel-head">
        {membership && <TierBadge tier={membership.tier} division={membership.division} />}
        <div>
          <b>{nickname}</b>
          <small>{membership?.tierName || (signedIn ? '로그인됨' : '방문자 (이 기기에만 기록)')}</small>
        </div>
      </div>
      {membership?.remaining > 0 && membership?.nextTierName &&
        <p className="member-panel-next">{membership.nextTierName}까지 <b>{membership.remaining}문제</b></p>}

      <div className="member-panel-stats">
        {learning?.solved > 0 ? <>
          <Stat label="이번 주" value={learning.week} />
          <Stat label="정답률" value={learning.rate != null ? `${learning.rate}%` : '–'} />
          <Stat label="누적" value={learning.solved.toLocaleString()} />
          <Stat label="오답" value={learning.wrongOpen || 0} />
        </> : <p className="member-panel-empty">{learning ? '첫 문제를 풀면 여기에 기록이 쌓여요' : '학습 기록을 불러오는 중…'}</p>}
      </div>

      <nav className="member-panel-links">
        {/* 권한을 받은 계정은 목록 맨 위에 문제집 바로가기가 따로 보인다(찬웅의 [취업] 안찬웅 자리) */}
        {showBanks && <Link to={privateBanksPath()} role="menuitem" onClick={() => setOpen(false)}>전공필기 문제집<span aria-hidden="true">›</span></Link>}
        {showCareer && <Link to="/private/chanung" role="menuitem" onClick={() => setOpen(false)}>[취업] 안찬웅<span aria-hidden="true">›</span></Link>}
        {showAdmin && <Link to="/admin" role="menuitem" onClick={() => setOpen(false)}>관리자 페이지<span aria-hidden="true">›</span></Link>}
        {LINKS.map(l => <Link key={l.to} to={l.to} role="menuitem" onClick={() => setOpen(false)}>{l.label}<span aria-hidden="true">›</span></Link>)}
      </nav>

      <div className="member-panel-foot">
        {signedIn
          ? <button type="button" role="menuitem" className="member-panel-logout" onClick={logout}>로그아웃</button>
          : <Link to="/account#settings" role="menuitem" className="member-panel-login" onClick={() => setOpen(false)}>로그인하고 기록 지키기</Link>}
      </div>
    </div>}

    {notice && <p className="member-notice" role="status">{notice}</p>}
  </div>;
}

function Stat({ label, value }) {
  return <div className="member-panel-stat"><span>{label}</span><b>{value}</b></div>;
}
