// 그램 서버 nginx의 보안 헤더를 vercel.json에서 만든다(두 곳이 어긋나지 않게). vercel.json을 고친 뒤 다시 실행한다.
//   node scripts/export-nginx-headers.mjs [--check]
// 온프레미스는 API가 화면과 같은 주소라 Render 백엔드 주소는 빼고 나머지(토스 결제 등)는 그대로 둔다
import { readFileSync, writeFileSync } from 'node:fs';

const vercel = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const global = vercel.headers.find(h => h.source === '/(.*)' && !h.missing && !h.has).headers;
const csp = global.find(h => h.key === 'Content-Security-Policy').value
  .split(';').map(part => part.trim().split(/\s+/).filter(token => !/onrender\.com/.test(token)).join(' ')).join('; ');
const keep = ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security'];
const lines = [
  '# 모든 응답에 붙이는 보안 헤더. scripts/export-nginx-headers.mjs가 vercel.json에서 만든다(직접 고치지 않는다)',
  `add_header Content-Security-Policy "${csp}" always;`,
  ...keep.map(key => {
    const h = global.find(x => x.key === key);
    if (!h) throw new Error(`vercel.json에 ${key}가 없습니다`);
    return `add_header ${key} "${h.value}" always;`;
  }),
  'add_header X-Robots-Tag "${ROBOTS_HEADER}" always;',
];
const path = new URL('../nginx/security-headers.conf.template', import.meta.url);
const output = lines.join('\n') + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(path, 'utf8') !== output) throw new Error('nginx 보안 헤더를 다시 만들어 주세요: node scripts/export-nginx-headers.mjs');
  console.log('nginx 보안 헤더 최신');
} else {
  writeFileSync(path, output);
  console.log('nginx/security-headers.conf.template을 만들었습니다.');
}
