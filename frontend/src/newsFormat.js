const KST = 9 * 3600000;
const DAY = 86400000;

// 기업 소식의 발행 시각을 한국 시간(KST) 기준 "2026.11.21" 모양으로 바꾼다. 잘못된 값이면 빈 문자열
export const formatNewsDate = iso => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const kst = new Date(date.getTime() + KST);
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')}`;
};

// 한국 날짜로 오늘부터 며칠 전인지. 잘못된 값이면 null
export const daysAgo = (iso, now = Date.now()) => {
  const at = iso ? Date.parse(iso) : NaN;
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.floor((now + KST) / DAY) - Math.floor((at + KST) / DAY));
};

// "오늘", "어제", "3일 전", "2주 전", 한 달이 넘으면 "2026.10.02"
export const relativeNewsDate = (iso, now = Date.now()) => {
  const d = daysAgo(iso, now);
  if (d === null) return '';
  if (d === 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return formatNewsDate(iso);
};

// 목록을 나누는 제목: 오늘 · 어제 · 최근 7일 · 최근 30일, 그보다 오래되면 "2026년 10월"
export const newsDateGroup = (iso, now = Date.now()) => {
  const d = daysAgo(iso, now);
  if (d === null) return '날짜 모름';
  if (d === 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return '최근 7일';
  if (d < 30) return '최근 30일';
  const kst = new Date(Date.parse(iso) + KST);
  return `${kst.getUTCFullYear()}년 ${kst.getUTCMonth() + 1}월`;
};
