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

// 소셜 · 깃허브 로그인에서 돌아오는 화면(/auth/callback)
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
      if (data.status === 'ok') navigate('/account#settings', { replace: true });
      else setPhase({ kind: 'link', ...data });
    }).catch(error => { if (!stale) setPhase({ kind: 'error', message: errorText(error) }); });
    return () => { stale = true; };
  }, [navigate, params, cancelled]);

  return <div className="account-page fade-in">
    <header className="page-header"><h1>로그인</h1></header>
    <section className="account-auth">
      {phase.kind === 'loading' && <p role="status">로그인하는 중… 서버가 깨어나는 데 시간이 걸릴 수 있습니다.</p>}
      {phase.kind === 'error' && <><p role="alert">{phase.message}</p><Link className="exam-btn sm" to="/account#settings">로그인 화면으로</Link></>}
      {phase.kind === 'link' && <LinkPanel {...phase} onDone={() => navigate('/account#settings', { replace: true })} />}
    </section>
  </div>;
}

function LinkPanel({ provider, ticket, suggestedNickname, onDone }) {
  const label = OAUTH_LABELS[provider] || provider;
  const current = account();
  const [mode, setMode] = useState('link');
  const [form, setForm] = useState({ nickname: '', password: '', newNickname: (suggestedNickname || '').slice(0, 20) });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function run(action) {
    setBusy(true); setMessage('');
    try { await action(); onDone(); }
    catch (error) { setMessage(errorText(error)); }
    finally { setBusy(false); }
  }

  if (current) return <>
    <h2>{label} 계정 연결</h2>
    <p>지금 로그인한 <strong>{current.nickname}</strong> 계정에 {label} 계정을 연결합니다. 다음부터는 {label}로 바로 로그인할 수 있어요.</p>
    <div className="account-actions">
      <button className="exam-btn sm primary" disabled={busy} onClick={() => run(() => linkOAuth(ticket))}>{current.nickname} 계정에 연결</button>
      <Link className="exam-btn sm" to="/account#settings">취소</Link>
    </div>
    {message && <p role="alert">{message}</p>}
  </>;

  return <>
    <h2>{label} 계정으로 처음 오셨어요</h2>
    <p>이미 쓰던 계정이 있다면 닉네임(또는 인증한 이메일)과 비밀번호를 한 번만 입력해 주세요. 바로 연결되고, 지금까지의 학습 기록을 그대로 이어서 볼 수 있어요.</p>
    <div className="account-actions" role="tablist">
      <button type="button" role="tab" aria-selected={mode === 'link'} className={`exam-btn sm${mode === 'link' ? ' primary' : ''}`} onClick={() => { setMode('link'); setMessage(''); }}>기존 계정에 연결</button>
      <button type="button" role="tab" aria-selected={mode === 'signup'} className={`exam-btn sm${mode === 'signup' ? ' primary' : ''}`} onClick={() => { setMode('signup'); setMessage(''); }}>새 계정 만들기</button>
    </div>
    {mode === 'link' ? <form onSubmit={e => { e.preventDefault(); run(() => linkOAuth(ticket, form.nickname.trim(), form.password)); }}>
      <input aria-label="기존 닉네임" placeholder="기존 닉네임 또는 인증한 이메일" autoComplete="username" maxLength={254} disabled={busy} value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
      <input aria-label="비밀번호" type="password" placeholder="비밀번호" autoComplete="current-password" maxLength={72} disabled={busy} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
      <button className="exam-btn sm primary" disabled={busy || !form.nickname.trim() || !form.password}>연결하고 로그인</button>
    </form> : <form onSubmit={e => { e.preventDefault(); run(() => signUpOAuth(ticket, form.newNickname.trim())); }}>
      <input aria-label="새 닉네임" placeholder="새 닉네임" maxLength={20} disabled={busy} value={form.newNickname} onChange={e => setForm({ ...form, newNickname: e.target.value })} />
      <button className="exam-btn sm primary" disabled={busy || !form.newNickname.trim()}>{label} 계정으로 가입</button>
    </form>}
    {message && <p role="alert">{message}</p>}
  </>;
}
