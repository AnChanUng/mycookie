import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { BANKS, allQuestions, companyPath, EXAM_CATEGORIES } from '../src/data/examQuestions.js';
import { TOPICS } from '../src/data/topicBank.js';
import { theoryFor } from '../src/theory.js';
import { explanationFor } from '../src/data/explanationLookup.js';
import notes from '../src/data/questionExplanations.json' with { type: 'json' };
import privateNotes from '../src/data/privateExplanations.json' with { type: 'json' };

// 2026-11-18 문제집 정비로 실제 응시 후기 기반 문제집은 비공개(privateBanks.js, privateExplanations.json)로 옮겼다.
// 공개 문제집에 남은 이론 문항과, 공개 + 비공개 해설의 합계(예전 637개 그대로)를 확인한다
const old = BANKS.filter(b => b.key !== 'pearl').flatMap(allQuestions).filter(theoryFor);
assert.equal(old.length, 466);
// 상세 해설이 아직 없는 문항(짧은 해설 e만 있음). 2026-11-05 CU 문제집 확장 때 들어온 문항 등.
// 새로 생기는 공백은 실패시키고, 이 목록은 해설을 채우면서 줄여 간다(목표 0개)
const KNOWN_GAPS = {};  // 2026-11-20 CU 42, SSAFY DB 4문항 상세 해설을 채워 0개
const gaps = {};
for (const bank of BANKS.filter(b => b.key !== 'pearl'))
  for (const q of allQuestions(bank).filter(theoryFor))
    if (!(explanationFor(q)?.length > 70)) gaps[bank.key] = (gaps[bank.key] || 0) + 1;
for (const [bank, count] of Object.entries(gaps)) assert.ok(count <= (KNOWN_GAPS[bank] || 0), `상세 해설 없는 문항이 늘었음: ${bank} ${count}개(허용 ${KNOWN_GAPS[bank] || 0})`);
for (const q of old.filter(q => explanationFor(q)?.length > 70)) {
  assert.equal(explanationFor({...q,id:'copied',topic:q.topic+' · 출처'}), explanationFor(q));
  assert.equal(explanationFor({...q,q:q.q+' changed'}), undefined, 'Changed questions must not inherit an unrelated answer');
}
assert.equal(Object.keys(notes).length + Object.keys(privateNotes).length, 683, '공개와 비공개 해설 합계(예전 637개 + 2026-11-20에 채운 46개)');
for (const key of Object.keys(privateNotes)) assert.ok(!(key in notes), `해설이 공개, 비공개 양쪽에 있음: ${key.slice(0, 40)}`);
const pearl = BANKS.find(b=>b.key==='pearl');
assert.equal(companyPath(pearl),'/exam/pearl');
assert.ok(EXAM_CATEGORIES.some(c=>c.key===pearl.category && !c.hub));
assert.equal(pearl.questions.length,50);
assert.equal(pearl.questions.filter(q=>!q.kind).length,40);
assert.equal(pearl.questions.filter(q=>q.kind==='essay').length,10);
for(const sec of Object.keys(pearl.sections)) assert.equal(pearl.questions.filter(q=>q.sec===sec).length,10);
for(const q of pearl.questions) {
  if(!q.kind) { assert.equal(q.o.length,5); assert.ok(explanationFor(q)?.length>70); }
  else { assert.ok(q.ans.length>70); assert.ok(q.pts.length>=3); }
}
assert.equal(TOPICS.questions.filter(q=>q.id.startsWith('pearl:')).length,40);
// 주제별 통합 문제집은 원본 문항의 해설을 그대로 쓴다. 원본에 해설이 없는 문항(KNOWN_GAPS) 수만큼만 비어 있을 수 있다
const topicGaps = TOPICS.questions.filter(theoryFor).filter(q => !explanationFor(q)).length;
assert.ok(topicGaps <= Object.values(KNOWN_GAPS).reduce((a, b) => a + b, 0), `주제별 문제집에 해설 없는 문항이 늘었음: ${topicGaps}개`);
// SSR verifies the actual JSX and text escaping without browser permission or network access.
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
try {
  const {default:Detail}=await server.ssrLoadModule('/src/components/QuestionExplanation.jsx');
  const {default:React}=await import('react');
  const {renderToStaticMarkup}=await import('react-dom/server');
  for(const q of [...old.filter(q => explanationFor(q)?.length > 70),...pearl.questions.filter(q=>!q.kind)]) {
    const html=renderToStaticMarkup(React.createElement(Detail,{q}));
    assert.ok(html.includes('문항별 상세 해설'));
    assert.ok(!html.includes('href='));
  }
  const escaped=renderToStaticMarkup(React.createElement(Detail,{q:{explanation:'<script>alert(1)</script>'}}));
  assert.ok(!escaped.includes('<script>'));
} finally { await server.close(); }
console.log('해설 검사 통과: 공개 이론 466문항, 공개와 비공개 해설 683개, 상세 해설 공백 0개, 주제별 복사본, 펄어비스 50문항, 상세 해설 SSR');
