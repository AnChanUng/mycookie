import { useEffect, useState } from 'react';
import api from '../api';

// 학습 메일 구독. 이메일을 넣고 동의하면 확인 메일이 가고, 링크를 누르면 바로 첫 학습 메일을 받는다
export default function NewsletterSubscribe() {
  const [enabled, setEnabled] = useState(null);
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let alive = true;
    api.get('/newsletter/status').then(({ data }) => { if (alive) setEnabled(!!data?.enabled); }).catch(() => { if (alive) setEnabled(false); });
    return () => { alive = false; };
  }, []);
  if (!enabled) return null;
  async function submit(event) {
    event.preventDefault();
    setBusy(true); setMessage('');
    try {
      await api.post('/newsletter/subscribe', { email: email.trim() }, { timeout: 90000 });
      setEmail(''); setAgree(false);
      setMessage('확인 메일을 보냈어요. 메일의 링크를 누르면 바로 첫 학습 메일이 도착합니다.');
    } catch (error) {
      setMessage(error?.response?.data?.error || '구독하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }
  return <form className="newsletter-subscribe" onSubmit={submit}>
    <h2>학습 메일 구독</h2>
    <p>매일 아침 8시 30분, 오늘의 문제 · 오늘의 CS · 기술블로그를 한 통에 담아 보내 드려요. 무료이고 언제든 수신 거부할 수 있어요.</p>
    <div className="newsletter-row">
      <input type="email" aria-label="구독할 이메일" placeholder="이메일 주소" autoComplete="email" maxLength={254} required disabled={busy} value={email} onChange={e => setEmail(e.target.value)} />
      <button disabled={busy || !agree || !email.trim()}>구독하기</button>
    </div>
    <label className="newsletter-agree">
      <input type="checkbox" checked={agree} disabled={busy} onChange={e => setAgree(e.target.checked)} />
      학습 메일 수신과 이메일 주소 수집(구독 기간 동안 보관)에 동의합니다.
    </label>
    {message && <p role="status">{message}</p>}
  </form>;
}
