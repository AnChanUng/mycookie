import assert from 'node:assert/strict';
import { createServer } from 'vite';

// 한 기기에서 계정을 바꿀 때 앞 계정 풀이 기록이 새 계정에 섞이지 않게 묻는지 본다(sync.js claimDeviceRecords)
const values = new Map();
globalThis.localStorage = {
  getItem: key => (values.has(key) ? values.get(key) : null),
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key),
  key: i => [...values.keys()][i] ?? null,
  get length() { return values.size; },
};
globalThis.window = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, location: { origin: 'http://localhost' } };
// sync.js만 불러오므로 의존성 미리 훑기는 끈다(검사가 끝나 서버를 닫을 때 훑기가 끊겨 실패로 끝나지 않게)
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { _claimDeviceRecordsForTest: claim, deviceRecords } = await server.ssrLoadModule('/src/sync.js');
  const solvedTwo = JSON.stringify({ stats: { 1: { c: 1 }, 2: { c: 0 } }, history: [], marks: {} });
  const asked = [];
  const ask = answer => message => { asked.push(message); return answer; };

  // 로그인 전에 푼 기록(주인 없음)은 묻지 않고 첫 계정이 이어 받는다
  values.set('exam-progress:kdb', solvedTwo);
  claim({ id: 1, nickname: '첫계정' }, ask(true));
  assert.equal(asked.length, 0, 'guest records are adopted without asking');
  assert.equal(values.get('sync:records-owner'), 'user:1');

  // 같은 계정으로 다시 로그인하면 묻지 않는다
  claim({ id: 1, nickname: '첫계정' }, ask(true));
  assert.equal(asked.length, 0);

  // 다른 계정 + 기록 있음 → 묻는다. 합치면 기록이 남고 주인이 바뀐다
  claim({ id: 2, nickname: '둘째' }, ask(true));
  assert.equal(asked.length, 1);
  assert.match(asked[0], /2문제/);
  assert.match(asked[0], /둘째/);
  assert.equal(deviceRecords().solved, 2, 'merge keeps device records');
  assert.equal(values.get('sync:records-owner'), 'user:2');

  // 다른 계정 + 합치지 않기 → 이 기기 기록(예전 계정별 키 포함)을 지운다
  values.set('exam-progress:kdb:2', solvedTwo);
  claim({ id: 3, nickname: '셋째' }, ask(false));
  assert.equal(asked.length, 2);
  assert.deepEqual(deviceRecords(), { keys: [], solved: 0 }, 'declining clears device records');
  assert.equal(values.get('sync:records-owner'), 'user:3');

  // 기록이 없으면 다른 계정이어도 묻지 않는다
  claim({ id: 4, nickname: '넷째' }, ask(false));
  assert.equal(asked.length, 2, 'no prompt without records');
  assert.equal(values.get('sync:records-owner'), 'user:4');

  // 물어볼 수 없는 환경(confirm 실패)은 예전처럼 합친다
  values.set('exam-progress:kdb', solvedTwo);
  claim({ id: 5, nickname: '다섯' }, () => { throw new Error('no dialog'); });
  assert.equal(deviceRecords().solved, 2);
  console.log('PASS: guest records adopted, same account silent, other account asked (merge keeps / decline clears incl. legacy keys), no prompt without records, fallback merges.');
} finally {
  await server.close();
}
