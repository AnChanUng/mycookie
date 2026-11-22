import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// 캘린더는 온보딩이 아니라 개발 일지 오른쪽에 둔다. 온보딩에는 캘린더가 없고, 개발 일지에는 고정 캘린더가 있다
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
globalThis.window = new EventTarget();
localStorage.setItem('sync:account', JSON.stringify({ token: 'team-token', nickname: '팀원' }));
const originalNow = Date.now;
Date.now = () => Date.parse('2026-11-20T01:00:00Z');
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join('');
let view;
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Onboarding } = await server.ssrLoadModule('/src/pages/OnboardingPage.jsx');
  const { default: DevLog } = await server.ssrLoadModule('/src/pages/DevLogPage.jsx');
  let offline = false;
  api.defaults.adapter = async config => {
    let data = {};
    if (config.url === '/auth/me') data = { roles: ['TEAM'] };
    if (config.url === '/devlog') {
      assert.equal(config.headers.Authorization, 'Bearer team-token');
      if (offline) throw new Error('offline');
      data = { canEdit: true, entries: [{ date: '2026-11-23', title: '저장된 팀 업무', owner: '보민', version: 1, items: [{ id: 'a', text: '할 일', note: '', done: false, sub: [] }] }] };
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const mount = async Component => {
    await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, null, React.createElement(Component))); });
    await act(async () => {});
  };
  const calendar = () => view.root.findAll(n => n.type === 'aside' && n.props.className === 'dl-cal');
  const goNext = () => act(() => view.root.findByProps({ 'aria-label': '다음 달' }).props.onClick());
  const dayCells = () => view.root.findAll(n => ['button', 'span'].includes(n.type) && String(n.props.className || '').startsWith('dl-cal-day'));

  // 온보딩: 캘린더(팀 일정)는 없고 나머지 안내는 그대로다
  await mount(Onboarding);
  assert.ok(!text(view.toJSON()).includes('팀 일정'), '온보딩에는 팀 일정 캘린더가 없다');
  assert.equal(view.root.findAllByProps({ className: 'team-calendar-grid' }).length, 0);
  assert.ok(view.root.findAllByType('a').some(a => a.props.href === 'https://dbeaver.io/download/'), '설치할 도구 안내는 그대로');
  await act(() => view.unmount());

  // 개발 일지: 오른쪽에 캘린더가 하나 있고, 일지가 있는 날을 누르면 열린다
  await mount(DevLog);
  assert.equal(calendar().length, 1);
  assert.ok(text(calendar()[0]).includes('2026년 11월'));
  assert.ok(text(calendar()[0]).includes('11월 말~12월 초'), '전체 공개 목표 안내가 캘린더 아래에 있다');
  const saved = view.root.findAll(n => n.type === 'button' && n.props['aria-label'] === '2026년 11월 23일 (월) 일지 보기');
  assert.equal(saved.length, 1, '일지가 있는 날은 누를 수 있다');
  await act(async () => saved[0].props.onClick());
  assert.ok(text(view.toJSON()).includes('저장된 팀 업무'));

  // 연도 경계와 윤년
  await goNext();
  assert.ok(text(calendar()[0]).includes('2026년 12월'));
  assert.equal(dayCells().length, 31, '12월은 31일');
  await goNext();
  assert.ok(text(calendar()[0]).includes('2027년 1월'));
  for (let i = 0; i < 13; i++) await goNext();
  assert.ok(text(calendar()[0]).includes('2028년 2월'));
  assert.equal(dayCells().length, 29, '2028년 2월은 29일');
  await act(() => view.unmount());

  // 서버에 닿지 않아도 캘린더는 기본 일정으로 그려진다
  offline = true;
  await mount(DevLog);
  assert.equal(calendar().length, 1);
  console.log('Dev log calendar passed: onboarding has no calendar, fixed calendar on the dev log, saved days open, year boundary, leap day and offline.');
} finally {
  if (view) await act(() => view.unmount());
  await server.close();
  Date.now = originalNow;
}
