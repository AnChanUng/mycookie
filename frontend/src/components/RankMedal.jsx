import './RankMedal.css';

// 1~3위 순위 배지: 금, 은, 동 색 원에 순위 숫자. 4위부터는 숫자만.
// 쿠키 그림은 등급(TierBadge)만 뜻하게 두고, 순위는 색 숫자로 구분한다
export default function RankMedal({ rank, className = '' }) {
  if (!(rank >= 1 && rank <= 3)) return <span className={className}>{rank}</span>;
  return <span className={`rank-medal m${rank} ${className}`} aria-label={`${rank}위`}>{rank}</span>;
}
