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

const LAST_QUOTE_KEY = 'home:last-quote:v1';
let lastQuote = '';

// 홈 진입·새로고침마다 선택한다. 화면 안에서 상태만 바뀔 때는 같은 문장을 유지한다.
export function quoteForVisit() {
  let previous = lastQuote;
  try { previous = localStorage.getItem(LAST_QUOTE_KEY) || previous; } catch { /* 저장소를 쓸 수 없으면 메모리 값을 사용한다 */ }
  const candidates = QUOTES.filter(quote => quote.text !== previous);
  const quote = candidates[Math.floor(Math.random() * candidates.length)];
  return quote;
}

// 실제 표시된 문장을 기록한다. StrictMode의 초기화 재호출이 마지막 문장을 바꾸지 않게 한다.
export function rememberQuote(quote) {
  lastQuote = quote.text;
  try { localStorage.setItem(LAST_QUOTE_KEY, quote.text); } catch { /* 저장소가 없어도 메모리로 중복을 피한다 */ }
}
