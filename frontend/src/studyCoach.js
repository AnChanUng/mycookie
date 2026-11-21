// Plans are scoped to the signed-in account on this browser. No tokens or profile data go to AI.
export const SUBJECTS = { db: '데이터베이스', os: '운영체제·컴퓨터구조', net: '네트워크', ds: '자료구조·알고리즘', sec: '정보보호', se: '소프트웨어공학', pl: '프로그래밍', bd: '빅데이터·AI' };
export const EXAMS = { backend: '백엔드 전공필기', finance: '금융권 IT 전공필기', general: '컴퓨터일반', interview: 'CS 기술면접 기초', data: '데이터·AI 전공 기초' };
export const SCOPES = { backend: ['db', 'net', 'os', 'pl', 'ds'], finance: ['db', 'os', 'net', 'sec', 'ds', 'se', 'pl', 'bd'], general: Object.keys(SUBJECTS), interview: ['db', 'net', 'os', 'ds', 'pl'], data: ['db', 'bd', 'pl', 'ds'] };
export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
export const daysLeft = date => Math.round((Date.parse(`${date}T00:00:00+09:00`) - Date.parse(`${today()}T00:00:00+09:00`)) / 86400000);
export const coachKey = user => `study-coach:v1:${user?.id ? `account:${user.id}` : 'guest'}`;
export function readPlan(user) {
  try {
    const p = JSON.parse(localStorage.getItem(coachKey(user)));
    return p?.version === 1 && Array.isArray(p.tasks) && p.tasks.length > 0 && p.tasks.every(t => SUBJECTS[t.subject] && Array.isArray(t.ids) && Array.isArray(t.answers)) ? p : null;
  } catch { return null; }
}
export function storePlan(user, plan) {
  try { localStorage.setItem(coachKey(user), JSON.stringify(plan)); return true; } catch { return false; }
}
export function subjectStats(questions, stats) {
  const out = Object.fromEntries(Object.keys(SUBJECTS).map(id => [id, { c: 0, w: 0 }]));
  for (const q of questions) {
    if (!out[q.sec]) continue;
    const s = stats[q.id];
    out[q.sec].c += Math.max(0, Number(s?.c) || 0);
    out[q.sec].w += Math.max(0, Number(s?.w) || 0);
  }
  return out;
}
export function makePlan(form, questions, stats = {}, recommendation = null) {
  if (!SCOPES[form.exam] || !Number.isInteger(form.minutes) || form.minutes < 15 || form.minutes > 180 || !Number.isFinite(daysLeft(form.date)) || daysLeft(form.date) < 0 || daysLeft(form.date) > 730) throw new Error('시험 날짜와 공부 시간을 확인해 주세요.');
  const scope = SCOPES[form.exam];
  const analysis = subjectStats(questions, stats);
  const ranked = scope.map((id, i) => {
    const { c, w } = analysis[id];
    const weak = (form.weak || []).includes(id);
    const aiIndex = recommendation?.subjects?.indexOf(id) ?? -1;
    return { id, score: (weak ? 100 : 0) + (c + w >= 3 ? 50 * w / (c + w) : 10) + (aiIndex >= 0 ? (scope.length - aiIndex) : 0) - i / 100,
      reason: weak ? '직접 선택한 약한 과목입니다.' : c + w >= 3 ? `주제별 문제집 풀이 ${c + w}회 중 정답 ${c}회 · 정답률 ${Math.round(c / (c + w) * 100)}%` : '풀이 기록이 부족해 기초 수준을 확인합니다.' };
  }).filter(s => questions.some(q => q.sec === s.id)).sort((a, b) => b.score - a.score);
  const selected = ranked.slice(0, Math.min(3, Math.max(1, Math.floor(form.minutes / 25))));
  if (!selected.length) throw new Error('학습할 문제를 찾지 못했습니다.');
  const tasks = selected.map((s, i) => {
    const minutes = Math.floor(form.minutes / selected.length) + (i < form.minutes % selected.length ? 1 : 0);
    const priority = q => !stats[q.id] ? 1 : stats[q.id].last === 'w' ? 0 : 2;
    const pool = questions.filter(q => q.sec === s.id && Array.isArray(q.o) && Number.isInteger(q.a)).sort((a, b) => priority(a) - priority(b) || (stats[a.id]?.at || 0) - (stats[b.id]?.at || 0));
    const count = Math.min(pool.length, 10, Math.max(2, Math.floor((minutes - 5) / 3)));
    return { subject: s.id, reason: s.reason, minutes, ids: pool.slice(0, count).map(q => q.id), answers: [], reviewed: false };
  });
  return { version: 1, day: today(), createdAt: Date.now(), form, source: recommendation ? 'ai' : 'basic', summary: recommendation?.summary || '선택한 시험 범위와 풀이 기록을 바탕으로 구성한 기본 계획입니다.', tasks };
}
export const taskDone = task => task.answers.length === task.ids.length && task.reviewed;
