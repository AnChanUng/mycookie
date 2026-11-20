import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k,v) => m.set(k,String(v)), removeItem: k => m.delete(k) }; };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.localStorage = memory(); globalThis.sessionStorage = memory();
globalThis.window = new EventTarget();
// 계정 메뉴가 열려 있는 동안 바깥 클릭, Esc를 듣는다
globalThis.document = new EventTarget();
window.location = { href: 'http://localhost/', origin: 'http://localhost', hostname: 'localhost', pathname: '/' };
const originalError = console.error, errors = [];
console.error = (...a) => { if (!String(a[0]).startsWith('react-test-renderer is deprecated')) errors.push(a.join(' ')); };
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
let view;
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
const mount = async Component => { await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(Component))); }); };
const unmount = async () => { await act(() => view.unmount()); view = null; };
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { saveNickname } = await server.ssrLoadModule('/src/nickname.js');
  const { changeNickname } = await server.ssrLoadModule('/src/sync.js');
  const { default: Menu } = await server.ssrLoadModule('/src/components/MemberMenu.jsx');
  const { default: Rank } = await server.ssrLoadModule('/src/components/SolveRank.jsx');
  const { default: AccountPage } = await server.ssrLoadModule('/src/pages/AccountPage.jsx');
  let guestName = '기존방문자', fail = false, checkingAccount = false, resetRequest;
  const tiers = ['BRONZE','SILVER','GOLD','DIAMOND','RUBY'];
  api.defaults.adapter = async config => {
    if (fail) throw new Error('offline');
    let data;
    if (config.url === '/membership') data = checkingAccount
      ? { tier: 'GOLD', division: 2, nickname: guestName, solvedCount: 125, nextTier: 'GOLD', nextTierName: '금 쿠키 Ⅰ', nextThreshold: 200, remaining: 75 }
      : { tier: config.headers.Authorization ? 'GOLD' : 'SILVER', nickname: config.headers.Authorization ? JSON.parse(localStorage.getItem('sync:account')).nickname : guestName, solvedCount: 50 };
    else if (config.url === '/profile/badges') data = [{ name: '16기 대전 4반' }];
    else if (config.url === '/auth/nickname') data = { nickname: JSON.parse(config.data).nickname };
    else if (config.url === '/auth/password/forgot') { resetRequest = JSON.parse(config.data); data = { ok: true }; }
    else if (config.url === '/profile') { guestName = JSON.parse(config.data).nickname; data = { nickname: guestName }; }
    else if (config.url === '/rank/solved') data = { top: tiers.map((tier,i) => ({ tier, division: 5-i, rank: i+1, nickname: '매우긴닉네임'+i, count: i*250, me: false })), totalSolved: 2500, totalSolvers: 5, me: null };
    else data = {};
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  await mount(Menu);
  assert.equal(view.root.findAllByProps({ 'aria-label': '등급 은 쿠키 Ⅴ' }).length, 1); assert.ok(text(view.toJSON()).includes('기존방문자'));
  // 헤더의 내 계정은 누르면 열리는 메뉴다(등급, 학습 현황, 바로가기, 로그아웃). 비밀번호 찾기는 계정 페이지로 옮겼다
  const menuButton = () => view.root.find(n => n.type === 'button' && String(n.props.className || '').includes('member-menu'));
  const menuLink = label => view.root.findAllByType('a').find(link => text(link).startsWith(label));
  const logoutButton = () => view.root.findAll(n => n.type === 'button' && text(n) === '로그아웃');
  assert.equal(menuButton().props['aria-expanded'], false);
  await act(async () => menuButton().props.onClick());
  assert.equal(menuButton().props['aria-expanded'], true);
  assert.equal(menuLink('계정 설정')?.props.href, '/account#settings');
  assert.equal(menuLink('내 학습 자세히 보기')?.props.href, '/stats');
  assert.ok(menuLink('로그인하고 기록 지키기'), '방문자는 로그아웃 대신 로그인 안내');
  assert.equal(logoutButton().length, 0);
  assert.equal(view.root.findAllByType('a').filter(link => text(link) === '비밀번호 찾기').length, 0);
  guestName = '변경한방문자'; await act(() => saveNickname(guestName));
  assert.ok(text(view.toJSON()).includes(guestName));
  await act(() => { localStorage.setItem('sync:account',JSON.stringify({ token: 'test-account', nickname: '회원닉네임' })); window.dispatchEvent(new Event('sync:change')); });
  assert.equal(logoutButton().length, 1, '로그인하면 메뉴 맨 아래에 로그아웃');
  assert.equal(view.root.findAllByProps({ 'aria-label': '등급 금 쿠키 Ⅴ' }).length, 2, '메뉴가 열려 있으면 버튼과 메뉴에 배지가 하나씩'); assert.ok(text(view.toJSON()).includes('회원닉네임'));
  await act(async () => { await changeNickname('바꾼회원'); });
  assert.ok(text(view.toJSON()).includes('바꾼회원'));
  fail = true;
  await act(() => { localStorage.removeItem('sync:account'); window.dispatchEvent(new Event('sync:change')); });
  assert.ok(text(view.toJSON()).includes('등급 확인 필요')); assert.equal(view.root.findAllByProps({ 'aria-label': '등급 금 쿠키 Ⅴ' }).length, 0);
  await unmount(); fail = false;
  await mount(Rank);
  assert.equal(view.root.findAll(n => n.type === 'span' && String(n.props.className || '').startsWith('tier-badge')).length, 5);
  // 쿠키 그림은 등급 배지 5개 + 제목 쿠키 1개. 1~3위는 금, 은, 동 색 숫자 배지(이모지 없음)
  assert.equal(view.root.findAllByType('svg').length, 6);
  assert.deepEqual(view.root.findAllByProps({ className: 'rank-medal m1 ' }).concat(view.root.findAllByProps({ className: 'rank-medal m2 ' }), view.root.findAllByProps({ className: 'rank-medal m3 ' })).map(n => n.props['aria-label']), ['1위', '2위', '3위']);
  assert.ok(!text(view.toJSON()).match(/[🥇🥈🥉🏆]/u), 'no medal emoji in rank');
  assert.deepEqual(view.root.findAllByProps({ className: 'cookie-division' }).map(n => n.children.join('')), ['5','4','3','2','1']);
  for (const tier of ['동 쿠키','은 쿠키','금 쿠키','다이아 쿠키','루비 쿠키']) assert.ok(!text(view.toJSON()).includes(tier), 'rank displays icons instead of tier names');
  assert.ok(!text(view.toJSON()).includes('대전 4반'));
  const info = () => view.root.findByProps({ 'aria-label': '티어 기준 보기' });
  assert.equal(info().props['aria-expanded'], false);
  await act(() => info().props.onClick());
  assert.equal(info().props['aria-expanded'], true);
  const content = text(view.root.findByProps({ 'aria-label': '티어 등급 기준' }));
  for (const word of ['동 쿠키','은 쿠키','금 쿠키','다이아 쿠키','루비 쿠키','50개','300개','1,000개']) assert.ok(content.includes(word), word);
  for (const range of ['0~29', '30~59', '60~99', '100~199', '200~299']) assert.ok(content.includes(range));
  assert.ok(content.includes('누적 30문제부터 금 쿠키 Ⅳ'));
  assert.ok(content.includes('승급해도 초기화되지 않습니다'));
  await act(() => info().props.onKeyDown({ key: 'Escape' }));
  assert.equal(view.root.findAllByProps({ 'aria-label': '티어 등급 기준' }).length, 0);
  await act(() => info().props.onClick());
  await act(() => view.root.findAllByType('button').find(b => text(b) === '닫기').props.onClick());
  assert.equal(info().props['aria-expanded'], false);
  await unmount();
  checkingAccount = true;
  await mount(AccountPage);
  assert.ok(!text(view.toJSON()).includes('본인 설정'), '로그아웃 상태에서는 본인 설정을 숨긴다');
  assert.ok(text(view.toJSON()).includes('누적 125문제'));
  assert.ok(text(view.toJSON()).includes('금 쿠키 Ⅰ 승급 기준: 누적 200문제 이상 · 앞으로 75문제'));
  assert.ok(text(view.root.findByProps({ 'aria-label': '내 교육생 배지' })).includes('16기 대전 4반'));
  // 비밀번호 찾기는 이메일로 재설정 링크를 보낸다(닉네임만으로 바꾸던 방식은 보안 때문에 없앴다)
  await act(() => view.root.findAllByType('button').find(b => text(b) === '비밀번호 찾기').props.onClick());
  assert.ok(text(view.toJSON()).includes('재설정 링크를 보내 드려요'));
  const forgotEmail = () => view.root.findAll(n => n.type === 'input' && n.props.type === 'email')[0];
  await act(() => forgotEmail().props.onChange({ target: { value: 'me@example.com' } }));
  await act(async () => { await forgotEmail().parent.parent.props.onSubmit({ preventDefault() {} }); });
  assert.deepEqual(resetRequest, { email: 'me@example.com' });
  assert.ok(text(view.toJSON()).includes('재설정 메일을 보냈습니다'));
  await act(() => view.root.findAllByType('button').find(b => text(b).includes('로그인으로 돌아가기')).props.onClick());
  const nicknameInput = () => view.root.findByProps({ 'aria-label': '방문자 닉네임' });
  await act(() => nicknameInput().props.onChange({ target: { value: '설정에서변경' } }));
  await act(async () => { await nicknameInput().parent.props.onSubmit({ preventDefault() {} }); });
  assert.equal(localStorage.getItem('lounge:nickname'), '설정에서변경');
  assert.ok(text(view.toJSON()).includes('방문자 닉네임을 변경했습니다.'));
  fail = true;
  await act(() => nicknameInput().props.onChange({ target: { value: '중복이름' } }));
  await act(async () => { await nicknameInput().parent.props.onSubmit({ preventDefault() {} }); });
  assert.equal(localStorage.getItem('lounge:nickname'), '설정에서변경');
  await unmount(); assert.deepEqual(errors, []);
  console.log('Member menu passed: nickname/tier, settings link, guest/member renames, account switching/offline state, logout, email password reset, five rank tiers, tier guide toggle/Escape/close. No live network.');
} finally { if (view) await unmount(); await server.close(); console.error = originalError; }
