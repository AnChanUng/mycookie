// 프로필 꾸미기에서 고를 수 있는 것. 서버(MyProfileController)와 같은 목록이어야 한다
// 기본 아이콘. 예전에 있던 🧑‍💻 🔥 🌱 ⭐ 🎯 📚은 목록에서 뺐고, 이미 고른 사람은 바꾸기 전까지 그대로 쓴다
export const PROFILE_AVATARS = ['🍪', '🐱', '🐶', '🦊', '🐼', '🐧', '🦉', '🐻', '🐰', '🚀'];
// 포인트 상점에서 사야 쓸 수 있는 아이콘(가격은 서버 PointService.SHOP이 정한다)
// 상점 아이콘 이름(상점 카드에 "아이콘 🦄" 대신 보여 준다)
export const SHOP_AVATAR_NAMES = { '🦄': '유니콘', '🐲': '용', '👑': '왕관', '🍩': '도넛', '🧠': '두뇌', '💎': '다이아몬드', '🎀': '리본', '🌸': '벚꽃', '🦋': '나비', '🍓': '딸기', '🧸': '곰인형', '🐹': '햄스터', '🌷': '튤립', '🔮': '수정구슬', '🐉': '황룡' };
// 🧠 🐲 💎은 상점에서 내렸다(서버 PointService.RETIRED). 이미 산 사람은 꾸미기 화면에서 계속 고를 수 있다
export const SHOP_AVATARS = ['🦄', '👑', '🍩', '🎀', '🌸', '🦋', '🍓', '🧸', '🐹', '🌷', '🔮', '🐉', '🧠', '🐲', '💎'];
// 레어 · 전설 아이콘. 프로필 카드에서 아이콘 뒤에 빛이 돈다
export const SHOP_AVATAR_RARITY = { '🔮': '레어', '🐉': '전설' };
// 등급 이름을 화면 클래스(rare · legend)로 바꾼다
export const rarityClass = rarity => (rarity === '전설' ? 'legend' : rarity ? 'rare' : '');

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
  // 아래는 포인트 상점 테마(shop: true). 등급과 상관없이 사면 열린다
  { key: 'sakura', label: '벚꽃', color: '#e0679a', shop: true },
  { key: 'ocean', label: '바다', color: '#0f9fb5', shop: true },
  { key: 'forest', label: '숲', color: '#2f9e44', shop: true },
  { key: 'grape', label: '포도', color: '#8b5cf6', shop: true },
  { key: 'ink', label: '먹물', color: '#3b4252', shop: true },
  { key: 'peach', label: '복숭아', color: '#f0806a', shop: true },
  { key: 'lavender', label: '라벤더', color: '#9b7be8', shop: true },
  { key: 'rose', label: '로즈골드', color: '#c47a7f', shop: true },
  // 레어 · 전설 테마는 배너가 여러 색으로 흐른다(gradient). color는 글자 · 버튼 강조 색
  { key: 'opal', label: '오팔', color: '#7c6cf0', shop: true, rarity: '레어', gradient: 'linear-gradient(120deg, #7bf1d6, #8fb8ff 35%, #c3a1ff 65%, #ffb3de)' },
  { key: 'nebula', label: '성운', color: '#6d4aff', shop: true, rarity: '전설', gradient: 'linear-gradient(120deg, #0b1033, #3b1f7a 30%, #b0308f 60%, #f6a33b 90%)' },
];

// 아이콘 테두리
export const PROFILE_FRAMES = [
  { key: 'none', label: '없음', minTier: 'BRONZE' },
  { key: 'silver', label: '은 테두리', minTier: 'SILVER' },
  { key: 'gold', label: '금 테두리', minTier: 'GOLD' },
  { key: 'diamond', label: '다이아 반짝', minTier: 'DIAMOND' },
  { key: 'ruby', label: '루비 빛', minTier: 'RUBY' },
  { key: 'flame', label: '불꽃 고리', shop: true },
  { key: 'rainbow', label: '무지개 고리', shop: true },
  { key: 'pastel', label: '파스텔 고리', shop: true },
  { key: 'ribbon', label: '리본 고리', shop: true },
  { key: 'heart', label: '하트 반짝', shop: true },
  { key: 'aurora', label: '오로라', shop: true, rarity: '레어' },
  { key: 'galaxy', label: '은하수', shop: true, rarity: '전설' },
];

// 상점 아이템 키("theme:sakura")와 보유 여부. 등급 보상은 등급으로, 상점 아이템은 산 것만 열린다
export const itemKey = (kind, key) => `${kind}:${key}`;
export const canUse = (kind, option, tier, owned) => option.shop ? (owned || []).includes(itemKey(kind, option.key)) : isUnlocked(option.minTier, tier);
