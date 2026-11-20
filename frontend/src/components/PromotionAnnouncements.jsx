import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api';
import { refreshMembership } from '../membership';
import './PromotionAnnouncements.css';
import { CookieIcon } from './TierBadge';
import { tierFromName } from '../membership';

const CONFETTI = Array.from({ length: 96 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, delay: `${(i % 16) * -0.27}s`,
  duration: `${3 + (i % 7) * 0.35}s`, color: ['#ffe28a', '#b9a0ff', '#7de3df', '#ff9dbb', '#ffffff'][i % 5],
}));

function Celebration({ notice, dismiss }) {
  const close = useRef(null);
  useEffect(() => {
    const timer = setTimeout(dismiss, 12000);
    if (typeof document === 'undefined') return () => clearTimeout(timer);
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') dismiss();
      if (event.key === 'Tab') { event.preventDefault(); close.current?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      if (previousFocus?.isConnected) previousFocus.focus?.();
    };
  }, [dismiss]);
  return <div className="promotion-celebration" role="dialog" aria-modal="true" aria-labelledby="promotion-title" aria-describedby="promotion-description">
    <div className="promotion-confetti" aria-hidden="true">{CONFETTI.map((piece, i) => <i key={i} style={{ left: piece.left, '--delay': piece.delay, '--duration': piece.duration, '--piece': piece.color }} />)}</div>
    <div className="promotion-halo" aria-hidden="true" />
    <section className="promotion-stage">
      <div className="promotion-eyebrow">A NEW LEVEL UNLOCKED</div>
      <div className="promotion-medal" aria-hidden="true"><CookieIcon tier={tierFromName(notice.tierName) || 'GOLD'} /></div>
      <h2 id="promotion-title">쿠키 티어 승급!</h2>
      <div className="promotion-tier">{notice.tierName}</div>
      <p id="promotion-description"><strong>{notice.nickname}</strong>님이 <strong>{notice.tierName}</strong>로 승급했습니다!</p>
      <p className="promotion-cheer">차곡차곡 쌓은 실력, 드디어 빛나는 순간.<br />정말 축하합니다! 🎉</p>
      <button ref={close} type="button" className="promotion-dismiss" onClick={dismiss} aria-label="승급 알림 닫기">멋져요! 계속 공부하기 <span aria-hidden="true">→</span></button>
      <small>12초 후 자동으로 닫혀요 · Esc로 닫기</small>
    </section>
  </div>;
}

export default function PromotionAnnouncements() {
  const [notices, setNotices] = useState([]);
  const dismiss = useCallback(() => setNotices(previous => previous.slice(1)), []);
  useEffect(() => {
    if (typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(`${api.defaults.baseURL}/promotions/stream`);
    const seen = new Set();
    const receive = event => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!data || typeof data.id !== 'string' || typeof data.nickname !== 'string' || typeof data.tierName !== 'string' || seen.has(data.id)) return;
      seen.add(data.id);
      if (seen.size > 300) seen.delete(seen.values().next().value);
      setNotices(previous => [...previous, data]);
      refreshMembership();
    };
    source.addEventListener('promotion', receive);
    return () => { source.removeEventListener('promotion', receive); source.close(); };
  }, []);
  return notices.length ? <Celebration key={notices[0].id} notice={notices[0]} dismiss={dismiss} /> : null;
}
