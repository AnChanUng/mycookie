// 프로필 꾸미기에서 고를 수 있는 것. 서버(MyProfileController)와 같은 목록이어야 한다
export const PROFILE_AVATARS = ['🍪', '🧑‍💻', '🐱', '🐶', '🦊', '🐼', '🐧', '🦉', '🐻', '🐰', '🚀', '🔥', '🌱', '⭐', '🎯', '📚'];

export const PROFILE_INTERESTS = [
  { key: 'backend', label: '백엔드' },
  { key: 'frontend', label: '프론트엔드' },
  { key: 'ai', label: 'AI' },
  { key: 'data', label: '데이터' },
  { key: 'cloud', label: '클라우드' },
  { key: 'security', label: '보안' },
  { key: 'cs', label: 'CS 기초' },
  { key: 'algo', label: '코딩테스트' },
  { key: 'public', label: '공기업' },
  { key: 'finance', label: '금융권' },
];

export const PROFILE_MAX_INTERESTS = 5;
export const PROFILE_MAX_TEXT = 60;

// 등급 순서(낮은 것부터). 테마 · 테두리는 이 등급 이상이면 열린다
export const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'RUBY'];
export const isUnlocked = (minTier, tier) => TIER_ORDER.indexOf(tier || 'BRONZE') >= TIER_ORDER.indexOf(minTier);

// 카드 테마: 강조 색 하나만 바꾼다(사이트의 "파란 강조 하나" 원칙을 테마 색으로)
export const PROFILE_THEMES = [
  { key: 'basic', label: '기본', color: '#3182f6', minTier: 'BRONZE' },
  { key: 'cookie', label: '쿠키', color: '#c9813f', minTier: 'BRONZE' },
  { key: 'mint', label: '민트', color: '#00a878', minTier: 'SILVER' },
  { key: 'silver', label: '은빛', color: '#6f8196', minTier: 'SILVER' },
  { key: 'gold', label: '금빛', color: '#c18a25', minTier: 'GOLD' },
  { key: 'sunset', label: '노을', color: '#f0723c', minTier: 'GOLD' },
  { key: 'diamond', label: '다이아', color: '#1a9ad0', minTier: 'DIAMOND' },
  { key: 'night', label: '밤하늘', color: '#5b5cf6', minTier: 'DIAMOND' },
  { key: 'ruby', label: '루비', color: '#ce355e', minTier: 'RUBY' },
];

// 아이콘 테두리
export const PROFILE_FRAMES = [
  { key: 'none', label: '없음', minTier: 'BRONZE' },
  { key: 'silver', label: '은 테두리', minTier: 'SILVER' },
  { key: 'gold', label: '금 테두리', minTier: 'GOLD' },
  { key: 'diamond', label: '다이아 반짝', minTier: 'DIAMOND' },
  { key: 'ruby', label: '루비 빛', minTier: 'RUBY' },
];
