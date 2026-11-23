import { useEffect, useRef, useState } from 'react';
import { loadNewsletterEnabled, subscribeNewsletter, verifyNewsletter } from '../newsletterStatus';
import './HeaderSubscribe.css';

// 상단 오른쪽 [구독] 버튼. 흐름: 이메일 입력 → 메일로 받은 6자리 인증 번호 입력 → 확인.
// 확인 버튼은 번호 6자리를 넣어야만 눌리고, 번호는 60초가 지나야 다시 받을 수 있다. 저장하는 것은 이메일 주소와 신청·확인 시각뿐이다.
export const RESEND_SECONDS = 60;

const BENEFITS = [
  ['실무형 문제 1개', '코드와 상황이 있는 4지선다'],
  ['이어지는 기업 기술블로그', '문제와 같은 주제의 실제 글'],
  ['정답과 해설', '메일 맨 아래에서 확인'],
];

export default function HeaderSubscribe() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('email'); // email → code → done
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState('');
  const box = useRef(null);
  const input = useRef(null);

  useEffect(() => {
    let alive = true;
    loadNewsletterEnabled().then(value => { if (alive) setEnabled(value); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    input.current?.focus();
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    const onClick = event => { if (box.current && !box.current.contains(event.target)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open, step]);

  // 인증 번호를 다시 받을 수 있을 때까지 남은 초를 센다
  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait(w => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  if (!enabled) return null;

  async function sendCode(event) {
    event?.preventDefault();
    if (busy || wait > 0) return;
    setBusy(true); setError('');
    try {
      await subscribeNewsletter(email);
      setStep('code'); setCode(''); setWait(RESEND_SECONDS);
    } catch (e) {
      setError(e?.response?.data?.error || '인증 번호를 보내지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }

  async function confirm(event) {
    event.preventDefault();
    if (busy || !/^\d{6}$/.test(code)) return;
    setBusy(true); setError('');
    try {
      await verifyNewsletter(email, code);
      setStep('done');
    } catch (e) {
      setError(e?.response?.data?.error || '확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }

  const reset = () => { setStep('email'); setCode(''); setError(''); setWait(0); setAgree(false); };
  const toggle = () => { if (open && step === 'done') { setEmail(''); reset(); } setOpen(o => !o); };
  const close = () => { setOpen(false); if (step === 'done') { setEmail(''); reset(); } };
  const stepNo = step === 'email' ? 1 : 2;

  return <div className="hs" ref={box}>
    <button type="button" className="hs-trigger" aria-expanded={open} aria-controls="hs-panel" onClick={toggle}>구독</button>
    {open && <div id="hs-panel" className="hs-panel" role="dialog" aria-label="학습 메일 구독">
      <header className="hs-head">
        <span className="hs-icon" aria-hidden="true">✉</span>
        <div>
          <b className="hs-title">학습 메일 구독</b>
          <span className="hs-sub">평일(월~금) 아침 8시 30분, 한 통</span>
        </div>
      </header>

      {step !== 'done' && <>
        <ul className="hs-benefits" aria-label="받는 내용">
          {BENEFITS.map(([title, desc]) => <li key={title}><i aria-hidden="true">✓</i><span><b>{title}</b><small>{desc}</small></span></li>)}
        </ul>
        <ol className="hs-steps" aria-label="진행 단계">
          <li className={stepNo === 1 ? 'on' : 'past'}><i>{stepNo > 1 ? '✓' : '1'}</i>이메일 입력</li>
          <li className={stepNo === 2 ? 'on' : ''}><i>2</i>인증 번호 확인</li>
        </ol>
      </>}

      {step === 'done' && <div className="hs-done" role="status">
        <span className="hs-done-icon" aria-hidden="true">✓</span>
        <b>구독이 시작됐어요</b>
        <p><span className="hs-mail">{email}</span>로 다음 평일 아침 8시 30분부터 학습 메일이 도착해요(월~금).</p>
        <button type="button" className="hs-submit" onClick={close}>닫기</button>
      </div>}

      {step === 'email' && <form onSubmit={sendCode}>
        <input ref={input} className="hs-field" type="email" aria-label="구독할 이메일" placeholder="이메일 주소" autoComplete="email" maxLength={254} required
          disabled={busy} value={email} onChange={e => setEmail(e.target.value)} />
        <label className="hs-agree">
          <input type="checkbox" checked={agree} disabled={busy} onChange={e => setAgree(e.target.checked)} />
          <span>학습 메일 수신과 이메일 주소 수집·이용에 동의합니다. 이메일은 구독을 해지하면 바로 지워요.</span>
        </label>
        <button type="submit" className="hs-submit" disabled={busy || !agree || !email.trim()}>{busy ? '보내는 중…' : '인증 번호 받기'}</button>
        {error && <p className="hs-error" role="alert">{error}</p>}
      </form>}

      {step === 'code' && <form onSubmit={confirm}>
        <p className="hs-desc"><span className="hs-mail">{email}</span>로 6자리 번호를 보냈어요. 10분 안에 입력해 주세요. 메일이 안 보이면 스팸함도 확인해 주세요.</p>
        <input ref={input} className="hs-field hs-code" inputMode="numeric" autoComplete="one-time-code" aria-label="인증 번호 6자리" placeholder="000000" maxLength={6}
          disabled={busy} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        <button type="submit" className="hs-submit" disabled={busy || !/^\d{6}$/.test(code)}>{busy ? '확인하는 중…' : '확인'}</button>
        <div className="hs-links">
          <button type="button" className="hs-link" disabled={busy || wait > 0} onClick={sendCode}>{wait > 0 ? `${wait}초 뒤에 다시 받을 수 있어요` : '인증 번호 다시 받기'}</button>
          <button type="button" className="hs-link" disabled={busy} onClick={reset}>이메일 바꾸기</button>
        </div>
        {error && <p className="hs-error" role="alert">{error}</p>}
      </form>}

      {step !== 'done' && <p className="hs-trust">광고 없이 학습 메일만 보내요 · 메일마다 수신 거부 링크가 있어요 · 해지하면 이메일은 바로 삭제돼요</p>}
    </div>}
  </div>;
}
