import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

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
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join('');
let view;
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Page } = await server.ssrLoadModule('/src/pages/OnboardingPage.jsx');
  let offline = false;
  api.defaults.adapter = async config => {
    let data = {};
    if (config.url === '/auth/me') data = { roles: ['TEAM'] };
    if (config.url === '/devlog') {
      assert.equal(config.headers.Authorization, 'Bearer team-token');
      if (offline) throw new Error('offline');
      data = { entries: [{ date: '2026-11-23', title: '저장된 팀 업무', owner: '보민', items: [], complete: true }] };
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const mount = async () => {
    await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, null, React.createElement(Page))); });
  };
  await mount();
  assert.ok(text(view.toJSON()).includes('팀 일정'), 'onboarding includes the team calendar');
  await act(() => view.root.findByProps({ 'aria-label': '2026-11-23 일정 보기' }).props.onClick());
  assert.ok(text(view.toJSON()).includes('저장된 팀 업무'));
  assert.equal(view.root.findAllByType('a').filter(a => a.props.href === 'https://github.com/AnChanUng/mycookie/issues/102').length, 0, 'cancelled channel task is absent');
  assert.ok(text(view.toJSON()).includes('11월 말~12월 초'));
  assert.ok(view.root.findAllByType('a').some(a => a.props.href === 'https://dbeaver.io/download/'));
  await act(() => view.root.findByProps({ 'aria-label': '다음 달' }).props.onClick());
  assert.equal(view.root.findAllByProps({ 'aria-label': '2026-12-31 일정 보기' }).length, 1);
  await act(() => view.root.findByProps({ 'aria-label': '다음 달' }).props.onClick());
  assert.equal(view.root.findAllByProps({ 'aria-label': '2027-01-01 일정 보기' }).length, 1);
  for (let i = 0; i < 13; i++) {
    await act(() => view.root.findByProps({ 'aria-label': '다음 달' }).props.onClick());
  }
  assert.equal(view.root.findAllByProps({ 'aria-label': '2028-02-29 일정 보기' }).length, 1);
  assert.equal(view.root.findAllByProps({ 'aria-label': '2028-02-30 일정 보기' }).length, 0);
  await act(() => view.unmount());
  offline = true;
  await mount();
  assert.ok(text(view.toJSON()).includes('저장된 개발 일지를 불러오지 못했습니다'));
  await act(() => view.root.findByProps({ 'aria-label': '2026-11-23 일정 보기' }).props.onClick());
  assert.equal(view.root.findAllByType('a').filter(a => a.props.href === 'https://github.com/AnChanUng/mycookie/issues/102').length, 0, 'cancelled channel task is absent');
  console.log('Onboarding calendar passed: saved entries, cancelled task removal, tentative launch, tool link, year boundary and offline feedback.');
} finally {
  if (view) await act(() => view.unmount());
  await server.close();
  Date.now = originalNow;
}
