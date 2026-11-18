import { useEffect, useState } from 'react';
import { linkedProviders, OAUTH_LABELS, oauthProviders, startOAuth } from '../sync';

// 소셜(구글 · 카카오) · 깃허브 로그인 버튼. 서버에 키가 등록된 제공자만 보인다.
// 로그인 중이면 아직 연결하지 않은 제공자를 "연결" 버튼으로 보여 준다
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

  if (!providers.length) return null;
  async function go(provider) {
    setBusy(provider); setMessage('');
    try { await startOAuth(provider); }
    catch (error) { setMessage(error?.response?.data?.error || '로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'); setBusy(''); }
  }
  return <div className="social-login">
    <p className="social-login-title">{user ? '간편 로그인 연결' : '간편 로그인'}</p>
    <div className="social-login-buttons">
      {providers.map(p => user && linked.includes(p)
        ? <span key={p} className={`social-btn ${p} linked`}>✓ {OAUTH_LABELS[p]} 연결됨</span>
        : <button key={p} type="button" className={`social-btn ${p}`} disabled={!!busy} onClick={() => go(p)}>
          {busy === p ? '이동 중…' : `${OAUTH_LABELS[p]}${user ? ' 연결하기' : '로 로그인'}`}
        </button>)}
    </div>
    {!user && <p className="social-login-hint">처음이라면 기존 닉네임 · 비밀번호를 한 번 입력해 연결하면 지금까지의 기록을 그대로 쓸 수 있어요.</p>}
    {message && <p role="alert">{message}</p>}
  </div>;
}
