import { useEffect, useRef, useState } from 'react';
import { REACTIONS, dayLabel } from './chatFormat';

// 채팅 창 두 곳(전체 채팅 · 1:1 대화)이 함께 쓰는 작은 부품들

const QUICK_EMOJI = ['😀', '😂', '🥹', '😍', '🤔', '😭', '😎', '🙌', '👍', '👏', '🙏', '🔥', '🎉', '💯', '☕', '📚', '💪', '✨', '❤️', '👋'];

// 닉네임마다 늘 같은 색을 준다
function hue(name = '') {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)) % 360;
  return h;
}

export function Avatar({ name, online, small }) {
  const initial = [...(name || '?').trim()][0] || '?';
  return (
    <span className={`chat-avatar${small ? ' small' : ''}`} style={{ '--avatar-hue': hue(name) }} aria-hidden="true">
      {initial.toUpperCase()}
      {online && <i className="chat-online-dot" />}
    </span>
  );
}

export function DayDivider({ at }) {
  return <div className="chat-day" role="separator"><span>{dayLabel(at)}</span></div>;
}

// 말풍선 아래 반응. 내가 누른 반응은 색으로 표시한다
export function ReactionChips({ items, onToggle }) {
  if (!items?.length) return null;
  return (
    <div className="chat-reactions">
      {items.map(r => (
        <button type="button" key={r.emoji} className={`chat-reaction${r.mine ? ' mine' : ''}`}
          aria-pressed={r.mine} aria-label={`${r.emoji} 반응 ${r.count}개`} onClick={() => onToggle(r.emoji)}>
          <span>{r.emoji}</span><b>{r.count}</b>
        </button>
      ))}
    </div>
  );
}

// 말풍선에 마우스를 올리면 뜨는 반응 고르기
export function ReactionPicker({ onPick }) {
  return (
    <div className="chat-picker" role="toolbar" aria-label="반응 달기">
      {REACTIONS.map(e => <button type="button" key={e} onClick={() => onPick(e)} aria-label={`${e} 반응`}>{e}</button>)}
    </div>
  );
}

// 입력창 옆 이모지 버튼. 고른 이모지를 글에 넣는다
export function EmojiButton({ onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <span className="chat-emoji" ref={box}>
      <button type="button" className="chat-icon-btn" disabled={disabled} onClick={() => setOpen(o => !o)}
        aria-label="이모지 넣기" aria-expanded={open}>😊</button>
      {open && (
        <div className="chat-emoji-grid" role="dialog" aria-label="이모지">
          {QUICK_EMOJI.map(e => <button type="button" key={e} onClick={() => { onPick(e); setOpen(false); }}>{e}</button>)}
        </div>
      )}
    </span>
  );
}

export function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
