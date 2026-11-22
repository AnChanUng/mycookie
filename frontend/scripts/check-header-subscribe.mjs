import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

// 상단 [구독] 버튼: 이메일 → 메일로 받은 6자리 인증 번호 → 확인. 확인 버튼은 번호 6자리를 넣어야만 눌린다
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };
globalThis.window = globalThis.window || Object.assign(new EventTarget(), { location: { href: 'http://localhost/', origin: 'http://localhost' } });
globalThis.document = globalThis.document || { addEventListener() {}, removeEventListener() {} };
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const realSetTimeout = globalThis.setTimeout;
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
const flush = () => act(async () => {});
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const sent = [], verified = [];
  let failSend = false, failVerify = false;
  api.defaults.adapter = async config => {
    const ok = data => ({ data, status: 200, statusText: 'OK', headers: {}, config });
    const bad = error => Object.assign(new Error('bad'), { response: { status: 400, data: { error } } });
    if (config.method === 'post' && config.url.endsWith('/newsletter/subscribe')) {
      if (failSend) throw bad('이메일 형식이 올바르지 않아요.');
      sent.push(JSON.parse(config.data)); return ok({ ok: true });
    }
    if (config.method === 'post' && config.url.endsWith('/newsletter/verify')) {
      if (failVerify) throw bad('인증 번호가 맞지 않아요. 메일의 6자리 번호를 다시 확인해 주세요.');
      verified.push(JSON.parse(config.data)); return ok({ ok: true });
    }
    return ok({ enabled: true });
  };
  const { default: HeaderSubscribe } = await server.ssrLoadModule('/src/components/HeaderSubscribe.jsx');

  let view;
  await act(async () => { view = TestRenderer.create(React.createElement(HeaderSubscribe)); });
  await flush();
  const button = label => view.root.findAll(n => n.type === 'button' && text(n).startsWith(label))[0];
  assert.ok(button('구독'), '메일 서버가 준비되면 구독 버튼이 보인다');
  await act(() => button('구독').props.onClick());

  // 1) 이메일 + 동의 → 인증 번호 받기
  assert.ok(text(view.toJSON()).includes('인증 번호 받기'));
  assert.equal(view.root.findAll(n => n.props?.['aria-label'] === '인증 번호 6자리').length, 0, '번호 입력 칸은 번호를 받은 뒤에 나온다');
  await act(() => view.root.findByProps({ 'aria-label': '구독할 이메일' }).props.onChange({ target: { value: ' me@example.com ' } }));
  assert.equal(button('인증 번호 받기').props.disabled, true, '동의하기 전에는 받을 수 없다');
  await act(() => view.root.findAll(n => n.type === 'input' && n.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } }));
  assert.equal(button('인증 번호 받기').props.disabled, false);

  failSend = true;
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.ok(text(view.toJSON()).includes('이메일 형식이 올바르지 않아요.'));
  failSend = false;
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.deepEqual(sent, [{ email: 'me@example.com' }]);

  // 2) 번호 입력: 6자리를 채워야만 확인이 눌린다. 번호는 60초 뒤에야 다시 받을 수 있다
  assert.ok(text(view.toJSON()).includes('me@example.com') && text(view.toJSON()).includes('6자리 번호를 보냈어요'));
  assert.ok(button('60초 뒤에 다시 받을 수 있어요').props.disabled, '다시 받기는 기다려야 한다');
  const codeInput = () => view.root.findByProps({ 'aria-label': '인증 번호 6자리' });
  assert.equal(button('확인').props.disabled, true);
  await act(() => codeInput().props.onChange({ target: { value: '12a34' } }));
  assert.equal(codeInput().props.value, '1234', '숫자만 받는다');
  assert.equal(button('확인').props.disabled, true, '6자리가 되기 전에는 눌리지 않는다');
  await act(() => codeInput().props.onChange({ target: { value: '123456789' } }));
  assert.equal(codeInput().props.value, '123456');
  assert.equal(button('확인').props.disabled, false);

  failVerify = true;
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.ok(text(view.toJSON()).includes('인증 번호가 맞지 않아요'));
  assert.deepEqual(verified, []);
  failVerify = false;
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.deepEqual(verified, [{ email: 'me@example.com', code: '123456' }]);

  // 3) 완료: 다음 평일 아침부터 도착한다는 안내
  const done = text(view.toJSON());
  assert.ok(done.includes('구독이 시작됐어요') && done.includes('평일') && done.includes('8시 30분'));
  await act(() => button('닫기').props.onClick());
  assert.equal(view.root.findAll(n => n.props?.id === 'hs-panel').length, 0, '닫으면 창이 닫힌다');
  await act(() => view.unmount());

  assert.deepEqual(errors, []);
  console.log('Header subscribe passed: email + consent → 6-digit code → confirm only with a full code, resend wait, server error messages, weekday 8:30 notice.');
} finally {
  console.error = originalError;
  globalThis.setTimeout = realSetTimeout;
  await server.close();
}
