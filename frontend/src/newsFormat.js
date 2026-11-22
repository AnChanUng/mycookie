// 기업 소식의 발행 시각을 한국 시간(KST) 기준 "2026.11.21" 모양으로 바꾼다. 잘못된 값이면 빈 문자열
export const formatNewsDate = iso => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const kst = new Date(date.getTime() + 9 * 3600000);
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')}`;
};
