import assert from 'node:assert/strict';
import { createServer } from 'vite';

// 한 기기에서 계정을 바꿀 때 앞 계정 풀이 기록이 새 계정에 섞이지 않는지 본다(sync.js claimDeviceRecords)
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

  // 한 번도 로그인하지 않고 푼 기록(주인 없음)은 첫 계정이 이어 받는다
  values.set('exam-progress:kdb', solvedTwo);
  claim({ id: 1, nickname: '첫계정' });
  assert.equal(deviceRecords().solved, 2, 'guest records are adopted');
  assert.equal(values.get('sync:records-owner'), 'user:1');

  // 같은 계정으로 다시 로그인하면 기록이 남는다
  claim({ id: 1, nickname: '첫계정' });
  assert.equal(deviceRecords().solved, 2, 'same account keeps records');

  // 다른 계정이면 이 기기 기록(예전 계정별 키 포함)을 지우고, 기록이 아닌 값은 남긴다
  values.set('exam-progress:kdb:1', solvedTwo);
  values.set('theme', 'dark');
  claim({ id: 2, nickname: '둘째' });
  assert.deepEqual(deviceRecords(), { keys: [], solved: 0 }, 'other account clears records');
  assert.equal(values.get('theme'), 'dark');
  assert.equal(values.get('sync:records-owner'), 'user:2');

  // 예전에 닉네임으로 적어 둔 주인은 닉네임이 같으면 같은 계정이다
  values.set('sync:records-owner', 'nickname:셋째');
  values.set('exam-progress:kdb', solvedTwo);
  claim({ id: 3, nickname: '셋째' });
  assert.equal(deviceRecords().solved, 2, 'legacy nickname owner keeps records');
  assert.equal(values.get('sync:records-owner'), 'user:3');
  console.log('PASS: guest records adopted, same account keeps, other account clears (incl. legacy keys), legacy nickname owner kept.');
} finally {
  await server.close();
}
