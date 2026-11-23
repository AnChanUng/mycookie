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
  let changed, loggedIn;
  api.defaults.adapter = async config => {
    let data = {};
    if (config.url === '/membership') data = { tier: 'BRONZE', tierName: '동 쿠키', division: 5, nickname: '테스트', solvedCount: 0 };
    if (config.url === '/profile/badges') data = [];
    if (config.url === '/auth/password') data = { hasPassword: true };
    if (config.url === '/auth/login') {
      loggedIn = JSON.parse(config.data);
      data = { id: 2, nickname: '이메일회원', token: 'login-token' };
    }
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
  // 새 가입은 간편 로그인으로만: 닉네임 · 비밀번호 가입 화면이 없다. 로그인은 닉네임 또는 이메일 + 비밀번호(짧은 기존 비밀번호도 보낼 수 있다)
  assert.equal(button('새 계정 만들기'), undefined);
  assert.equal(view.root.findAllByProps({ 'aria-label': '가입 비밀번호 확인' }).length, 0);
  assert.equal(button('로그인').props.disabled, true);
  await fill('로그인 닉네임 또는 이메일', 'me@example.com');
  await fill('로그인 비밀번호', '1234');
  assert.equal(button('로그인').props.disabled, false);
  await act(async () => field('로그인 비밀번호').parent.parent.props.onSubmit({ preventDefault() {} }));
  assert.deepEqual(loggedIn, { nickname: 'me@example.com', identifier: 'me@example.com', password: '1234' });
  await act(() => view.unmount());
  localStorage.removeItem('sync:account');
  localStorage.setItem('sync:account', JSON.stringify({ id: 1, nickname: '테스트', token: 'team-token' }));
  await mount();
  await fill('현재 비밀번호', 'existing');
  // 새 비밀번호는 8자 이상이어야 바꿀 수 있다
  await fill('새 비밀번호', 'short7!');
  await fill('새 비밀번호 확인', 'short7!');
  assert.equal(button('비밀번호 변경').props.disabled, true);
  await fill('새 비밀번호 확인', '');
  await fill('새 비밀번호', 'next-password');
  assert.equal(button('비밀번호 변경').props.disabled, true);
  await fill('새 비밀번호 확인', 'different');
  assert.equal(button('비밀번호 변경').props.disabled, true);
  await fill('새 비밀번호 확인', 'next-password');
  assert.equal(button('비밀번호 변경').props.disabled, false);
  await act(async () => field('새 비밀번호 확인').parent.props.onSubmit({ preventDefault() {} }));
  assert.deepEqual(changed, { currentPassword: 'existing', newPassword: 'next-password' });
  assert.equal(field('새 비밀번호 확인').props.value, '');
  console.log('Account forms passed: no password signup, nickname-or-email login payload, 8-character new passwords, confirmation gating, password-change payload and field clearing.');
} finally {
  if (view) await act(() => view.unmount());
  await server.close();
}
