// 노트 기반 문제(웹노트 · 전공노트) 검사. 모든 노트에 객관식이 있는지, 가리키는 노트가 실제로 있는지,
// 정답 번호와 정답 보기 길이가 한쪽으로 쏠리지 않았는지 확인한다.
//   npm run check:note-quiz
import { WEB_ESSENTIALS } from '../src/data/webEssentials.js';
import { WEB_NOTE_QUESTIONS } from '../src/data/webNoteQuestions.js';
import { CS_NOTES } from '../src/data/csNotes.js';
import { CS_NOTE_QUESTIONS } from '../src/data/csNoteQuestions.js';

const problems = [];
// 화면의 단답형 채점(ExamCompanyPage normAns)과 같은 정규화
const norm = (s) => s.replace(/[\s()[\]{}.,·'"`_-]/g, '').toLowerCase();
const banks = [
  { name: '웹노트', notes: WEB_ESSENTIALS.items, questions: WEB_NOTE_QUESTIONS },
  { name: '전공노트', notes: CS_NOTES.flatMap(s => s.items), questions: CS_NOTE_QUESTIONS },
];

for (const { name, notes, questions } of banks) {
  const ids = new Set(notes.map(n => n.id));
  for (const q of questions) {
    if (!ids.has(q.note)) problems.push(`${name} · ${q.id}: 없는 노트(${q.note})를 가리킵니다.`);
    if (q.kind === 'short' && !q.strict) problems.push(`${name} · ${q.id}: 노트 단답형은 자동 채점(strict)이어야 합니다.`);
    if (q.kind === 'short' && !q.acc.some(a => norm(q.ans).includes(norm(a))))
      problems.push(`${name} · ${q.id}: 모범답안(ans)에 허용 답안이 하나도 들어 있지 않습니다.`);
    if (!q.link) problems.push(`${name} · ${q.id}: 노트로 돌아가는 링크가 없습니다.`);
    if (q.topic.length > 26) problems.push(`${name} · ${q.id}: 주제 칩이 너무 깁니다(${q.topic}). csNoteTopics.js에 짧은 주제를 넣어 주세요.`);
  }
  const withMc = new Set(questions.filter(q => !q.kind).map(q => q.note));
  for (const n of notes) if (!withMc.has(n.id)) problems.push(`${name}: 노트 ${n.id}(${n.title})에 객관식이 없습니다.`);

  const mcs = questions.filter(q => !q.kind);
  const pos = [0, 0, 0, 0];
  for (const q of mcs) pos[q.a] = (pos[q.a] || 0) + 1;
  const most = Math.max(...pos) / mcs.length;
  if (most > 0.4) problems.push(`${name}: 정답 번호가 한쪽으로 쏠렸습니다(${pos.join(' / ')}).`);
  // 정답 보기가 다른 보기들보다 10% 넘게 길면 길이만 보고 맞힐 수 있다
  const standsOut = q => q.o[q.a].length > 1.1 * Math.max(...q.o.filter((_, i) => i !== q.a).map(o => o.length));
  const longest = mcs.filter(standsOut).length / mcs.length;
  if (longest > 0.25) problems.push(`${name}: 정답 보기만 눈에 띄게 긴 문제가 ${Math.round(longest * 100)}%입니다. 보기 길이를 맞춰 주세요.`);
  console.log(`${name}: 노트 ${notes.length}개 · 객관식 ${mcs.length} · 단답형 ${questions.length - mcs.length} · 정답 번호 ${pos.join('/')} · 정답만 눈에 띄게 긴 문제 ${Math.round(longest * 100)}%`);
}

if (problems.length) {
  console.error(`노트 문제 검사 실패 — ${problems.length}건`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('노트 문제 검사 통과');
