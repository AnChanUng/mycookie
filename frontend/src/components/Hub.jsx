import { Children } from 'react';
import { Link } from 'react-router-dom';
import '../styles/hub.css';

// 메뉴 첫 화면(AI · 웹 개발 · 전공필기 · 자격증 등)이 함께 쓰는 틀.
// 흰 면 + 얇은 테두리 + 파란 강조 하나(styles/inner.css의 웹 스타일)에 맞춘다

// 칸 하나를 사이트 안 주소(to), 바깥 주소(href, 새 탭), 누를 수 없는 칸(둘 다 없음) 중 하나로 그린다
function Tile({ to, href, className, label, children }) {
  if (to) return <Link to={to} className={className} aria-label={label}>{children}</Link>;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={className}
    aria-label={label ? `${label} (새 탭에서 열림)` : undefined}>{children}</a>;
  return <div className={`${className} disabled`} aria-label={label}>{children}</div>;
}

// 화면 제목: 뒤로 가기, 작은 라벨, 큰 제목, 설명, 요약 숫자
export function HubHeader({ back = { to: '/', label: '홈으로' }, eyebrow, title, desc, stats = [] }) {
  return (
    <div className="page-header hub-head">
      {back && <Link to={back.to} className="back-link">← {back.label}</Link>}
      {eyebrow && <p className="ds-eyebrow hub-eyebrow">{eyebrow}</p>}
      <h1>{title}</h1>
      {desc && <p className="hub-desc">{desc}</p>}
      {stats.length > 0 && (
        <ul className="hub-stats" aria-label="요약">
          {stats.map(s => <li key={s.label}><b>{s.value}</b><span>{s.label}</span></li>)}
        </ul>
      )}
    </div>
  );
}

// 맨 위에 한 줄 전체를 쓰는 큰 칸(가장 먼저 눌러 볼 곳)
export function HubFeature({ to, href, icon, title, desc, meta, cta }) {
  return (
    <Tile to={to} href={href} className="hub-feature">
      <span className="ds-icon hub-feature-icon" aria-hidden="true">{icon}</span>
      <span className="hub-feature-body">
        <span className="hub-feature-title">{title}</span>
        {desc && <span className="hub-feature-desc">{desc}</span>}
      </span>
      {meta && <span className="hub-feature-meta">{meta}</span>}
      {cta && <span className="ds-btn ds-btn--primary hub-feature-cta">{cta} <span aria-hidden="true">{href ? '↗' : '→'}</span></span>}
    </Tile>
  );
}

// 제목이 붙은 칸 묶음. 칸은 3열(4개일 때는 4열)
export function HubSection({ title, note, children }) {
  return (
    <section className="hub-section" aria-label={title}>
      {title && <h2 className="hub-section-title">{title}</h2>}
      {note && <p className="hub-section-note">{note}</p>}
      {/* 칸이 딱 4개면 한 줄에 4개를 놓아 한 칸만 아래로 떨어지지 않게 한다 */}
      <div className={`hub-grid${Children.count(children) === 4 ? ' hub-grid--4' : ''}`}>{children}</div>
    </section>
  );
}

// ' · '(앞뒤 띄어쓰기)로 이은 주제 글을 작은 칩으로 나눈다. 'IoC·DI'처럼 붙여 쓴 건 한 칩으로 둔다
const split = text => (text || '').split(/\s+·\s+/).map(t => t.trim()).filter(Boolean);

// 칸 하나: 아이콘 · 배지 / 제목 / 설명 또는 주제 칩 / 아래쪽 바로가기
export function HubCard({ to, href, icon, badge, title, desc, topics, go, label }) {
  const chips = Array.isArray(topics) ? topics : topics ? split(topics) : [];
  return (
    <Tile to={to} href={href} className="hub-card" label={label || title}>
      <span className="hub-card-top">
        <span className="ds-icon" aria-hidden="true">{icon}</span>
        {badge && <span className="ds-badge">{badge}</span>}
      </span>
      <span className="hub-card-title">{title}</span>
      {desc && <span className="hub-card-desc">{desc}</span>}
      {chips.length > 0 && <span className="hub-topics">{chips.map(t => <span key={t} className="hub-topic">{t}</span>)}</span>}
      <span className="hub-card-go">{go || (href ? '열기' : '풀러 가기')} <span aria-hidden="true">{href ? '↗' : '→'}</span></span>
    </Tile>
  );
}
