// 검색 로봇용 정적 HTML. 빌드 뒤(dist) 공개 화면마다 제목 · 설명 · 본문 글을 담은 HTML을 만든다.
// 사람이 열면 React가 #root를 그대로 다시 그리므로 화면은 같고, 로봇은 자바스크립트 없이도 본문을 읽는다.
//   node --import ./scripts/extensionless-loader.mjs scripts/prerender-seo.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT, PAGES, SITE_NAME, SITE_URL, seoFor } from '../src/seo.js';
import { WEB_ESSENTIALS } from '../src/data/webEssentials.js';
import { CS_NOTES } from '../src/data/csNotes.js';

const dist = new URL('../dist/', import.meta.url);
const template = readFileSync(new URL('index.html', dist), 'utf8');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
// 모범답안 마크다운을 문단 · 목록 · 코드로 옮긴다
function answerHtml(md) {
  return String(md || '').split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (block.startsWith('```')) return `<pre>${esc(lines.filter(l => !l.startsWith('```')).join('\n'))}</pre>`;
    if (lines.every(l => /^\s*([-*]|\d+\.)\s+/.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*([-*]|\d+\.)\s+/, ''))}</li>`).join('')}</ul>`;
    return `<p>${lines.map(inline).join('<br>')}</p>`;
  }).join('');
}
const qa = items => items.map(it => `<article><h3>${esc(it.question || it.title)}</h3>${answerHtml(it.answerMarkdown || it.answer)}</article>`).join('');
const nav = `<nav><ul>${PAGES.filter(([p]) => seoFor(p).index).map(([p, name]) => `<li><a href="${p}">${esc(name)}</a></li>`).join('')}</ul></nav>`;

const BODY = {
  '/': `<h1>컴퓨터공학 전공 공부, 웹개발, 백엔드 공부 사이트 나의쿠키</h1>
<p>나의쿠키는 컴공 전공 공부와 웹개발 공부, 백엔드 공부를 무료로 하는 개발자 학습 사이트입니다. 운영체제, 네트워크, 데이터베이스, 자료구조, 알고리즘 같은 CS 전공 지식을 기술면접 질문과 모범답안으로 정리하고, 기업별 전공필기와 코딩테스트까지 한곳에서 준비할 수 있습니다.</p>
<h2>무엇을 공부할 수 있나요</h2><ul>
<li><a href="/cs">오늘의 CS 5문제</a>: 매일 하나의 컴퓨터공학 개념과 객관식 5문제</li>
<li><a href="/notes">전공노트</a>: 운영체제, 네트워크, 데이터베이스, Java, Spring 면접 정리 ${CS_NOTES.reduce((n, s) => n + s.items.length, 0)}개</li>
<li><a href="/web-essentials">웹 필수지식 ${WEB_ESSENTIALS.items.length}문답</a>: HTTP, REST, 쿠키와 세션, JWT, 트랜잭션, 인덱스 등 웹개발과 백엔드 공부 핵심</li>
<li><a href="/exam">기업별 전공필기</a>와 <a href="/topics">주제별 통합 문제집</a></li>
<li><a href="/duel">실시간 CS 대결</a>과 <a href="/interview">면접 공통질문 연습</a></li></ul>`,
  '/web-essentials': `<h1>웹개발 · 백엔드 공부: 웹 필수지식 ${WEB_ESSENTIALS.items.length}문답</h1><p>${esc(WEB_ESSENTIALS.description)}</p>${qa(WEB_ESSENTIALS.items)}`,
  '/notes': `<h1>전공노트: 컴퓨터공학 · 백엔드 면접 정리</h1><p>컴퓨터공학 전공 공부와 백엔드 공부에 필요한 핵심 개념을 면접 답변 형태로 정리했습니다.</p>${CS_NOTES.map(s => `<section><h2>${esc(s.title)}</h2>${qa(s.items)}</section>`).join('')}`,
};

function page(path) {
  const { title, description, index } = seoFor(path);
  const url = SITE_URL + (path === '/' ? '/' : path);
  const body = BODY[path] || `<h1>${esc(title.replace(` | ${SITE_NAME}`, ''))}</h1><p>${esc(description)}</p>`;
  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta name="keywords" content=")[^"]*/, `$1${esc(DEFAULT.keywords)}`)
    .replace(/(<meta name="robots" content=")[^"]*/, `$1${index ? 'index, follow' : 'noindex, nofollow'}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${esc(title)}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${esc(description)}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace('<div id="root"></div>', `<div id="root"><main class="seo-static">${body}${nav}</main></div>`);
  return html;
}

const paths = ['/', ...PAGES.map(([p]) => p)];
for (const path of paths) {
  const file = path === '/' ? 'index.html' : `${path.slice(1)}.html`;
  writeFileSync(new URL(file, dist), page(path));
}
console.log(`검색용 HTML ${paths.length}개를 만들었습니다.`);
