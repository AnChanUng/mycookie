import assert from 'node:assert/strict';
import { createServer } from 'vite';

// 풍부한 해설: 해설 묶음의 id가 그 문제집에 실제로 있고, wrong이 있으면 오답 보기 전부를 다루며,
// 더 알아 둘 점이 하나 이상 있는지 본다. 화면 문구 규칙대로 가운데점이 없는지도 확인한다.
// 해설은 문제 문장으로 찾으므로, 같은 문장이 다른 문제집의 다른 문항에 붙지 않는지도 확인한다
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { DETAIL_SOURCES, detailFor } = await server.ssrLoadModule('/src/data/questionDetails.js');
  const { BANKS, allQuestions } = await server.ssrLoadModule('/src/data/examQuestions.js');
  const counts = {};
  for (const [key, questions, details] of DETAIL_SOURCES) {
    const ids = new Set(questions.map(q => q.id));
    for (const [id, d] of Object.entries(details)) {
      assert.ok(ids.has(id), `${key}/${id}: 맞는 문항이 없음`);
      const q = questions.find(x => x.id === id);
      if (d.wrong) assert.deepEqual(Object.keys(d.wrong).map(Number).sort(), q.o.map((_, i) => i).filter(i => i !== q.a), `${key}/${id} 오답 보기마다 이유`);
      assert.ok(d.tips?.length >= 1, `${key}/${id} 더 알아 둘 점`);
      assert.ok(![...Object.values(d.wrong || {}), ...d.tips].join(' ').includes('·'), `${key}/${id} 가운데점 금지`);
      assert.equal(detailFor(q), d, `${key}/${id} 문장으로 찾기`);
    }
    counts[key] = Object.keys(details).length;
  }
  // 다른 문제집 문항에 엉뚱한 해설이 붙지 않는지: 해설이 붙은 문항은 원래 문항과 문장, 코드, 정답까지 같아야 한다
  for (const bank of BANKS) for (const q of allQuestions(bank)) {
    const d = detailFor(q);
    if (!d) continue;
    const owner = DETAIL_SOURCES.flatMap(([, qs]) => qs).find(x => x.q === q.q && x.a === q.a && (x.code || '') === (q.code || ''));
    assert.ok(owner, `${bank.key}/${q.id}: 해설이 붙었지만 같은 문항이 아님`);
  }
  console.log('Question details passed:', counts);
} finally {
  await server.close();
}
