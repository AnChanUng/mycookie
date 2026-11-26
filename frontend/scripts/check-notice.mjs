import assert from 'node:assert/strict';
import { createServer } from 'vite';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const { daysLeft, loadExams, saveExams, examFor } = await server.ssrLoadModule('/src/schedule.js');
  assert.deepEqual(loadExams(), [], 'new visitors start without schedules');
  values.set('study:exams', JSON.stringify([{name:'기업은행',date:'2099-10-17',to:'/exam/ibk'},{name:'코스콤',date:'2099-10-24'}]));
  assert.deepEqual(loadExams(), [], 'existing browser schedules are cleared');
  assert.equal(values.has('study:exams'), false);
  assert.equal(examFor('/exam/ibk'), null, 'removed schedules do not create a study goal');
  const added = [{name:'새 시험',date:'2099-12-01',to:'/exam/ibk'}];
  saveExams(added);
  assert.deepEqual(loadExams(), added, 'newly added schedules survive reload');
  assert.equal(examFor('/exam/ibk').name, '새 시험');
  values.set('study:exams:v2', 'broken-json');
  assert.deepEqual(loadExams(), [], 'corrupt storage never restores old defaults');
  assert.equal(daysLeft('2026-10-17', new Date('2026-10-14T15:00:00Z')), 2);
  assert.equal(daysLeft('2026-10-17', new Date('2026-10-16T15:00:00Z')), 0);
  assert.equal(daysLeft('2026-10-17', new Date('2026-10-17T15:00:00Z')), -1);
  assert.equal(daysLeft('2026-02-30'), null);
  assert.equal(daysLeft(''), null);
  console.log('PASS: schedule reset, new schedule persistence and date regressions.');
} finally {
  await server.close();
}
