// 포인트 상점: 대표 아이콘은 한 쪽에 3줄씩, 레어 · 전설 품목은 표시가 붙는다
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const memory = new Map([['sync:account', JSON.stringify({ token: 'test-token', nickname: '테스터', userId: 1 })]]);
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v), removeItem: k => memory.delete(k), key: () => null, length: 0 };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = Object.assign(new EventTarget(), { innerWidth: 1400, location: { origin: 'http://test.invalid', host: 'test.invalid', pathname: '/shop' } });
globalThis.document = Object.assign(new EventTarget(), { hidden: false, visibilityState: 'visible' });
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error' });
let view;
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Shop } = await server.ssrLoadModule('/src/pages/PointShopPage.jsx');
  const avatars = ['🍩', '🍓', '🧸', '🐹', '🌸', '🎀', '🦋', '🦄', '👑', '🌷', '🔮', '🐉'];
  // 아이콘이 많아져도 3줄(한 줄 7칸)을 넘으면 다음 쪽으로 간다: 23개면 2쪽
  const extra = Array.from({ length: 11 }, (_, i) => `avatar:x${i}`);
  const shop = [...avatars.map(a => ({ key: `avatar:${a}`, price: 300 })), ...extra.map(key => ({ key, price: 300 })),
    { key: 'theme:opal', price: 5000 }, { key: 'theme:nebula', price: 10000 }, { key: 'frame:galaxy', price: 10000 }];
  api.defaults.adapter = async config => {
    const data = config.url === '/points/attend' ? { earned: 0 } : { balance: 100, streak: 1, attendedToday: true, owned: [], history: [], shop, todaySolved: 0, quests: [], pendingSolved: 0, dailySolvedCap: 100 };
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, null, React.createElement(Shop))); });
  await act(async () => { await new Promise(r => setTimeout(r, 50)); });
  const pages = view.root.findAll(n => n.props.className === 'ps-page');
  assert.equal(pages.length, 2, '대표 아이콘 23개는 21칸(3줄) 한 쪽 + 다음 쪽');
  assert.equal(pages[0].findAll(n => n.type === 'li' && /ps-item/.test(n.props.className || '')).length, 21);
  const all = text(view.toJSON());
  assert.ok(all.includes('레어') && all.includes('전설'), '레어 · 전설 표시');
  assert.ok(all.includes('수정구슬 아이콘') && all.includes('황룡 아이콘') && all.includes('오팔 테마') && all.includes('성운 테마'));
  assert.ok(view.root.findAll(n => /ps-item legend/.test(n.props.className || '')).length >= 3, '전설 품목은 전설 카드');
  assert.ok(all.includes('20 · 50 · 100 · 150 · 300P'), '승급 포인트 안내');
  console.log('PASS: 대표 아이콘 3줄 쪽 넘김, 레어 · 전설 테마 · 아이콘 표시');
} finally {
  if (view) await act(async () => view.unmount());
  await server.close();
}
