import { ACCOUNT_BANKS } from './accountRecords';
import { allQuestions } from './data/examQuestions';
import { CS_NOTES } from './data/csNotes';

// 이 브라우저에 쌓인 학습 기록(문제은행 · 전공노트)을 한 번에 요약한다. 내 학습 · 메인 화면이 같이 쓴다.
// 저장 형식은 바꾸지 않고 읽기만 한다(이용자 데이터 보존)

const DAY = 24 * 60 * 60 * 1000;
const kstDay = (t) => Math.floor((t + 9 * 60 * 60 * 1000) / DAY); // 한국 날짜 번호

export function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}

export function collectLearning(user) {
  const areas = new Map();
  const days = new Set();
  const recent = [];
  let attempts = 0, correct = 0, solved = 0, wrongOpen = 0, week = 0;
  const now = Date.now();
  for (const bank of ACCOUNT_BANKS) {
    const stats = readJson(`exam-progress:${bank.key}`, {})?.stats || {};
    if (!Object.keys(stats).length) continue;
    const byId = new Map(allQuestions(bank).map(q => [String(q.id), q]));
    for (const [id, s] of Object.entries(stats)) {
      const c = Math.max(0, Number(s?.c) || 0), w = Math.max(0, Number(s?.w) || 0);
      if (!(c + w)) continue;
      const q = byId.get(id);
      solved++; attempts += c + w; correct += c;
      if (s.last === 'w') wrongOpen++;
      if (s.at) {
        days.add(kstDay(s.at));
        if (now - s.at < 7 * DAY) week++;
        recent.push({ id: `${bank.key}:${id}`, title: q?.q || `문항 ${id}`, bank: bank.name, ok: s.last !== 'w', at: s.at });
      }
      const name = bank.sections?.[q?.sec]?.name || q?.topic || '기타';
      const a = areas.get(name) || { name, c: 0, w: 0 };
      a.c += c; a.w += w;
      areas.set(name, a);
    }
  }
  // 오늘(또는 어제)까지 하루도 빠지지 않고 이어진 날 수
  let streak = 0;
  const today = kstDay(now);
  let d = days.has(today) ? today : today - 1;
  while (days.has(d)) { streak++; d--; }

  const weak = [...areas.values()]
    .filter(a => a.c + a.w >= 3)
    .map(a => ({ ...a, rate: Math.round(a.c / (a.c + a.w) * 100) }))
    .sort((x, y) => x.rate - y.rate)
    .slice(0, 4);

  const notes = user ? readJson(`cs-notes:v1:${user.nickname}`, {}) : {};
  const notesDone = Object.values(notes || {}).filter(v => v?.done).length;

  recent.sort((a, b) => b.at - a.at);
  return {
    attempts, correct, solved, wrongOpen, week, streak,
    rate: attempts ? Math.round(correct / attempts * 100) : null,
    weak, recent: recent.slice(0, 5), notesDone,
  };
}


export const NOTES_TOTAL = CS_NOTES.reduce((n, s) => n + (s.items?.length || 0), 0);
