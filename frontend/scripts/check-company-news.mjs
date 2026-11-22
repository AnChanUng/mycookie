import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
globalThis.localStorage = memory(); globalThis.sessionStorage = memory();
globalThis.window = new EventTarget();
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
let view;
const mount = async (Component, url = '/news') => { await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, { initialEntries: [url] }, React.createElement(Component))); }); };
const unmount = async () => { await act(() => view.unmount()); view = null; };

try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Page } = await server.ssrLoadModule('/src/pages/CompanyNewsPage.jsx');
  const { formatNewsDate } = await server.ssrLoadModule('/src/newsFormat.js');

  const COMPANIES = ['네이버', '카카오', '토스'];
  const make = (company, n, from = 1) => Array.from({ length: n }, (_, i) => ({
    id: from + i, company, source: `${company} 블로그`, title: `${company} 글 ${from + i}`, url: `https://news.example/${company}/${from + i}`,
    summary: '요약', publishedAt: '2026-11-20T15:30:00Z',
  }));
  const calls = [];
  let fail = false;
  api.defaults.adapter = async config => {
    const p = config.params || {};
    calls.push(p);
    if (fail) throw Object.assign(new Error('offline'), { response: { status: 500 } });
    if (p.company && !COMPANIES.includes(p.company)) throw Object.assign(new Error('bad'), { response: { status: 400 } });
    const size = p.size || 20, page = p.page || 0;
    const pool = p.company ? make(p.company, 25) : [...make('네이버', 15), ...make('카카오', 15, 100)];
    const slice = pool.slice(page * size, page * size + size);
    return { data: { items: slice, page, size, total: pool.length, hasMore: (page + 1) * size < pool.length, companies: COMPANIES }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const links = () => view.root.findAll(n => n.type === 'a' && String(n.props.className || '').includes('cn-title'));
  const chip = label => view.root.findAll(n => n.type === 'button' && text(n) === label)[0];

  assert.equal(formatNewsDate('2026-11-20T15:30:00Z'), '2026.11.21', '한국 시간(KST) 날짜로 보여 준다');
  assert.equal(formatNewsDate('bad'), '');

  // 처음에는 최신 20개와 회사별 버튼이 보이고, 원문은 새 탭에서 안전하게 연다
  await mount(Page);
  assert.equal(links().length, 20);
  assert.equal(links()[0].props.target, '_blank');
  assert.equal(links()[0].props.rel, 'noopener noreferrer');
  assert.deepEqual(calls[0], { page: 0, size: 20 });
  for (const name of ['전체', ...COMPANIES]) assert.ok(chip(name), `${name} 버튼`);

  // 더 보기: 다음 쪽이 이어 붙는다
  await act(async () => view.root.findAll(n => n.type === 'button' && text(n) === '더 보기')[0].props.onClick());
  assert.equal(links().length, 30);
  assert.deepEqual(calls.at(-1), { page: 1, size: 20 });
  assert.equal(view.root.findAll(n => n.type === 'button' && text(n) === '더 보기').length, 0, '더 없으면 버튼이 사라진다');

  // 회사별로 보기: 그 회사 글만 처음부터 다시 불러온다
  await act(async () => chip('네이버').props.onClick());
  assert.deepEqual(calls.at(-1), { page: 0, size: 20, company: '네이버' });
  assert.ok(links().every(a => text(a).startsWith('네이버')));
  assert.equal(chip('네이버').props['aria-pressed'], true);
  assert.ok(text(view.toJSON()).includes('네이버 소식만 보는 중'));
  await unmount();

  // 주소로 회사를 바로 지정할 수 있고, 모르는 회사면 전체로 돌아온다
  await mount(Page, '/news?company=토스');
  assert.deepEqual(calls.at(-1), { page: 0, size: 20, company: '토스' });
  await unmount();
  await mount(Page, '/news?company=없는회사');
  assert.ok(links().length > 0, '모르는 회사는 전체 목록으로 돌아간다');
  await unmount();

  // 실패하면 안내와 다시 시도가 보인다
  fail = true;
  await mount(Page);
  assert.ok(text(view.toJSON()).includes('불러오지 못했어요'));
  await unmount();

  assert.deepEqual(errors, []);
  console.log('Company news passed: 20 per page, load more, per-company filter and URL, unsafe company fallback, error state. No live network.');
} finally {
  console.error = originalError;
  await server.close();
}
