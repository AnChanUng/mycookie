import { useEffect, useState } from 'react';
import { linkedProviders, OAUTH_LABELS, oauthProviders, startOAuth } from '../sync';

// 제공자 표시 글자. 로고 이미지 대신 각 회사 색 위에 한 글자를 얹는다
const MARKS = { google: 'G', naver: 'N', kakao: 'K', github: 'GH', ssafy: 'S' };

// 소셜(구글 · 네이버 · 카카오) · 깃허브 로그인 버튼. 서버에 키가 등록된 제공자만 보인다.
// 로그아웃 상태: 로그인 카드 맨 위에 버튼을 두 열로 나란히 놓고 "또는" 구분선을 붙인다.
// 로그인 상태: 아직 연결하지 않은 제공자를 작은 "연결" 버튼으로 보여 준다
export default function SocialLogin({ user }) {
  const [providers, setProviders] = useState([]);
  const [linked, setLinked] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stale = false;
    oauthProviders().then(list => { if (!stale) setProviders(list); }).catch(() => {});
    if (user) linkedProviders().then(list => { if (!stale) setLinked(list); }).catch(() => {});
    return () => { stale = true; };
  }, [user]);

  if (!providers.length) return user ? <p className="account-hint">아직 연결할 수 있는 간편 로그인이 없어요.</p> : null;
  async function go(provider) {
    setBusy(provider); setMessage('');
    try { await startOAuth(provider); }
    catch (error) { setMessage(error?.response?.data?.error || '로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'); setBusy(''); }
  }
  return <div className={`social-login${user ? '' : ' social-login--row'}`}>
    <div className="social-login-buttons">
      {providers.map(p => user && linked.includes(p)
        ? <span key={p} className={`social-btn ${p} linked`}><i className="social-mark" aria-hidden="true">✓</i>{OAUTH_LABELS[p]} 연결됨</span>
        : <button key={p} type="button" className={`social-btn ${p}`} disabled={!!busy} onClick={() => go(p)}>
          <i className="social-mark" aria-hidden="true">{MARKS[p]}</i>
          {busy === p ? '이동 중…' : user ? `${OAUTH_LABELS[p]} 연결하기` : `${p === 'ssafy' ? 'SSAFY' : OAUTH_LABELS[p]} 로그인`}
        </button>)}
    </div>
    {message && <p className="auth-message" role="alert">{message}</p>}
    {!user && <div className="auth-divider"><span>또는 닉네임으로</span></div>}
  </div>;
}
