import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// 기술 블로그 읽기(/tech-blogs): 기술 블로그만 불러오기, 가장 새 글 셋, 날짜 묶음, 회사 · 검색, 나중에 읽기 · 읽은 글
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), clear: () => m.clear() }; };
globalThis.localStorage = memory(); globalThis.sessionStorage = memory();
globalThis.window = new EventTarget();
window.confirm = () => true;
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
const wait = ms => new Promise(r => setTimeout(r, ms));
let view;
// 실제 앱처럼 StrictMode로 그린다(상태 갱신 함수가 두 번 불려도 책갈피가 되돌아가지 않는지 함께 본다)
const mount = async (Component, url = '/tech-blogs') => { await act(async () => { view = TestRenderer.create(React.createElement(React.StrictMode, null, React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(Component)))); }); };
const unmount = async () => { await act(() => view.unmount()); view = null; };

try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Page } = await server.ssrLoadModule('/src/pages/TechBlogsPage.jsx');
  const fmt = await server.ssrLoadModule('/src/newsFormat.js');
  const shelf = await server.ssrLoadModule('/src/techBlogShelf.js');

  // 날짜 글자: 한국 시간 기준으로 오늘 · 어제 · n일 전 · n주 전, 한 달이 넘으면 날짜
  const NOW = Date.parse('2026-11-27T03:00:00Z'); // 한국 시간 11월 27일 낮 12시
  assert.equal(fmt.relativeNewsDate('2026-11-26T16:00:00Z', NOW), '오늘', '한국 시간 27일 새벽 1시는 오늘');
  assert.equal(fmt.relativeNewsDate('2026-11-26T14:00:00Z', NOW), '어제', '한국 시간 26일 밤 11시는 어제');
  assert.equal(fmt.relativeNewsDate('2026-11-23T00:00:00Z', NOW), '4일 전');
  assert.equal(fmt.relativeNewsDate('2026-11-10T00:00:00Z', NOW), '2주 전');
  assert.equal(fmt.relativeNewsDate('2026-10-02T00:00:00Z', NOW), '2026.10.02');
  assert.equal(fmt.relativeNewsDate('bad', NOW), '');
  assert.equal(fmt.newsDateGroup('2026-11-23T00:00:00Z', NOW), '최근 7일');
  assert.equal(fmt.newsDateGroup('2026-11-10T00:00:00Z', NOW), '최근 30일');
  assert.equal(fmt.newsDateGroup('2026-09-15T00:00:00Z', NOW), '2026년 9월');

  // 이 기기 책꽂이: 같은 주소는 하나만, http(s)가 아닌 주소는 담지 않는다
  const a1 = { id: 1, company: '토스', source: '토스 기술 블로그', title: '글', url: 'https://toss.tech/a', summary: null, publishedAt: '2026-11-26T00:00:00Z' };
  shelf.addToShelf('read', a1); shelf.addToShelf('read', a1);
  assert.equal(shelf.loadShelf('read').length, 1);
  shelf.addToShelf('saved', { ...a1, url: 'javascript:alert(1)' });
  assert.equal(shelf.loadShelf('saved').length, 0);
  localStorage.setItem(shelf.SHELF_KEYS.saved, '{망가진 값');
  assert.deepEqual(shelf.loadShelf('saved'), [], '망가진 저장 값은 빈 목록으로 읽는다');
  localStorage.clear();

  const COMPANIES = ['카카오', '토스', '배민'];
  const day = n => new Date(Date.now() - n * 86400000).toISOString();
  const make = (company, n, from = 1, age = 0) => Array.from({ length: n }, (_, i) => ({
    id: from + i, company, source: `${company} 기술 블로그`, title: `${company} 글 ${from + i}`, url: `https://blog.example/${company}/${from + i}`,
    summary: `${company}에서 ${from + i}번째로 쓴 꽤 긴 요약 문장입니다. 읽고 싶게 만듭니다.`, publishedAt: day(age + i),
  }));
  const calls = [];
  let fail = false;
  api.defaults.adapter = async config => {
    const p = config.params || {};
    calls.push(p);
    if (fail) throw Object.assign(new Error('offline'), { response: { status: 500 } });
    if (p.company && !COMPANIES.includes(p.company)) throw Object.assign(new Error('bad'), { response: { status: 400 } });
    const size = p.size || 20, page = p.page || 0;
    let pool = p.company ? make(p.company, 25) : [...make('카카오', 15), ...make('토스', 15, 100, 15)];
    if (p.q) pool = pool.filter(a => a.title.toLowerCase().includes(p.q.toLowerCase()));
    const slice = pool.slice(page * size, page * size + size);
    return { data: { items: slice, page, size, total: pool.length, hasMore: (page + 1) * size < pool.length, companies: COMPANIES }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const titleLinks = () => view.root.findAll(n => n.type === 'a' && /tb-(title|feature-title)/.test(String(n.props.className || '')));
  const button = label => view.root.findAll(n => n.type === 'button' && text(n).startsWith(label))[0];
  const all = () => text(view.toJSON());

  // 처음: 기술 블로그만 20개, 가장 새 글 셋은 크게, 나머지는 날짜 묶음으로
  await mount(Page);
  assert.deepEqual(calls[0], { kind: 'tech', page: 0, size: 20 });
  assert.equal(titleLinks().length, 20);
  assert.equal(view.root.findAll(n => n.type === 'li' && String(n.props.className || '').startsWith('tb-feature')).length, 3);
  assert.ok(all().includes('따끈한 새 글') && all().includes('최근 7일'), '날짜 묶음 제목');
  assert.equal(titleLinks()[0].props.target, '_blank');
  assert.equal(titleLinks()[0].props.rel, 'noopener noreferrer');
  for (const name of ['전체', ...COMPANIES]) assert.ok(button(name), `${name} 칩`);

  // 제목을 누르면 읽은 글로 기록되고, 책갈피를 누르면 나중에 읽기에 담긴다
  await act(async () => titleLinks()[4].props.onClick());
  assert.equal(shelf.loadShelf('read')[0].title, '카카오 글 5');
  const saveButtons = () => view.root.findAll(n => n.type === 'button' && String(n.props.className || '').startsWith('tb-save'));
  await act(async () => saveButtons()[0].props.onClick());
  assert.equal(shelf.loadShelf('saved').length, 1);
  assert.equal(saveButtons()[0].props['aria-pressed'], true);
  assert.ok(text(button('나중에 읽기')).includes('1'), '탭에 담은 수가 보인다');

  // 더 보기
  await act(async () => button('더 보기').props.onClick());
  assert.equal(titleLinks().length, 30);
  assert.deepEqual(calls.at(-1), { kind: 'tech', page: 1, size: 20 });

  // 회사 칩: 그 회사만 처음부터, 큰 카드 없이 목록으로
  await act(async () => button('토스').props.onClick());
  assert.deepEqual(calls.at(-1), { kind: 'tech', page: 0, size: 20, company: '토스' });
  assert.ok(titleLinks().every(a => text(a).startsWith('토스')));
  assert.ok(all().includes('결과 25개'));
  assert.equal(all().includes('따끈한 새 글'), false);

  // 검색: 잠깐 멈추면 q로 다시 불러온다
  const input = () => view.root.find(n => n.type === 'input');
  await act(async () => input().props.onChange({ target: { value: '글 10' } }));
  await act(async () => { await wait(450); });
  assert.deepEqual(calls.at(-1), { kind: 'tech', page: 0, size: 20, company: '토스', q: '글 10' });
  assert.ok(titleLinks().length >= 1 && titleLinks().every(a => text(a).includes('글 10')));
  await act(async () => button('모두 보기').props.onClick());
  assert.deepEqual(calls.at(-1), { kind: 'tech', page: 0, size: 20 });

  // 나중에 읽기 · 읽은 글 탭은 이 기기에 기억한 글을 보여 주고, 서버에 다시 묻지 않는다
  const before = calls.length;
  await act(async () => button('나중에 읽기').props.onClick());
  assert.equal(titleLinks().length, 1);
  await act(async () => button('읽은 글').props.onClick());
  assert.ok(all().includes('카카오 글 5'));
  await act(async () => button('읽은 표시 모두 지우기').props.onClick());
  assert.equal(shelf.loadShelf('read').length, 0);
  assert.ok(all().includes('아직 읽은 글이 없어요'));
  assert.equal(calls.length, before);
  await unmount();

  // 주소로 회사 · 탭을 바로 열고, 모르는 회사면 전체로 돌아온다
  await mount(Page, '/tech-blogs?company=배민');
  assert.deepEqual(calls.at(-1), { kind: 'tech', page: 0, size: 20, company: '배민' });
  await unmount();
  await mount(Page, '/tech-blogs?company=없는회사');
  assert.ok(titleLinks().length > 0, '모르는 회사는 전체 목록으로 돌아간다');
  await unmount();
  await mount(Page, '/tech-blogs?tab=saved');
  assert.equal(titleLinks().length, 1);
  await unmount();

  // 실패하면 안내와 다시 시도
  fail = true;
  await mount(Page);
  assert.ok(all().includes('불러오지 못했어요'));
  await unmount();

  assert.deepEqual(errors, []);
  console.log('Tech blogs passed: tech-only list, featured three, date groups, company and search filters, saved and read shelves on this device, URL state, error state. No live network.');
} finally {
  console.error = originalError;
  await server.close();
}
