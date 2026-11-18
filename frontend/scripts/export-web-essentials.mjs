// 구독 메일(웹 필수지식 학습 편지)에 쓸 문답을 백엔드로 넘긴다. webEssentials.js를 고친 뒤 다시 실행한다.
//   node --import ./scripts/extensionless-loader.mjs scripts/export-web-essentials.mjs [--check]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { WEB_ESSENTIALS } from '../src/data/webEssentials.js';

const rows = WEB_ESSENTIALS.items.map(({ id, topic, title, question, answer, references }) => ({
  id, topic, title, question, answer, references: references.filter(Boolean).map(({ title: t, url }) => ({ title: t, url })),
}));
if (new Set(rows.map(r => r.id)).size !== rows.length) throw new Error('문답 번호가 겹칩니다.');

const dir = new URL('../../backend/src/main/resources/newsletter/', import.meta.url);
const path = new URL('web-essentials.json', dir);
const output = JSON.stringify(rows, null, 1) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output) throw new Error('newsletter/web-essentials.json을 다시 만들어 주세요.');
  console.log(`web-essentials.json 최신 (${rows.length}문답)`);
} else {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, output);
  console.log(`web-essentials.json에 ${rows.length}문답을 썼습니다.`);
}
