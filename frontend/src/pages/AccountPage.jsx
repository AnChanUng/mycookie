import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { account, changeNickname, changePassword, emailStatus, onAccountChange, passwordStatus, requestEmailVerification, requestPasswordReset, signIn, signOut } from '../sync';
import { loadAccountRecords } from '../accountRecords';
import SocialLogin from '../components/SocialLogin';
import { buildAccountRetry } from '../accountRetry';
import './AccountPage.css';
import ProfileCard from '../components/ProfileCard';
import { membershipHeaders, useMembership } from '../membership';
import { savedNickname } from '../nickname';
import api from '../api';

const snapshot = () => account() ? `${account().token}:${account().nickname}` : '';
export default function AccountPage() {
  const token = useSyncExternalStore(onAccountChange, snapshot, () => '');
  const location = useLocation();
  useEffect(() => {
    if (location.hash !== '#settings' || typeof document === 'undefined') return;
    const settings = document.getElementById?.('settings');
    settings?.scrollIntoView?.({ block: 'start' });
    settings?.focus?.({ preventScroll: true });
  }, [location.hash, location.key]);
  // 비밀번호를 바꾸면 토큰만 새로 받으므로 계정이 같으면 화면 상태(안내 문구)를 유지한다
  const openForgot = new URLSearchParams(location.search).get('forgot') === '1';
  return <AccountDashboard key={`${token ? account()?.id : ''}:${openForgot}`} user={token ? account() : null} openForgot={openForgot} />;
}
function AccountDashboard({ user, openForgot }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  // 새로 정하는 비밀번호만 8자 이상(기존 비밀번호는 짧아도 로그인된다)
  const nextValid = passwords.next.trim().length >= 8 && new TextEncoder().encode(passwords.next.trim()).length <= 72;
  const [hasPassword, setHasPassword] = useState(true);
  const [emailInfo, setEmailInfo] = useState({ email: '', mailEnabled: true });
  const [emailForm, setEmailForm] = useState({ email: '', current: '' });
  const [forgot, setForgot] = useState({ open: openForgot, email: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(user?.nickname || savedNickname());
  const [message, setMessage] = useState('');
  const [result, setResult] = useState({ records: {}, failed: [] });
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState({ loading: true, values: [], error: false });
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    api.get('/profile/badges', { headers: membershipHeaders(), signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setBadges({ loading: false, values: Array.isArray(data) ? data : [], error: false }); })
      .catch(() => { if (!controller.signal.aborted) setBadges({ loading: false, values: [], error: true }); });
    return () => controller.abort();
  }, [user]);
  const tierStatus = useMembership(0);
  useEffect(() => {
    const controller = new AbortController();
    if (!user) return;
    loadAccountRecords(user, controller.signal).then(next => {
      if (!controller.signal.aborted) { setResult(next); setLoading(false); }
    });
    return () => controller.abort();
  }, [user]);
  // 새 가입은 간편 로그인으로만 받는다. 여기서는 이미 있는 계정만 닉네임 또는 인증한 이메일로 로그인한다
  async function authenticate() {
    setAuthBusy(true); setMessage('');
    // 로그인에 성공하면 첫 화면(메인)으로 보낸다
    try { await signIn('login', form.identifier.trim(), form.password); navigate('/', { replace: true }); }
    catch (error) { setMessage(error?.response?.data?.error || '로그인하지 못했습니다. 입력 내용과 서버 연결을 확인해 주세요.'); }
    finally { setAuthBusy(false); }
  }
  useEffect(() => {
    if (!user) return;
    let alive = true;
    passwordStatus().then(value => { if (alive) setHasPassword(value); }).catch(() => {});
    emailStatus().then(value => { if (alive) setEmailInfo(value); }).catch(() => {});
    return () => { alive = false; };
  }, [user?.token]); // eslint-disable-line react-hooks/exhaustive-deps
  async function run(action, done) {
    setAuthBusy(true); setMessage('');
    try { await action(); setMessage(done); }
    catch (error) { setMessage(error?.response?.data?.error || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setAuthBusy(false); }
  }
  async function submitPassword() {
    if (!nextValid || passwords.next !== passwords.confirm) return;
    setAuthBusy(true); setMessage('');
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setMessage('비밀번호를 변경했습니다. 다른 기기에서는 다시 로그인해 주세요.');
    } catch (error) {
      setMessage(error?.response?.data?.error || '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally { setAuthBusy(false); }
  }
  const retryCount = result.failed.length ? 0 : buildAccountRetry(result.records).company.questions.length;
  return <div className="account-page fade-in">
    {user && <header className="page-header"><h1>내 계정</h1><p>프로필과 로그인 설정</p></header>}
    {user && <ProfileCard user={user} tier={tierStatus} />}
    {user && <section className="account-links" aria-label="학습 바로가기">
      <Link to="/stats"><b>내 학습</b><span>푼 문제 · 정답률 · 전공노트 진도</span></Link>
      <Link to="/shop"><b>포인트 상점</b><span>출석 · 풀이 · 승급 포인트로 프로필 꾸미기</span></Link>
      {retryCount > 0
        ? <Link to="/account/retry"><b>오답 다시 풀기</b><span>계정에 남은 오답 {retryCount}문제</span></Link>
        : <Link to="/weak"><b>오답노트</b><span>{loading ? '기록을 불러오는 중…' : '틀린 문제를 모아 봐요'}</span></Link>}
    </section>}
    <section className="account-auth" id="settings" tabIndex={-1}>
      {user && <h2>본인 설정</h2>}
      {user ? <><div className="account-actions"><span className="acc-avatar" aria-hidden="true">{user.nickname.slice(0, 1)}</span><strong>{user.nickname}</strong><button className="exam-btn sm" disabled={authBusy} onClick={async () => { setAuthBusy(true); await signOut(); }}>로그아웃</button></div>
        <h3 className="acc-label">닉네임</h3>
        <form onSubmit={async e => {
          e.preventDefault(); setAuthBusy(true); setMessage('');
          try { await changeNickname(nicknameDraft.trim()); setMessage('닉네임을 변경했습니다. 다음 로그인부터 새 닉네임을 사용해 주세요.'); }
          catch (error) { setMessage(error?.response?.data?.error || '닉네임을 변경하지 못했습니다.'); }
          finally { setAuthBusy(false); }
        }}>
          <input aria-label="새 닉네임" maxLength={20} value={nicknameDraft} onChange={e => setNicknameDraft(e.target.value)} />
          <button className="exam-btn sm" disabled={authBusy || !nicknameDraft.trim() || nicknameDraft.trim() === user.nickname}>닉네임 변경</button>
        </form>
        <h3 className="acc-label">비밀번호</h3>
        <form className="account-password-form" onSubmit={e => { e.preventDefault(); submitPassword(); }}>
          <input type="text" hidden readOnly autoComplete="username" value={user.nickname} />
          {hasPassword && <input aria-label="현재 비밀번호" type="password" placeholder="현재 비밀번호" autoComplete="current-password" maxLength={72} disabled={authBusy} value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />}
          <input aria-label="새 비밀번호" type="password" placeholder={hasPassword ? '새 비밀번호' : '로그인용 비밀번호 정하기'} autoComplete="new-password" maxLength={72} disabled={authBusy} value={passwords.next} onChange={e => setPasswords({ ...passwords, next: e.target.value })} />
          <input aria-label="새 비밀번호 확인" type="password" placeholder="새 비밀번호 한 번 더" autoComplete="new-password" maxLength={72} disabled={authBusy} value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} />
          {passwords.next && !nextValid && <p className="account-hint">새 비밀번호는 8자 이상, 최대 72바이트로 정해 주세요.</p>}
          {passwords.confirm && passwords.next !== passwords.confirm && <p role="alert" className="account-hint">두 비밀번호가 다릅니다.</p>}
          <button className="exam-btn sm" disabled={authBusy || (hasPassword && !passwords.current) || !nextValid || passwords.next !== passwords.confirm}>비밀번호 변경</button>
        </form>
        <h3 className="acc-label">비밀번호 찾기 이메일</h3>
        <p className="account-hint">{emailInfo.email ? `등록된 이메일: ${emailInfo.email}` : '이메일을 등록해 두면 비밀번호를 잊었을 때 재설정 메일을 받을 수 있어요.'}</p>
        <form onSubmit={e => {
          e.preventDefault();
          const email = emailForm.email.trim();
          run(async () => { await requestEmailVerification(email, emailForm.current); setEmailForm({ email: '', current: '' }); },
            `${email}로 인증 메일을 보냈습니다. 메일의 링크를 눌러야 등록이 끝나요.`);
        }}>
          <input aria-label="이메일" type="email" placeholder={emailInfo.email ? '바꿀 이메일' : '이메일'} autoComplete="email" maxLength={254} disabled={authBusy} value={emailForm.email} onChange={e => setEmailForm({ ...emailForm, email: e.target.value })} />
          {hasPassword && <input aria-label="이메일 등록용 현재 비밀번호" type="password" placeholder="현재 비밀번호" autoComplete="current-password" maxLength={72} disabled={authBusy} value={emailForm.current} onChange={e => setEmailForm({ ...emailForm, current: e.target.value })} />}
          <button className="exam-btn sm" disabled={authBusy || !emailInfo.mailEnabled || !emailForm.email.trim() || (hasPassword && !emailForm.current)}>{emailInfo.email ? '이메일 변경' : '이메일 등록'}</button>
        </form>
        {!emailInfo.mailEnabled && <p className="account-hint">지금은 메일 서버가 준비되지 않아 이메일을 등록할 수 없어요.</p>}
        <h3 className="acc-label">간편 로그인</h3>
        <SocialLogin user={user} /></> : <div className="auth-card">
        {forgot.open ? <>
          <h2 className="auth-title">비밀번호 찾기</h2>
          <p className="auth-sub">계정에 등록한 이메일로 재설정 링크를 보내 드려요.</p>
          <form className="auth-form" onSubmit={e => {
            e.preventDefault();
            run(() => requestPasswordReset(forgot.email.trim()), '입력한 주소로 등록된 계정이 있으면 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.');
          }}>
            <label className="auth-field"><span>이메일</span>
              <input type="email" placeholder="you@example.com" autoComplete="email" maxLength={254} disabled={authBusy} value={forgot.email} onChange={e => setForgot({ ...forgot, email: e.target.value })} />
            </label>
            <button className="auth-submit" disabled={authBusy || !forgot.email.trim()}>{authBusy ? '보내는 중…' : '재설정 메일 받기'}</button>
          </form>
          <p className="auth-note">이메일을 등록하지 않았다면 연결해 둔 소셜 계정으로 로그인한 뒤 내 계정에서 비밀번호를 바꿀 수 있어요.</p>
          <div className="auth-links"><button type="button" onClick={() => { setForgot({ open: false, email: '' }); setMessage(''); }}>← 로그인으로 돌아가기</button></div>
        </> : <>
          <h2 className="auth-title">로그인</h2>
          <SocialLogin user={null} />
          <form className="auth-form" onSubmit={e => { e.preventDefault(); authenticate(); }}>
            <label className="auth-field"><span>닉네임 또는 이메일</span>
              <input aria-label="로그인 닉네임 또는 이메일" autoComplete="username" maxLength={254} value={form.identifier} onChange={e => setForm({ ...form, identifier: e.target.value })} />
            </label>
            <label className="auth-field"><span>비밀번호</span>
              <input aria-label="로그인 비밀번호" type="password" autoComplete="current-password" maxLength={72} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </label>
            <button className="auth-submit" disabled={authBusy || !form.identifier.trim() || !form.password}>{authBusy ? '잠시만요…' : '로그인'}</button>
          </form>
          <p className="auth-note">이메일은 내 계정에서 인증을 마친 주소만 쓸 수 있어요.</p>
          <div className="auth-links">
            <button type="button" onClick={() => { setForgot({ open: true, email: '' }); setMessage(''); }}>비밀번호 찾기</button>
          </div>
        </>}
        {message && <p className="auth-message" role="alert">{message}</p>}
      </div>}
      {user && <div className="personal-badges" aria-label="내 교육생 배지">
        <h3>개인정보 · 교육생 배지</h3>
        {badges.loading ? <p role="status">배지를 불러오는 중…</p> : badges.error ? <p role="alert">배지를 불러오지 못했습니다. 새로고침해 주세요.</p>
          : badges.values.length ? badges.values.map(badge => <span className="cohort-badge" key={badge.name}>🎖 {badge.name}</span>) : <p>부여된 교육생 배지가 없습니다.</p>}
      </div>}
      {user && message && <p role="alert">{message}</p>}
    </section>
  </div>;
}
