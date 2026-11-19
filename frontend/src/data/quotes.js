// 메인 첫 줄에 보여 줄 명언. 날마다(한국 시간) 하나씩 돌아가며 나온다. 새 명언은 아래에 추가한다
export const QUOTES = [
  { text: '운명을 사랑하라.', by: '프리드리히 니체' },
];

export function quoteForDay(dayNumber) {
  return QUOTES[((dayNumber % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
