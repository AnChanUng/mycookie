import { useEffect, useRef, useState } from 'react';
import { loadNewsletterEnabled, subscribeNewsletter } from '../newsletterStatus';
import './HeaderSubscribe.css';

// 상단 오른쪽 [구독] 버튼: 누르면 이메일을 받는 작은 창이 열리고, 확인 메일의 링크를 눌러야 구독이 끝난다(이중 동의).
// 저장하는 것은 이메일 주소와 신청·확인 시각뿐이다
export default function HeaderSubscribe() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState('');
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
  }, [open]);

  if (!enabled) return null;

  async function submit(event) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      await subscribeNewsletter(email);
      setSentTo(email.trim());
      setEmail(''); setAgree(false);
    } catch (e) {
      setError(e?.response?.data?.error || '신청하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }

  const toggle = () => { setOpen(o => !o); setSentTo(''); setError(''); };

  return <div className="hs" ref={box}>
    <button type="button" className="hs-trigger" aria-expanded={open} aria-controls="hs-panel" onClick={toggle}>구독</button>
    {open && <div id="hs-panel" className="hs-panel" role="dialog" aria-label="학습 메일 구독">
      {sentTo ? <div className="hs-done" role="status">
        <b>메일함을 확인해 주세요</b>
        <p><span className="hs-mail">{sentTo}</span>로 확인 메일을 보냈어요. 메일 안의 링크를 누르면 구독이 완료되고 첫 메일이 바로 도착해요.</p>
        <p className="hs-fine">링크는 48시간 동안 유효해요. 메일이 안 보이면 스팸함도 확인해 주세요.</p>
        <button type="button" className="hs-close" onClick={() => setOpen(false)}>닫기</button>
      </div> : <form onSubmit={submit}>
        <b className="hs-title">학습 메일 구독</b>
        <p className="hs-desc">매일 아침 8시 30분, 실무 문제 하나와 관련 기업 기술블로그를 보내 드려요.</p>
        <input ref={input} type="email" aria-label="구독할 이메일" placeholder="이메일 주소" autoComplete="email" maxLength={254} required
          disabled={busy} value={email} onChange={e => setEmail(e.target.value)} />
        <label className="hs-agree">
          <input type="checkbox" checked={agree} disabled={busy} onChange={e => setAgree(e.target.checked)} />
          <span>학습 메일 수신과 이메일 주소 수집·이용에 동의합니다. 이메일은 구독을 해지하면 바로 지워요.</span>
        </label>
        <button type="submit" className="hs-submit" disabled={busy || !agree || !email.trim()}>{busy ? '보내는 중…' : '확인 메일 받기'}</button>
        {error && <p className="hs-error" role="alert">{error}</p>}
      </form>}
    </div>}
  </div>;
}
