// 학습 메일 "오늘 주제 5문제"의 풀이 기록. 오답노트에서 틀린 문제를 다시 보려고 문제 본문까지 이 브라우저에 저장한다.
// 문제는 150개뿐이라 작고, 같은 문제를 다시 맞히면 오답에서 빠진다
const KEY = 'daily-practice:v1';

function read(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

const store = () => (typeof localStorage === 'undefined' ? null : localStorage);

export function recordDailyAnswer(day, index, theme, question, correct, at = Date.now(), storage = store()) {
  if (!storage) return;
  const rows = read(storage);
  const id = `${day}.${index}`;
  const prev = rows[id] || {};
  rows[id] = {
    day: Number(day), index, theme,
    question: { title: question.title, context: question.context, prompt: question.prompt, options: question.options, answer: question.answer, explanation: question.explanation },
    c: (prev.c || 0) + (correct ? 1 : 0),
    w: (prev.w || 0) + (correct ? 0 : 1),
    last: correct ? 'c' : 'w',
    at,
  };
  try { storage.setItem(KEY, JSON.stringify(rows)); } catch { /* 저장 공간이 없으면 기록만 건너뛴다 */ }
}

// 마지막 풀이에서 틀린 문제(최근에 틀린 순)
export function dailyWrongRows(storage = store()) {
  if (!storage) return [];
  return Object.entries(read(storage))
    .filter(([, row]) => row?.last === 'w' && row.question)
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => (b.at || 0) - (a.at || 0));
}

export function dailySummary(storage = store()) {
  const rows = Object.values(read(storage || { getItem: () => null }));
  return { seen: rows.length, open: rows.filter(r => r?.last === 'w').length };
}
