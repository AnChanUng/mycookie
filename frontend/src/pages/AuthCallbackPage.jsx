import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { account, finishOAuth, linkOAuth, OAUTH_LABELS, signUpOAuth } from '../sync';
import './AccountPage.css';

// 같은 코드는 한 번만 쓸 수 있어서, 화면이 두 번 그려져도 요청은 한 번만 보낸다
const pending = new Map();
const finishOnce = (code, state) => {
  if (!pending.has(code)) pending.set(code, finishOAuth(code, state));
  return pending.get(code);
};

const errorText = error => error?.response?.data?.error || error?.message || '로그인하지 못했습니다. 다시 시도해 주세요.';

// 소셜 · 깃허브 로그인에서 돌아오는 화면(/auth/callback). 로그인 화면과 같은 카드 모양으로 보여 준다
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const cancelled = !!params.get('error') || !params.get('code') || !params.get('state');
  const [phase, setPhase] = useState(cancelled ? { kind: 'error', message: '로그인이 취소되었습니다.' } : { kind: 'loading' });

  useEffect(() => {
    if (cancelled) return undefined;
    const code = params.get('code'), state = params.get('state');
    let stale = false;
    finishOnce(code, state).then(data => {
      if (stale) return;
      // 로그인에 성공하면 첫 화면(메인)으로 보낸다
      if (data.status === 'ok') navigate('/', { replace: true });
      else setPhase({ kind: 'link', ...data });
    }).catch(error => { if (!stale) setPhase({ kind: 'error', message: errorText(error) }); });
    return () => { stale = true; };
  }, [navigate, params, cancelled]);

  return <div className="account-page fade-in">
    <section className="account-auth">
      <div className="auth-card">
        {phase.kind === 'loading' && <div className="auth-wait" role="status">
          <span className="auth-spinner" aria-hidden="true" />
          <h2 className="auth-title">로그인하는 중</h2>
          <p className="auth-sub">잠시만 기다려 주세요. 서버가 깨어나는 데 시간이 걸릴 수 있어요.</p>
        </div>}
        {phase.kind === 'error' && <>
          <h2 className="auth-title">로그인하지 못했어요</h2>
          <p className="auth-sub">{phase.message}</p>
          <Link className="auth-submit auth-submit-link" to="/account#settings">로그인 화면으로</Link>
        </>}
        {phase.kind === 'link' && <LinkPanel {...phase} onDone={() => navigate('/', { replace: true })} />}
      </div>
    </section>
  </div>;
}

function LinkPanel({ provider, ticket, suggestedNickname, onDone }) {
  const label = OAUTH_LABELS[provider] || provider;
  const current = account();
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ nickname: '', password: '', newNickname: (suggestedNickname || '').slice(0, 20) });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action) {
    setBusy(true); setMessage('');
    try { await action(); onDone(); }
    catch (error) { setMessage(errorText(error)); }
    finally { setBusy(false); }
  }
  const choose = next => { setMode(next); setMessage(''); };

  // 이미 로그인한 상태에서 소셜 계정을 연결할 때
  if (current) return <>
    <span className="auth-provider">{label}</span>
    <h2 className="auth-title">{label} 계정 연결</h2>
    <p className="auth-sub"><strong>{current.nickname}</strong> 계정에 {label} 계정을 연결해요. 다음부터는 {label}로 바로 로그인할 수 있어요.</p>
    <button type="button" className="auth-submit" disabled={busy} onClick={() => run(() => linkOAuth(ticket))}>{busy ? '연결하는 중…' : `${current.nickname} 계정에 연결`}</button>
    <div className="auth-links"><Link to="/account#settings">취소</Link></div>
    {message && <p className="auth-message" role="alert">{message}</p>}
  </>;

  return <>
    <span className="auth-provider">{label}로 시작하기</span>
    <h2 className="auth-title">{mode === 'signup' ? '닉네임을 정해 주세요' : '기존 계정에 연결'}</h2>
    <p className="auth-sub">{mode === 'signup'
      ? '나의쿠키에서 쓸 닉네임만 정하면 바로 시작해요. 순위와 채팅에 이 이름이 보여요.'
      : '쓰던 계정이 있다면 한 번만 로그인해 주세요. 지금까지의 학습 기록을 그대로 이어서 볼 수 있어요.'}</p>

    <div className="auth-tabs" role="tablist" aria-label="가입 방법">
      <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => choose('signup')}>새로 시작하기</button>
      <button type="button" role="tab" aria-selected={mode === 'link'} className={mode === 'link' ? 'on' : ''} onClick={() => choose('link')}>기존 계정 연결</button>
    </div>

    {mode === 'signup' ? <form className="auth-form" onSubmit={e => { e.preventDefault(); run(() => signUpOAuth(ticket, form.newNickname.trim())); }}>
      <label className="auth-field"><span>닉네임</span>
        <input aria-label="새 닉네임" placeholder="1~20자" maxLength={20} autoComplete="nickname" disabled={busy} value={form.newNickname} onChange={e => setForm({ ...form, newNickname: e.target.value })} />
      </label>
      <button className="auth-submit" disabled={busy || !form.newNickname.trim()}>{busy ? '가입하는 중…' : '시작하기'}</button>
    </form> : <form className="auth-form" onSubmit={e => { e.preventDefault(); run(() => linkOAuth(ticket, form.nickname.trim(), form.password)); }}>
      <label className="auth-field"><span>닉네임 또는 인증한 이메일</span>
        <input aria-label="기존 닉네임" autoComplete="username" maxLength={254} disabled={busy} value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
      </label>
      <label className="auth-field"><span>비밀번호</span>
        <input aria-label="비밀번호" type="password" autoComplete="current-password" maxLength={72} disabled={busy} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      </label>
      <button className="auth-submit" disabled={busy || !form.nickname.trim() || !form.password}>{busy ? '연결하는 중…' : '연결하고 로그인'}</button>
    </form>}

    {message && <p className="auth-message" role="alert">{message}</p>}
    {mode === 'signup' && <p className="auth-note">닉네임은 나중에 내 계정에서 바꿀 수 있어요.</p>}
  </>;
}
