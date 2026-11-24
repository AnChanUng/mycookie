import '../styles/profile-frames.css';

// 고른 대표 아이콘(이모지)과 등급 테두리. 고른 게 없으면 아무것도 그리지 않는다(부르는 쪽이 지금 모습을 그대로 그린다)
export default function ProfileAvatar({ look, size = 28, label }) {
  if (!look?.avatar) return null;
  const frame = look.frame && look.frame !== 'none' ? ` frame-${look.frame}` : '';
  return <span className={`pf-avatar${size <= 30 ? ' pf-small' : ''}${frame}`} style={{ '--pf-size': `${size}px` }}
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>{look.avatar}</span>;
}
