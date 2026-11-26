import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

// 기술면접(소유자 전용): 주제별 1~4단계 꼬리질문, 답변 포인트 보기, 질문 등록. 질문은 서버에서만 받아 온다
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: k => values.delete(k) };
globalThis.window = new EventTarget();
localStorage.setItem('sync:account', JSON.stringify({ token: 'owner-token', nickname: '소유자' }));
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
let view;
const flush = () => act(async () => {});
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Page } = await server.ssrLoadModule('/src/pages/TechInterviewPage.jsx');

  const topics = [
    { id: 'a', title: '주제 A', source: '이력서 문장 A', levels: [
      { depth: 1, questions: [{ q: 'A 기본 질문', intent: '의도 A', answer: '결론 한 줄\n상황: 예시 상황', points: ['포인트 1', '포인트 2'] }] },
      { depth: 2, questions: [{ q: 'A 꼬리질문', points: ['포인트 3'] }] },
      { depth: 4, questions: [{ q: 'A 한계 질문' }] },
    ] },
    { id: 'b', title: '주제 B', levels: [{ depth: 1, questions: [{ q: 'B 기본 질문' }] }] },
  ];
  let stored = topics, fail = false, putBody = null, putAuth = null;
  api.defaults.adapter = async config => {
    if (fail) throw Object.assign(new Error('forbidden'), { response: { status: 403 } });
    if (config.method === 'put') { putBody = JSON.parse(config.data); putAuth = config.headers.Authorization; stored = putBody.data; return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }; }
    return { data: { data: stored }, status: 200, statusText: 'OK', headers: {}, config };
  };
  const mount = async () => { await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, null, React.createElement(Page, { back: { to: '/x', label: '← 뒤로' } }))); }); await flush(); };
  const buttons = label => view.root.findAll(n => n.type === 'button' && text(n) === label);
  const tab = d => view.root.findAll(n => n.type === 'button' && n.props.role === 'tab' && text(n) === `${d}단계`)[0];

  await mount();
  const all = () => text(view.toJSON());
  assert.ok(all().includes('주제 A') && all().includes('주제 B') && all().includes('이력서: 이력서 문장 A'), '주제마다 묶어 보여 준다');
  assert.ok(all().includes('A 기본 질문') && all().includes('A 꼬리질문') && all().includes('A 한계 질문') && all().includes('B 기본 질문'), '모든 단계 질문이 한 화면에 나온다');
  assert.ok(all().includes('1단계 · 기본 질문') && all().includes('4단계 · 한계까지'));
  assert.ok(all().includes('4문항 · 작성 0/4'));
  assert.equal(view.root.findAll(n => /camera|카메라/i.test(String(n.props?.className || '') + (typeof n.children?.[0] === 'string' ? n.children[0] : ''))).length, 0, '카메라 기능은 없다');

  // 답변 포인트는 눌러야 보인다
  assert.ok(!all().includes('포인트 1'));
  await act(() => buttons('기억 안 나요 · 모범답안 보기')[0].props.onClick());
  assert.ok(all().includes('포인트 1') && all().includes('의도 A'));
  assert.ok(all().includes('모범답안') && all().includes('결론 한 줄') && all().includes('상황: 예시 상황'), '모범답안을 줄마다 나눠 보여 준다');

  // 직접 적어보기는 이 브라우저에 저장된다
  const box = view.root.findAllByType('textarea').find(n => String(n.props.id).startsWith('draft-a-1-0'));
  await act(() => box.props.onChange({ target: { value: '내 답변' } }));
  assert.ok(all().includes('작성 1/4'));
  assert.ok([...values.keys()].some(k => k.startsWith('tech-interview:drafts:v1:')));

  // 학습 완료하면 목록에서 빠지고, 완료 표시를 켜면 다시 보인다
  const check = view.root.findAll(n => n.type === 'input' && n.props.type === 'checkbox' && n.props['aria-label'] === 'A 기본 질문 학습 완료')[0];
  await act(() => check.props.onChange());
  assert.ok(!all().includes('A 기본 질문') && all().includes('A 꼬리질문'));
  const showDone = view.root.findAll(n => n.type === 'input' && n.props.type === 'checkbox' && !n.props['aria-label'])[0];
  await act(() => showDone.props.onChange({ target: { checked: true } }));
  assert.ok(all().includes('A 기본 질문'));

  // 주제를 고르면 그 주제만 남는다
  await act(() => view.root.findByProps({ 'aria-label': '기술면접 주제' }).props.onChange({ target: { value: 'b' } }));
  assert.ok(all().includes('B 기본 질문') && !all().includes('A 꼬리질문'));

  // 질문 등록: 잘못된 JSON과 모양은 막고, 맞으면 소유자 토큰으로 저장한다
  const area = view.root.findByProps({ 'aria-label': '질문 JSON' });
  await act(() => area.props.onChange({ target: { value: '{깨진' } }));
  await act(async () => { await buttons('저장')[0].props.onClick(); });
  assert.ok(text(view.toJSON()).includes('JSON 형식이 올바르지 않아요'));
  await act(() => area.props.onChange({ target: { value: '[{"id":1}]' } }));
  await act(async () => { await buttons('저장')[0].props.onClick(); });
  assert.ok(text(view.toJSON()).includes('자료 모양이 맞지 않아요'));
  await act(() => area.props.onChange({ target: { value: JSON.stringify([{ id: 'c', title: '새 주제', levels: [{ depth: 1, questions: [{ q: '새 질문' }] }] }]) } }));
  await act(async () => { await buttons('저장')[0].props.onClick(); });
  await flush();
  assert.equal(putAuth, 'Bearer owner-token');
  assert.equal(putBody.data[0].id, 'c');
  assert.ok(text(view.toJSON()).includes('새 주제'));
  await act(() => view.unmount());

  // 비어 있으면 안내, 권한이 없으면 오류 문구
  stored = null;
  await mount();
  assert.ok(text(view.toJSON()).includes('아직 등록된 질문이 없어요'));
  await act(() => view.unmount());
  fail = true;
  await mount();
  assert.ok(text(view.toJSON()).includes('질문을 불러오지 못했어요'));
  await act(() => view.unmount());

  assert.deepEqual(errors, []);
  console.log('Tech interview passed: practice layout without camera, topics with depth 1-4, answer points, drafts and completion saved locally, topic filter, registration with owner token, empty and error states.');
} finally {
  console.error = originalError;
  await server.close();
}
