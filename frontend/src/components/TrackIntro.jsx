import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TRACK_INTROS } from '../data/trackIntros';
import './TrackIntro.css';

const storeKey = track => `track-intro:${track}:closed`;
const readClosed = track => { try { return localStorage.getItem(storeKey(track)) === '1'; } catch { return false; } };

// 메뉴 첫 화면 맨 위의 "이 메뉴의 본질" 안내. 접으면 그 메뉴에서는 접힌 채로 기억한다(이 브라우저에만)
export default function TrackIntro({ track }) {
  const intro = TRACK_INTROS[track];
  const [closed, setClosed] = useState(() => readClosed(track));
  if (!intro) return null;
  const toggle = () => {
    const next = !closed;
    setClosed(next);
    try { localStorage.setItem(storeKey(track), next ? '1' : '0'); } catch { /* 기억하지 못해도 화면은 동작 */ }
  };
  const bodyId = `track-intro-${track}`;
  return (
    <section className={`track-intro${closed ? ' closed' : ''}`} aria-label="이 메뉴의 본질">
      <div className="track-intro-head">
        <p className="track-intro-eyebrow">이 메뉴의 본질</p>
        <button type="button" className="track-intro-toggle" aria-expanded={!closed} aria-controls={bodyId} onClick={toggle}>
          {closed ? '펼치기' : '접기'}
        </button>
      </div>
      <h2 className="track-intro-title">{intro.title}</h2>
      {!closed && <div id={bodyId}>
        <p className="track-intro-essence">{intro.essence}</p>
        <p className="track-intro-label">이렇게 공부하세요</p>
        <ol className="track-intro-steps">
          {intro.steps.map((s, i) => <li key={i}>
            <span className="track-intro-no" aria-hidden="true">{i + 1}</span>
            {s.to ? <Link to={s.to}>{s.text} <span aria-hidden="true">→</span></Link> : <span>{s.text}</span>}
          </li>)}
        </ol>
        <Link to="/intro#how" className="track-intro-all">나의쿠키 전체 공부 순서 보기 →</Link>
      </div>}
    </section>
  );
}
