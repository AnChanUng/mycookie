import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) };
globalThis.sessionStorage = localStorage;
globalThis.window = new EventTarget();
window.location = { origin: 'http://localhost', hostname: 'localhost', pathname: '/account' };
globalThis.document = new EventTarget();
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true } });
let view;
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Page } = await server.ssrLoadModule('/src/pages/AccountPage.jsx');
  let changed;
  api.defaults.adapter = async config => {
    let data = {};
    if (config.url === '/membership') data = { tier: 'BRONZE', tierName: '동 쿠키', division: 5, nickname: '테스트', solvedCount: 0 };
    if (config.url === '/profile/badges') data = [];
    if (config.url === '/auth/password') data = { hasPassword: true };
    if (config.url === '/auth/change-password') {
      changed = JSON.parse(config.data);
      data = { id: 1, nickname: '테스트', token: 'renewed-token' };
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  const mount = async () => act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, null, React.createElement(Page))); });
  const button = label => view.root.findAllByType('button').find(n => text(n) === label);
  const field = label => view.root.findByProps({ 'aria-label': label });
  const fill = async (label, value) => act(() => field(label).props.onChange({ target: { value } }));
  await mount();
  await act(() => button('새 계정 만들기').props.onClick());
  assert.equal(field('가입 비밀번호 확인').props.type, 'password');
  await fill('가입 닉네임', '새회원');
  await fill('가입 비밀번호', 'short');
  await fill('가입 비밀번호 확인', 'short');
  assert.equal(button('가입하기').props.disabled, true);
  await fill('가입 비밀번호', 'long-enough');
  assert.equal(button('가입하기').props.disabled, true);
  await fill('가입 비밀번호 확인', 'long-enough');
  assert.equal(button('가입하기').props.disabled, false);
  await act(() => view.unmount());
  localStorage.setItem('sync:account', JSON.stringify({ id: 1, nickname: '테스트', token: 'team-token' }));
  await mount();
  await fill('현재 비밀번호', 'existing');
  await fill('새 비밀번호', 'next-password');
  assert.equal(button('비밀번호 변경').props.disabled, true);
  await fill('새 비밀번호 확인', 'different');
  assert.equal(button('비밀번호 변경').props.disabled, true);
  await fill('새 비밀번호 확인', 'next-password');
  assert.equal(button('비밀번호 변경').props.disabled, false);
  await act(async () => field('새 비밀번호 확인').parent.props.onSubmit({ preventDefault() {} }));
  assert.deepEqual(changed, { currentPassword: 'existing', newPassword: 'next-password' });
  assert.equal(field('새 비밀번호 확인').props.value, '');
  console.log('Account forms passed: signup limits, confirmation gating, password-change payload and field clearing.');
} finally {
  if (view) await act(() => view.unmount());
  await server.close();
}
