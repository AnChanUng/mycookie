import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.localStorage = memory(); globalThis.sessionStorage = memory();
globalThis.window = new EventTarget();
window.location = { href: 'http://localhost/', origin: 'http://localhost', hostname: 'localhost', pathname: '/' };
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
let view;
try {
  const { default: api, safePath, recentFailures } = await server.ssrLoadModule('/src/api.js');
  const { bugContent } = await server.ssrLoadModule('/src/feedbackForm.js');
  const { default: FeedbackPage } = await server.ssrLoadModule('/src/pages/FeedbackPage.jsx');

  // 경로에서 개인정보가 될 수 있는 조각과 쿼리는 버린다
  assert.equal(safePath('/exam/cu/questions?nickname=홍길동'), '/exam/cu/questions');
  assert.equal(safePath('https://mycookie.dev/api/v1/profile/홍길동/badges'), '/profile/:id/badges');
  assert.equal(safePath('/records/123'), '/records/:id');

  let posted;
  api.defaults.adapter = async config => {
    if (config.url === '/feedback') { posted = JSON.parse(config.data); return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }; }
    const error = new Error('boom'); error.config = config; error.response = { status: 500, data: {} }; throw error;
  };
  await api.get('/exam/cu/submit?token=secret').catch(() => {});
  await api.post('/track', {}).catch(() => {});
  for (let i = 0; i < 6; i++) await api.get(`/records/${i}`).catch(() => {});
  const failures = recentFailures();
  assert.equal(failures.length, 5, '최근 5개만 기억한다');
  assert.ok(failures.every(f => f.path !== '/track'), '방문 기록 요청은 빼고 센다');
  assert.ok(!JSON.stringify(failures).includes('secret'));
  assert.equal(recentFailures(Date.now() + 31 * 60 * 1000).length, 0, '30분이 지나면 붙이지 않는다');

  const body = bugContent({ steps: '제출을 눌렀다', expected: '채점', actual: '0점' }, failures.slice(0, 1));
  assert.ok(body.includes('**무엇을 했나요**\n제출을 눌렀다') && body.includes('**실제로 일어난 일**\n0점'));
  assert.ok(body.includes('GET /records/:id → 500'));

  await act(async () => {
    view = TestRenderer.create(React.createElement(MemoryRouter, { initialEntries: [{ pathname: '/feedback', search: '?kind=bug', state: { from: '/exam/cu' } }] }, React.createElement(FeedbackPage)));
  });
  const submit = () => view.root.findAllByType('button').find(b => b.props.className === 'fb-submit');
  const area = label => view.root.findAll(n => n.type === 'label' && text(n).startsWith(label))[0].findByType('textarea');
  assert.equal(submit().props.disabled, true);
  await act(() => view.root.findAll(n => n.type === 'input' && n.props.maxLength === 80)[0].props.onChange({ target: { value: '채점이 0점' } }));
  await act(() => area('무엇을 했나요').props.onChange({ target: { value: '모의고사 제출' } }));
  await act(() => area('기대한 결과').props.onChange({ target: { value: '점수가 보임' } }));
  assert.equal(submit().props.disabled, true, '세 칸을 모두 채워야 보낼 수 있다');
  await act(() => area('실제로 일어난 일').props.onChange({ target: { value: '0점으로 나옴' } }));
  assert.equal(submit().props.disabled, false);
  assert.equal(view.root.findByProps({ 'aria-label': '함께 보낼 요청 오류' }).findAllByType('li').length, 5);

  // 체크를 끄면 요청 오류를 붙이지 않는다
  await act(() => view.root.findAll(n => n.type === 'input' && n.props.type === 'checkbox')[0].props.onChange({ target: { checked: false } }));
  await act(async () => { await view.root.findByType('form').props.onSubmit({ preventDefault() {} }); });
  assert.equal(posted.kind, 'bug'); assert.equal(posted.path, '/exam/cu'); assert.equal(posted.title, '채점이 0점');
  assert.ok(posted.content.includes('**기대한 결과**\n점수가 보임'));
  assert.ok(!posted.content.includes('최근 실패한 요청'));
  assert.ok(text(view.toJSON()).includes('잘 받았어요'));
  await act(() => view.unmount()); view = null;
  if (errors.length) console.log(errors.map(e => e.slice(0, 300)));
  assert.deepEqual(errors, []);
  console.log('Feedback passed: structured bug fields, failed-request memory (5 max, 30 min, no query or ids, no /track), opt-out attachment, submit payload. No live network.');
} finally { if (view) await act(() => view.unmount()); await server.close(); console.error = originalError; }
