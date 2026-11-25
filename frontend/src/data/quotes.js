// 사용자가 모은 문장. 원전 인용과 의역·전언을 출처 표기로 구분한다.
export const QUOTES = [
  { text: '운명을 사랑하라.', by: '프리드리히 니체' },
  { text: '오랫동안 꿈을 그리는 사람은 마침내 그 꿈을 닮아간다.', by: '앙드레 말로' },
  { text: '남에게 보여주려고 인생을 낭비하지 마라.', by: '아르투어 쇼펜하우어' },
  { text: '인간은 오직 자기 지성의 척도에 비례하여 다른 이를 파악하고 이해할 수 있다.', by: '아르투어 쇼펜하우어' },
  { text: '인생은 고통과 무료함을 오가는 것이다.', by: '아르투어 쇼펜하우어', source: 'https://earlymoderntexts.com/assets/pdfs/schopenhauer1818bookiv.pdf' },
  { text: '모든 의욕의 기초는 결핍, 부족, 즉 고통이다.', by: '아르투어 쇼펜하우어', source: 'https://earlymoderntexts.com/assets/pdfs/schopenhauer1818bookiv.pdf' },
  { text: '사람은 꿈을 이루고 성공하고 싶어 하지만, 꿈을 이루고 성공할수록 권태에 빠져드는 것은 피할 수 없다.', by: '아르투어 쇼펜하우어' },
  { text: '성공하고 싶다면 원하는 바를 즐기고, 행복하고 싶다면 가진 것을 즐겨라.'},
  { text: '자신의 욕망과 능력을 일치시키는 법을 배우며, 획득된 성격을 통해 자신의 개성을 온전히 알게 된다.', by: '아르투어 쇼펜하우어' },
  { text: '지능은 생존을 위한 도구로, 살려는 의지에 봉사하는 보조 역할을 한다.', by: '아르투어 쇼펜하우어' },
  { text: '고통은 자발적이고 외로움은 수동적이다.', by: 'cookie' },
  { text: '기쁨 다음에 슬픔까지가 하나인 것 같다.', by: 'AKMU 이찬혁' },
  { text: '가장 중요한 것은 스스로 올바르다고 생각되는 길을 걷는 것이다.', by: 'cookie' },
  { text: '당신의 인생은 왜 힘들지 않아야 한다고 생각하십니까?', by: '아르투어 쇼펜하우어' },
];

// 오늘의 명언: 한국 시간 기준으로 하루에 한 번 바뀐다. 같은 날에는 새로고침해도, 누구에게나 같은 문장이 나온다.
// 날짜 번호를 문장 수로 나눈 나머지로 고르므로 목록을 한 바퀴 돈 뒤 다시 처음부터 돌아온다.
const DAY_MS = 24 * 60 * 60 * 1000;
const KST_MS = 9 * 60 * 60 * 1000;

// 특정 날짜(한국 시간, YYYY-MM-DD)에 보여 줄 문장을 고정한다. 목록 번호는 순서가 바뀔 수 있어 문장 내용으로 찾는다.
const PINNED = { '2026-11-25': '오랫동안 꿈을 그리는 사람은 마침내 그 꿈을 닮아간다.' };

export function quoteForDay(now = Date.now()) {
  const kst = now + KST_MS;
  const pinned = PINNED[new Date(kst).toISOString().slice(0, 10)];
  const found = pinned && QUOTES.find((q) => q.text === pinned);
  if (found) return found;
  const day = Math.floor(kst / DAY_MS);
  return QUOTES[day % QUOTES.length];
}
