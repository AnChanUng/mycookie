import assert from 'node:assert/strict';
import { createServer } from 'vite';

// 풍부한 해설: 해설이 붙은 문항은 오답 보기마다 이유가 있고, 더 알아 둘 점이 하나 이상 있어야 한다.
// 문항 id가 문제집끼리 겹치지 않는지, 화면 문구 규칙대로 가운데점이 없는지도 본다
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
try {
  const { BANKS, allQuestions } = await server.ssrLoadModule('/src/data/examQuestions.js');
  const { QUESTION_DETAILS: details } = await server.ssrLoadModule('/src/data/questionDetails.js');
  const owner = new Map();
  for (const bank of BANKS) for (const q of allQuestions(bank)) {
    if (!details[q.id]) continue;
    assert.ok(!owner.has(q.id) || owner.get(q.id) === bank.key, `${q.id}가 ${owner.get(q.id)}와 ${bank.key}에 함께 있음`);
    owner.set(q.id, bank.key);
  }
  for (const [id, d] of Object.entries(details)) {
    assert.ok(owner.has(id), `${id}: 해설에 맞는 문항이 없음`);
    const bank = BANKS.find(b => b.key === owner.get(id));
    const q = allQuestions(bank).find(x => x.id === id);
    const wrong = Object.keys(d.wrong || {}).map(Number).sort();
    assert.deepEqual(wrong, q.o.map((_, i) => i).filter(i => i !== q.a), `${id} 오답 보기마다 이유`);
    assert.ok(d.tips?.length >= 1, `${id} 더 알아 둘 점`);
    assert.ok(![...Object.values(d.wrong), ...d.tips].join(' ').includes('·'), `${id} 가운데점 금지`);
  }
  const byBank = {};
  for (const key of owner.values()) byBank[key] = (byBank[key] || 0) + 1;
  console.log(`Question details passed: ${Object.keys(details).length} questions`, byBank);
} finally {
  await server.close();
}
