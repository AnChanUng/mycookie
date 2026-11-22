import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

// 상단 [구독] 버튼: 메일 서버가 준비됐을 때만 보이고, 이메일 + 동의 → 확인 메일 안내까지 이어진다
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };
globalThis.window = globalThis.window || Object.assign(new EventTarget(), { location: { href: 'http://localhost/', origin: 'http://localhost' } });
const listeners = {};
globalThis.document = globalThis.document || { addEventListener: (t, f) => { listeners[t] = f; }, removeEventListener: t => { delete listeners[t]; } };
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
const flush = () => act(async () => {});
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  let enabled = true, posted = null, fail = false;
  api.defaults.adapter = async config => {
    if (config.method === 'post') {
      if (fail) throw Object.assign(new Error('bad'), { response: { status: 400, data: { error: '이메일 형식이 올바르지 않아요.' } } });
      posted = JSON.parse(config.data);
      return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config };
    }
    return { data: { enabled }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const { default: HeaderSubscribe } = await server.ssrLoadModule('/src/components/HeaderSubscribe.jsx');

  let view;
  await act(async () => { view = TestRenderer.create(React.createElement(HeaderSubscribe)); });
  await flush();
  const trigger = () => view.root.findAll(n => n.type === 'button' && text(n) === '구독')[0];
  assert.ok(trigger(), '메일 서버가 준비되면 구독 버튼이 보인다');
  assert.equal(view.root.findAll(n => n.props?.id === 'hs-panel').length, 0, '처음에는 창이 닫혀 있다');

  await act(() => trigger().props.onClick());
  const input = view.root.findByProps({ 'aria-label': '구독할 이메일' });
  const submit = () => view.root.findAll(n => n.type === 'button' && n.props.type === 'submit')[0];
  await act(() => input.props.onChange({ target: { value: ' me@example.com ' } }));
  assert.equal(submit().props.disabled, true, '동의하기 전에는 보낼 수 없다');
  const agree = view.root.findAll(n => n.type === 'input' && n.props.type === 'checkbox')[0];
  await act(() => agree.props.onChange({ target: { checked: true } }));
  assert.equal(submit().props.disabled, false);

  // 실패하면 서버 문구를 보여 준다
  fail = true;
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.ok(text(view.toJSON()).includes('이메일 형식이 올바르지 않아요.'));

  // 성공하면 앞뒤 공백을 뺀 주소로 신청하고, 메일함 확인 안내를 보여 준다
  fail = false;
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.deepEqual(posted, { email: 'me@example.com' });
  const shown = text(view.toJSON());
  assert.ok(shown.includes('메일함을 확인해 주세요') && shown.includes('me@example.com') && shown.includes('48시간'));
  await act(() => view.root.findAll(n => n.type === 'button' && text(n) === '닫기')[0].props.onClick());
  assert.equal(view.root.findAll(n => n.props?.id === 'hs-panel').length, 0, '닫기를 누르면 창이 닫힌다');
  await act(() => view.unmount());

  assert.deepEqual(errors, []);
  console.log('Header subscribe passed: hidden until enabled check, email + consent gate, server error message, trimmed email, check-your-inbox notice, close.');
} finally {
  console.error = originalError;
  await server.close();
}
