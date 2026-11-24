import assert from 'node:assert/strict';
import { recordDailyAnswer, dailyWrongRows, dailySummary } from '../src/dailyPracticeRecords.js';

// 학습 메일 연습 문제 풀이 기록: 틀리면 오답에 들어가고, 다시 맞히면 빠진다
const data = {};
const storage = { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v; } };
const q = { title: '제목', prompt: '질문', options: ['a', 'b', 'c', 'd'], answer: 2, explanation: ['해설'] };

recordDailyAnswer(3, 1, '주제', q, false, 100, storage);
recordDailyAnswer(3, 2, '주제', q, true, 200, storage);
recordDailyAnswer(4, 1, '다른 주제', q, false, 300, storage);
let rows = dailyWrongRows(storage);
assert.deepEqual(rows.map(r => r.id), ['4.1', '3.1'], '최근에 틀린 순서');
assert.equal(dailySummary(storage).seen, 3);
assert.equal(dailySummary(storage).open, 2);

recordDailyAnswer(3, 1, '주제', q, true, 400, storage);
rows = dailyWrongRows(storage);
assert.deepEqual(rows.map(r => r.id), ['4.1'], '다시 맞히면 오답에서 빠진다');
assert.equal(JSON.parse(data['daily-practice:v1'])['3.1'].w, 1, '틀린 횟수는 남는다');

data['daily-practice:v1'] = '깨진 값';
assert.deepEqual(dailyWrongRows(storage), [], '깨진 저장값은 빈 목록');
console.log('daily practice records ok');
