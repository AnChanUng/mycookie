import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { account, changeNickname, changePassword, emailStatus, onAccountChange, passwordStatus, requestEmailVerification, requestPasswordReset, signIn, signOut } from '../sync';
import { loadAccountRecords, summarizeAccount } from '../accountRecords';
import { CS_NOTES, migrateNotesCompletion } from '../data/csNotes';
import { WEB_ESSENTIALS } from '../data/webEssentials';
import QuestionExplanation from '../components/QuestionExplanation';
import SocialLogin from '../components/SocialLogin';
import { buildAccountRetry } from '../accountRetry';
import './AccountPage.css';
import TierBadge from '../components/TierBadge';
import { membershipHeaders, TIER_NAMES, useMembership } from '../membership';
import { savedNickname, saveNickname } from '../nickname';
import api from '../api';
import { visitorId } from '../track';

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
  const [form, setForm] = useState({ nickname: '', password: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [hasPassword, setHasPassword] = useState(true);
  const [emailInfo, setEmailInfo] = useState({ email: '', mailEnabled: true });
  const [emailForm, setEmailForm] = useState({ email: '', current: '' });
  const [forgot, setForgot] = useState({ open: openForgot, email: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState(user?.nickname || savedNickname());
  const [message, setMessage] = useState('');
  const [result, setResult] = useState({ records: {}, failed: [] });
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [wrongOnly, setWrongOnly] = useState(false);
  const [limit, setLimit] = useState(20);
  const [badges, setBadges] = useState({ loading: true, values: [], error: false });
  useEffect(() => {
    const controller = new AbortController();
    api.get('/profile/badges', { headers: membershipHeaders(), signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setBadges({ loading: false, values: Array.isArray(data) ? data : [], error: false }); })
      .catch(() => { if (!controller.signal.aborted) setBadges({ loading: false, values: [], error: true }); });
    return () => controller.abort();
  }, [revision]);
  const tierStatus = useMembership(revision);
  useEffect(() => {
    const controller = new AbortController();
    loadAccountRecords(user, controller.signal).then(next => {
      if (!controller.signal.aborted) { setResult(next); setLoading(false); }
    });
    return () => controller.abort();
  }, [user, revision]);
  async function authenticate(mode) {
    setAuthBusy(true); setMessage('');
    try { await signIn(mode, form.nickname.trim(), form.password); }
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
    setAuthBusy(true); setMessage('');
    try {
      await changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      setMessage('비밀번호를 변경했습니다. 다른 기기에서는 다시 로그인해 주세요.');
    } catch (error) {
      setMessage(error?.response?.data?.error || '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally { setAuthBusy(false); }
  }
  const { rows, attempts, correct, wrong } = summarizeAccount(result.records);
  const retryCount = buildAccountRetry(result.records).company.questions.length;
  const filtered = rows.filter(r => (!wrongOnly || r.last === 'w') && `${r.bank} ${r.title}`.toLowerCase().includes(query.trim().toLowerCase()));
  const noteRecords = migrateNotesCompletion(result.records['cs-notes-v1']?.completed);
  const completed = [...CS_NOTES.flatMap(s => s.items), ...WEB_ESSENTIALS.items].filter(e => noteRecords[e.id]?.done);
  return <div className="account-page fade-in">
    <header className="page-header"><h1>내 계정</h1><p>{user ? `${user.nickname}님의 학습 기록` : '로그인하면 내 계정에 저장된 학습 기록을 볼 수 있습니다.'}</p></header>
    <section className="account-auth" id="settings" tabIndex={-1}>
      <h2>본인 설정</h2>
      {user ? <><div className="account-actions"><strong>{user.nickname}</strong><button className="exam-btn sm" disabled={authBusy} onClick={async () => { setAuthBusy(true); await signOut(); }}>로그아웃</button></div>
        <form onSubmit={async e => {
          e.preventDefault(); setAuthBusy(true); setMessage('');
          try { await changeNickname(nicknameDraft.trim()); setMessage('닉네임을 변경했습니다. 다음 로그인부터 새 닉네임을 사용해 주세요.'); }
          catch (error) { setMessage(error?.response?.data?.error || '닉네임을 변경하지 못했습니다.'); }
          finally { setAuthBusy(false); }
        }}>
          <input aria-label="새 닉네임" maxLength={20} value={nicknameDraft} onChange={e => setNicknameDraft(e.target.value)} />
          <button className="exam-btn sm" disabled={authBusy || !nicknameDraft.trim() || nicknameDraft.trim() === user.nickname}>닉네임 변경</button>
        </form>
        <form onSubmit={e => { e.preventDefault(); submitPassword(); }}>
          <input type="text" hidden readOnly autoComplete="username" value={user.nickname} />
          {hasPassword && <input aria-label="현재 비밀번호" type="password" placeholder="현재 비밀번호" autoComplete="current-password" maxLength={72} disabled={authBusy} value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} />}
          <input aria-label="새 비밀번호" type="password" placeholder={hasPassword ? '새 비밀번호' : '로그인용 비밀번호 정하기'} autoComplete="new-password" maxLength={72} disabled={authBusy} value={passwords.next} onChange={e => setPasswords({ ...passwords, next: e.target.value })} />
          <button className="exam-btn sm" disabled={authBusy || (hasPassword && !passwords.current) || !passwords.next.trim()}>비밀번호 변경</button>
        </form>
        <p className="account-hint">{emailInfo.email ? `비밀번호 찾기 이메일: ${emailInfo.email}` : '이메일을 등록해 두면 비밀번호를 잊었을 때 재설정 메일을 받을 수 있어요.'}</p>
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
        {!emailInfo.mailEnabled && <p className="account-hint">지금은 메일 서버가 준비되지 않아 이메일을 등록할 수 없어요.</p>}</> : <form onSubmit={e => { e.preventDefault(); authenticate('login'); }}>
        <input aria-label="닉네임" placeholder="닉네임" autoComplete="username" maxLength={20} value={form.nickname} onChange={e => setForm({ ...form, nickname: e.target.value })} />
        <input aria-label="비밀번호" type="password" placeholder="비밀번호" autoComplete="current-password" maxLength={72} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <button className="exam-btn sm primary" disabled={authBusy || !form.nickname.trim() || !form.password}>로그인</button>
        <button type="button" className="exam-btn sm" disabled={authBusy || !form.nickname.trim() || !form.password} onClick={() => authenticate('register')}>새 계정 만들기</button>
      </form>}
      {!user && (forgot.open ? <form onSubmit={e => {
        e.preventDefault();
        run(() => requestPasswordReset(forgot.email.trim()), '입력한 주소로 등록된 계정이 있으면 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.');
      }}>
        <input aria-label="비밀번호 찾기 이메일" type="email" placeholder="등록한 이메일" autoComplete="email" maxLength={254} disabled={authBusy} value={forgot.email} onChange={e => setForgot({ ...forgot, email: e.target.value })} />
        <button className="exam-btn sm primary" disabled={authBusy || !forgot.email.trim()}>재설정 메일 받기</button>
        <button type="button" className="exam-btn sm" disabled={authBusy} onClick={() => setForgot({ open: false, email: '' })}>취소</button>
      </form> : <p className="account-hint">
        <button type="button" className="exam-btn sm" onClick={() => { setForgot({ open: true, email: '' }); setMessage(''); }}>비밀번호 찾기</button>
        {' '}이메일을 등록하지 않았다면 연결해 둔 소셜 계정으로 로그인한 뒤 바꿀 수 있어요.
      </p>)}
      <SocialLogin user={user} />
      {!user && <form onSubmit={async e => {
        e.preventDefault(); setAuthBusy(true); setMessage('');
        try {
          const { data } = await api.put('/profile', { visitorId: visitorId(), nickname: nicknameDraft.trim() });
          saveNickname(data.nickname); setNicknameDraft(data.nickname); setMessage('방문자 닉네임을 변경했습니다.'); setRevision(v => v + 1);
        } catch (error) { setMessage(error?.response?.data?.error || '닉네임을 변경하지 못했습니다.'); }
        finally { setAuthBusy(false); }
      }}>
        <input aria-label="방문자 닉네임" placeholder="방문자 닉네임" maxLength={20} value={nicknameDraft} onChange={e => setNicknameDraft(e.target.value)} />
        <button className="exam-btn sm" disabled={authBusy || !nicknameDraft.trim()}>닉네임 변경</button>
      </form>}
      <div className="personal-badges" aria-label="내 교육생 배지">
        <h3>개인정보 · 교육생 배지</h3>
        {badges.loading ? <p role="status">배지를 불러오는 중…</p> : badges.error ? <p role="alert">배지를 불러오지 못했습니다. 새로고침해 주세요.</p>
          : badges.values.length ? badges.values.map(badge => <span className="cohort-badge" key={badge.name}>🎖 {badge.name}</span>) : <p>부여된 교육생 배지가 없습니다.</p>}
      </div>
      {message && <p role="alert">{message}</p>}
    </section>
    <section className="membership-panel">
      <h2>내 등급 {tierStatus.membership && <TierBadge tier={tierStatus.membership.tier} division={tierStatus.membership.division} />}</h2>
      {tierStatus.loading ? <p role="status">등급을 불러오는 중…</p> : tierStatus.error ? <p role="alert">등급을 불러오지 못했습니다. 새로고침해 주세요.</p> : <p>
        누적 {tierStatus.membership.solvedCount.toLocaleString()}문제
        {tierStatus.membership.nextTier ? ` · ${tierStatus.membership.nextTierName || TIER_NAMES[tierStatus.membership.nextTier]} 승급 기준: 누적 ${tierStatus.membership.nextThreshold.toLocaleString()}문제 이상 · 앞으로 ${tierStatus.membership.remaining.toLocaleString()}문제` : ' · 최고 등급입니다!'}
      </p>}
      <p>동 쿠키: 기본 방문자 · 은 쿠키: 50문제 · 금 쿠키: SSAFY 16기 교육생 · 다이아 쿠키: 300문제 · 루비 쿠키: 1,000문제</p>
      <p>같은 문제의 반복 풀이는 1문제로 집계합니다.</p>
      <p>금 쿠키 Ⅴ·Ⅳ·Ⅲ·Ⅱ·Ⅰ은 각각 누적 0·30·60·100·200문제부터입니다. 금 쿠키를 부여받아도 기존 풀이 수를 그대로 사용합니다. 시험 승급으로 획득한 최소 등급은 유지됩니다.</p>
    </section>
    <div className="account-record-heading"><p>{user ? '계정에 저장된 기록' : '현재 브라우저의 비로그인 풀이 기록'} · 문제집별 문항 기준</p><button className="exam-btn sm" disabled={loading} onClick={() => { setLoading(true); setRevision(v => v + 1); }}>새로고침</button></div>
    {loading && <p role="status">학습 기록을 불러오는 중… 서버가 깨어나는 데 시간이 걸릴 수 있습니다.</p>}
    {!!result.failed.length && <p role="alert">{result.failed.length}개 기록을 불러오지 못했습니다. 아래는 불러온 기록만 표시합니다. 새로고침하거나 다시 로그인해 주세요.</p>}
    <div className="account-metrics">
      {[[rows.length, '풀어본 문항'], [attempts, '총 풀이 횟수'], [attempts ? `${Math.round(correct / attempts * 100)}%` : '—', '누적 정답률'], [wrong, '최근 오답 문항'], [completed.length, '전공노트 완료']].map(([value, label]) => <div key={label}><strong>{loading ? '…' : value}</strong><span>{label}</span></div>)}
    </div>
    <section className="account-history"><h2>풀었던 문제</h2>
      {!loading && !result.failed.length && retryCount > 0 && <p><Link className="exam-btn primary" to="/account/retry">오답 전체 다시 풀기 ({retryCount}문제)</Link></p>}
      <p>기업·문제집 구분 없이 한 번이라도 틀린 문제를 모두 다시 풀 수 있습니다.</p>
      <div className="account-filters"><input aria-label="풀이 기록 검색" placeholder="문제 또는 문제집 검색" value={query} onChange={e => { setQuery(e.target.value); setLimit(20); }} /><label><input type="checkbox" checked={wrongOnly} onChange={e => { setWrongOnly(e.target.checked); setLimit(20); }} /> 최근 오답만</label></div>
      {!loading && !filtered.length && <p>표시할 풀이 기록이 없습니다.</p>}
      {filtered.slice(0, limit).map(row => <details className="account-question" key={row.key}><summary><span className="account-result">{row.last === 'r' ? '정답' : '오답'}</span><span>{row.bank} · {row.title}</span></summary><div><p>총 {row.c + row.w}회 · 정답 {row.c}회 / 오답 {row.w}회{row.at > 0 && ` · 최근 풀이 ${new Date(row.at).toLocaleString('ko-KR')}`}</p>{row.question && <QuestionExplanation q={row.question} />}<Link to={row.path}>해당 문제집 열기 →</Link></div></details>)}
      {filtered.length > limit && <button className="exam-btn" onClick={() => setLimit(n => n + 20)}>20개 더 보기 ({Math.min(limit, filtered.length)}/{filtered.length})</button>}
    </section>
    <section className="account-notes"><h2>학습 완료한 전공노트</h2>{completed.length ? <ul>{completed.map(entry => <li key={entry.id}><Link to={`${entry.id.startsWith('web-') ? '/web-essentials' : '/notes'}#${entry.id}`}>✓ {entry.title}</Link></li>)}</ul> : <p>아직 완료한 지식이 없습니다.</p>}<Link to="/notes">전공노트 공부하기 →</Link></section>
  </div>;
}
