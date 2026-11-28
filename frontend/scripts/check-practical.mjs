import assert from 'node:assert/strict';
import { createServer } from 'vite';

// 실무형 문제: 문항마다 상황과 코드가 있고, 정답이 길이나 위치로 짐작되지 않는지 확인한다.
// 화면 문구 규칙에 따라 가운데점(·)을 쓰지 않는다
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { PRACTICAL_QUESTIONS: qs, PRACTICAL_SECTIONS: sections } = await server.ssrLoadModule('/src/data/practicalQuestions.js');
  const ids = new Set();
  for (const q of qs) {
    assert.ok(!ids.has(q.id), `중복 id ${q.id}`); ids.add(q.id);
    assert.ok(sections[q.sec], `${q.id} 섹션`);
    assert.ok(q.ctx && q.code, `${q.id} 상황과 코드`);
    assert.equal(q.o.length, 4, `${q.id} 보기는 4개`);
    assert.equal(new Set(q.o).size, 4, `${q.id} 보기가 서로 달라야 한다`);
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < 4, `${q.id} 정답 번호`);
    assert.ok(q.q && q.e && q.e.length >= 30, `${q.id} 문제와 해설`);
    const text = [q.ctx, q.q, q.e, q.topic, ...q.o].join(' ');
    assert.ok(!text.includes('·'), `${q.id} 가운데점 금지`);
  }
  for (const [key, s] of Object.entries(sections)) {
    assert.equal(s.count, qs.filter(q => q.sec === key).length, `${key} 문항 수`);
    assert.ok(!`${s.name}${s.sub}${s.short}`.includes('·'), `${key} 섹션 이름 가운데점 금지`);
  }

  // 풍부한 해설: 오답 보기마다 이유, 고친 코드 또는 팁. 정답 번호에는 오답 해설을 달지 않는다
  const { PRACTICAL_DETAILS: details } = await server.ssrLoadModule('/src/data/practicalDetails.js');
  for (const q of qs) {
    const d = details[q.id];
    assert.ok(d, `${q.id} 풍부한 해설`);
    const wrong = Object.keys(d.wrong || {}).map(Number).sort();
    assert.deepEqual(wrong, [0, 1, 2, 3].filter(i => i !== q.a), `${q.id} 오답 보기마다 이유`);
    assert.ok(d.tips?.length >= 1, `${q.id} 실무 팁`);
    assert.ok(![...Object.values(d.wrong), ...d.tips].join(' ').includes('·'), `${q.id} 해설 가운데점 금지`);
  }

  let longest = 0;
  const ratios = [];
  for (const q of qs) {
    const lens = q.o.map(o => o.length);
    const others = lens.filter((_, i) => i !== q.a);
    if (lens[q.a] > Math.max(...others)) longest++;
    ratios.push(lens[q.a] / (others.reduce((s, x) => s + x, 0) / others.length));
  }
  const meanRatio = ratios.reduce((s, x) => s + x, 0) / ratios.length;
  assert.ok(longest / qs.length <= 0.4, `정답이 가장 긴 문항 ${longest}/${qs.length}`);
  assert.ok(meanRatio <= 1.15, `정답 길이 비율 ${meanRatio.toFixed(2)}`);
  const position = [0, 0, 0, 0];
  for (const q of qs) position[q.a]++;
  assert.ok(Math.max(...position) - Math.min(...position) <= Math.max(2, Math.ceil(qs.length * 0.1)), `정답 위치 ${position.join('/')}`);
  console.log(`Practical passed: ${qs.length} questions, longest-correct ${longest}, mean ratio ${meanRatio.toFixed(2)}, positions ${position.join('/')}.`);
} finally {
  await server.close();
}
