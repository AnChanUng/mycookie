// architecture.svg를 PNG로 만든다(README용, 2배 해상도).
//   node docs/architecture/render.mjs <Pretendard woff2 폴더>
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)('playwright');
const fontDir = process.argv[2];
const svg = readFileSync(join(here, 'architecture.svg'), 'utf8');
const face = fontDir
  ? [500, 600, 700].map(w => {
    const name = { 500: 'Medium', 600: 'SemiBold', 700: 'Bold' }[w];
    return `@font-face{font-family:Pretendard;font-weight:${w};src:url(${pathToFileURL(join(fontDir, `Pretendard-${name}.woff2`))})}`;
  }).join('')
  : '';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1680, height: 1185 }, deviceScaleFactor: 2 });
await page.setContent(`<style>${face}html,body{margin:0}</style>${svg}`);
await page.evaluate(() => document.fonts.ready);
await page.locator('svg').first().screenshot({ path: join(here, 'architecture.png') });
await browser.close();
console.log(join(here, 'architecture.png'));
