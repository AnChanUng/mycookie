import { useEffect, useState } from 'react';

const TOAST_MS = 7000;

const isDawn = () => new Date().getHours() < 6;

// 첫 화면의 분위기 요소: 새벽 응원
export default function StudyAmbience() {
  const [toasts, setToasts] = useState(() => {
    try {
      if (!isDawn() || sessionStorage.getItem('dawn-cheer')) return [];
      sessionStorage.setItem('dawn-cheer', '1');
    } catch { /* 저장소를 못 써도 응원은 보여 준다 */ }
    return isDawn() ? ['🌙 새벽에 힘내요!!!'] : [];
  });

  useEffect(() => {
    if (!toasts.length) return;
    const timer = setTimeout(() => setToasts(t => t.slice(1)), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <div className="ambience-notes" role="status">
      {toasts.slice(0, 1).map(t => <span key={t} className="ambience-note toast">{t}</span>)}
    </div>
  );
}
