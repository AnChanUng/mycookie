import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account, signOut } from '../sync';
import './AccountPage.css';

const errorText = (error, fallback) => error?.response?.data?.error || fallback;

// 메일 링크로 들어오는 화면. 토큰은 읽자마자 주소창에서 지워 기록이나 다른 사이트로 새지 않게 한다
function useLinkToken() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') || '');
  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [token]);
  return token;
}

const verifying = new Map();

// /auth/verify-email?token=...
export function VerifyEmailPage() {
  const token = useLinkToken();
  const [phase, setPhase] = useState(token ? { kind: 'loading' } : { kind: 'error', message: '인증 링크가 올바르지 않습니다.' });
  useEffect(() => {
    if (!token) return undefined;
    let stale = false;
    if (!verifying.has(token)) verifying.set(token, api.post('/auth/email/verify', { token }, { timeout: 90000 }));
    verifying.get(token)
      .then(({ data }) => { if (!stale) setPhase({ kind: 'done', email: data.email }); })
      .catch(error => { if (!stale) setPhase({ kind: 'error', message: errorText(error, '이메일을 인증하지 못했습니다.') }); });
    return () => { stale = true; };
  }, [token]);
  return <div className="account-page fade-in">
    <header className="page-header"><h1>이메일 인증</h1></header>
    <section className="account-auth">
      {phase.kind === 'loading' && <p role="status">인증하는 중…</p>}
      {phase.kind === 'done' && <p role="status"><strong>{phase.email}</strong> 인증을 마쳤습니다. 비밀번호를 잊으면 이 주소로 재설정 메일을 받을 수 있어요.</p>}
      {phase.kind === 'error' && <p role="alert">{phase.message}</p>}
      <Link className="exam-btn sm" to="/account#settings">내 계정으로</Link>
    </section>
  </div>;
}

// /auth/reset-password?token=...
export function ResetPasswordPage() {
  const token = useLinkToken();
  const [password, setPassword] = useState({ next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState(token ? '' : '재설정 링크가 올바르지 않습니다. 비밀번호 찾기를 다시 요청해 주세요.');
  const mismatch = password.confirm && password.next !== password.confirm;
  async function submit() {
    setBusy(true); setMessage('');
    try {
      await api.post('/auth/password/reset', { token, password: password.next }, { timeout: 90000 });
      // 서버가 모든 로그인을 끊었으므로 이 기기에 남은 로그인도 정리한다
      if (account()) await signOut();
      setDone(true);
    } catch (error) {
      setMessage(errorText(error, '비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.'));
    } finally { setBusy(false); }
  }
  return <div className="account-page fade-in">
    <header className="page-header"><h1>비밀번호 재설정</h1></header>
    <section className="account-auth">
      {done ? <p role="status">비밀번호를 바꿨습니다. 모든 기기에서 로그아웃되었으니 새 비밀번호로 로그인해 주세요.</p>
        : token && <form onSubmit={e => { e.preventDefault(); submit(); }}>
          <input aria-label="새 비밀번호" type="password" placeholder="새 비밀번호" autoComplete="new-password" maxLength={72} disabled={busy} value={password.next} onChange={e => setPassword({ ...password, next: e.target.value })} />
          <input aria-label="새 비밀번호 확인" type="password" placeholder="새 비밀번호 확인" autoComplete="new-password" maxLength={72} disabled={busy} value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} />
          <button className="exam-btn sm primary" disabled={busy || !password.next.trim() || password.next !== password.confirm}>비밀번호 바꾸기</button>
        </form>}
      {mismatch && !done && <p role="alert">두 비밀번호가 다릅니다.</p>}
      {message && <p role="alert">{message}</p>}
      <Link className="exam-btn sm" to="/account#settings">로그인 화면으로</Link>
    </section>
  </div>;
}
