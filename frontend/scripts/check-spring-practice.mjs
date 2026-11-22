import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Spring 핵심 실전: "답이 가장 긴 보기"만 골라도 맞히는 문제집이 되지 않게 한다.
// 정답이 다른 보기보다 눈에 띄게 길지 않고, 정답 위치가 한쪽으로 쏠리지 않는지 확인한다.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { SPRING_PRACTICE_QUESTIONS: qs, SPRING_PRACTICE_SECTIONS: sections } = await server.ssrLoadModule('/src/data/springPracticeQuestions.js');

  const ids = new Set();
  for (const q of qs) {
    assert.ok(!ids.has(q.id), `중복 id ${q.id}`); ids.add(q.id);
    assert.ok(sections[q.sec], `${q.id} 섹션`);
    assert.equal(q.o.length, 4, `${q.id} 보기는 4개`);
    assert.equal(new Set(q.o).size, 4, `${q.id} 보기가 서로 달라야 한다`);
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id} 정답 번호`);
    assert.ok(q.q && q.e && q.e.length >= 10, `${q.id} 문제와 해설`);
  }
  for (const [key, s] of Object.entries(sections)) assert.equal(s.count, qs.filter(q => q.sec === key).length, `${key} 문항 수`);

  // 정답이 가장 긴 보기인 문항 수, 정답 길이와 오답 평균 길이의 비율
  let longest = 0, longRatio = 0, shortest = 0;
  const ratios = [];
  for (const q of qs) {
    const lens = q.o.map(o => o.length);
    const others = lens.filter((_, i) => i !== q.a);
    const avg = others.reduce((s, x) => s + x, 0) / others.length;
    if (lens[q.a] > Math.max(...others)) longest++;
    if (lens[q.a] < Math.min(...others)) shortest++;
    ratios.push(lens[q.a] / avg);
    if (lens[q.a] / avg >= 1.5) longRatio++;
  }
  const meanRatio = ratios.reduce((s, x) => s + x, 0) / ratios.length;
  const share = longest / qs.length;
  assert.ok(share <= 0.4, `정답이 가장 긴 문항이 ${(share * 100).toFixed(0)}%로 너무 많다(40% 이하여야 한다)`);
  assert.ok(meanRatio <= 1.15, `정답 길이가 오답 평균의 ${meanRatio.toFixed(2)}배로 너무 길다(1.15배 이하여야 한다)`);
  assert.ok(longRatio <= Math.ceil(qs.length * 0.1), `정답이 오답 평균의 1.5배 이상인 문항이 ${longRatio}개로 너무 많다`);

  // 정답 번호가 고르게 나뉘는지
  const position = [0, 0, 0, 0];
  for (const q of qs) position[q.a]++;
  for (const count of position) assert.ok(count / qs.length >= 0.2 && count / qs.length <= 0.3, `정답 번호 분포가 고르지 않다: ${position.join('/')}`);

  console.log(`Spring practice passed: ${qs.length} questions, longest-correct ${longest}/${qs.length}, mean length ratio ${meanRatio.toFixed(2)}, shortest-correct ${shortest}, positions ${position.join('/')}.`);
} finally {
  await server.close();
}
