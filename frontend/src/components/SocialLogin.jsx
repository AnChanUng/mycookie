import { useEffect, useState } from 'react';
import { linkedProviders, OAUTH_LABELS, oauthProviders, startOAuth } from '../sync';

// 제공자 표시 글자. 로고 이미지 대신 각 회사 색 위에 한 글자를 얹는다
const MARKS = { google: 'G', naver: 'N', kakao: 'K', github: 'GH', ssafy: 'S' };
// 로그아웃 화면에서 크게 보여 줄 대표 제공자. 없으면(키가 안 들어 있으면) 목록 첫 번째가 대표가 된다
const PRIMARY_PROVIDER = 'google';
const name = p => (p === 'ssafy' ? 'SSAFY' : OAUTH_LABELS[p]);

// 소셜(구글 · 네이버 · 카카오) · 깃허브 로그인 버튼. 서버에 키가 등록된 제공자만 보인다.
// 로그아웃 상태: 로그인 카드 맨 위에 버튼을 두 열로 나란히 놓고 구분선을 붙인다. 새 가입은 여기서만 된다(처음 들어온 소셜 계정 → 닉네임 정하기).
// 로그인 상태: 아직 연결하지 않은 제공자를 작은 "연결" 버튼으로 보여 준다
export default function SocialLogin({ user }) {
  const [providers, setProviders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [linked, setLinked] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stale = false;
    oauthProviders().then(list => { if (!stale) setProviders(list); }).catch(() => {}).finally(() => { if (!stale) setLoaded(true); });
    if (user) linkedProviders().then(list => { if (!stale) setLinked(list); }).catch(() => {});
    return () => { stale = true; };
  }, [user]);

  // 새 가입은 간편 로그인으로만 받으므로, 로그아웃 상태에서 쓸 수 있는 제공자가 없으면 그 사실을 알린다
  if (!providers.length) {
    if (user) return <p className="account-hint">아직 연결할 수 있는 간편 로그인이 없어요.</p>;
    return loaded ? <p className="account-hint" role="status">지금은 간편 로그인을 쓸 수 없어 새 가입을 받지 못해요. 이미 계정이 있다면 아래에서 로그인해 주세요.</p> : null;
  }
  async function go(provider) {
    setBusy(provider); setMessage('');
    try { await startOAuth(provider); }
    catch (error) { setMessage(error?.response?.data?.error || '로그인 화면을 열지 못했습니다. 잠시 후 다시 시도해 주세요.'); setBusy(''); }
  }
  // 로그인 상태: 아직 연결하지 않은 제공자를 작은 버튼으로
  if (user) return <div className="social-login">
    <div className="social-login-buttons">
      {providers.map(p => linked.includes(p)
        ? <span key={p} className={`social-btn ${p} linked`}><i className="social-mark" aria-hidden="true">✓</i>{OAUTH_LABELS[p]} 연결됨</span>
        : <button key={p} type="button" className={`social-btn ${p}`} disabled={!!busy} onClick={() => go(p)}>
          <i className="social-mark" aria-hidden="true">{MARKS[p]}</i>
          {busy === p ? '이동 중…' : `${OAUTH_LABELS[p]} 연결하기`}
        </button>)}
    </div>
    {message && <p className="auth-message" role="alert">{message}</p>}
  </div>;

  // 로그아웃 상태: 대표 하나는 큰 버튼, 나머지는 동그란 아이콘 한 줄(제공자가 늘어도 아이콘만 하나씩 는다)
  const primary = providers.includes(PRIMARY_PROVIDER) ? PRIMARY_PROVIDER : providers[0];
  const others = providers.filter(p => p !== primary);
  return <div className="social-login social-login--row">
    <button type="button" className={`social-btn social-primary ${primary}`} disabled={!!busy} onClick={() => go(primary)}>
      <i className="social-mark" aria-hidden="true">{MARKS[primary]}</i>
      {busy === primary ? '이동 중…' : `${name(primary)}로 시작하기`}
    </button>
    {others.length > 0 && <div className="social-icons" role="group" aria-label="다른 간편 로그인">
      {others.map(p => <button key={p} type="button" className={`social-icon ${p}`} disabled={!!busy} onClick={() => go(p)}
        aria-label={`${name(p)}로 시작하기`} title={`${name(p)}로 시작하기`}>
        <i className="social-mark" aria-hidden="true">{busy === p ? '…' : MARKS[p]}</i>
      </button>)}
    </div>}
    {message && <p className="auth-message" role="alert">{message}</p>}
    <div className="auth-divider"><span>이미 계정이 있다면 닉네임 · 이메일로</span></div>
  </div>;
}
