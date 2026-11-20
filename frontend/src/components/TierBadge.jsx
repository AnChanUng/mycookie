import { TIER_NAMES } from '../membership';
import './TierBadge.css';
const COLORS = {
  BRONZE: ['#d9a06b', '#92532d', '#704028'],
  SILVER: ['#e0e6ec', '#8293a6', '#627488'],
  GOLD: ['#ffda78', '#c18a25', '#93601d'],
  DIAMOND: ['#b5efff', '#2895c3', '#167394'],
  RUBY: ['#ffb0bf', '#ce355e', '#962246'],
};
// 등급 색 쿠키 그림 하나. 등급 배지, 순위 메달, 승급 알림이 같이 쓴다
export function CookieIcon({ tier }) {
  const [dough, rim, chip] = COLORS[tier] || COLORS.BRONZE;
  return <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
    <path d="M20 3 25 4 29 6 33 9 35 14 37 19 36 24 33 29 29 33 24 35 19 36 14 35 9 32 6 28 4 23 3 18 5 13 8 8 13 5Z" fill={dough} stroke={rim} strokeWidth="2.4" strokeLinejoin="round" />
    <path d="M10 12Q17 5 26 9" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity=".65" />
    <g fill={chip}><path d="m12 12 4 1-1 5-5-1Z"/><path d="m25 12 4 2-2 4-4-2Z"/><path d="m17 22 4-2 3 4-4 3Z"/><circle cx="10" cy="25" r="2.3"/><circle cx="28" cy="26" r="2.4"/><circle cx="18" cy="31" r="1.5"/></g>
    {(tier === 'DIAMOND' || tier === 'RUBY') && <path d="m29 1 3 4-3 5-3-5Z" fill={tier === 'RUBY' ? '#ef3167' : '#37cdf5'} stroke="white" strokeWidth="1.3" />}
  </svg>;
}

export default function TierBadge({ tier, division = 5 }) {
  if (!TIER_NAMES[tier]) return null;
  division = Number.isInteger(division) && division >= 1 && division <= 5 ? division : 5;
  const label = `${TIER_NAMES[tier]} ${["", "Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ", "Ⅴ"][division]}`;
  return <span className={`tier-badge tier-${tier.toLowerCase()}`} aria-label={`등급 ${label}`} title={label}>
    <CookieIcon tier={tier} />
    <span className="cookie-division" aria-hidden="true">{division}</span>
  </span>;
}
