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
    else if (config.url === '/auth/me') {
      const user = JSON.parse(localStorage.getItem('sync:account') || 'null');
      data = { nickname: user?.nickname, roles: user?.token === 'cookie-owner' ? ['OWNER'] : [], privateBank: user?.token === 'bank-guest' };
    }
    else if (config.url === '/profile/badges') data = [{ name: '16기 대전 4반' }];
    else if (config.url === '/auth/nickname') data = { nickname: JSON.parse(config.data).nickname };
    else if (config.url === '/auth/password/forgot') { resetRequest = JSON.parse(config.data); data = { ok: true }; }
    else if (config.url === '/profile') { guestName = JSON.parse(config.data).nickname; data = { nickname: guestName }; }
    else if (config.url === '/rank/solved') data = { top: tiers.map((tier,i) => ({ tier, division: 5-i, rank: i+1, nickname: '매우긴닉네임'+i, count: i*250, me: false })), totalSolved: 2500, totalSolvers: 5, me: null };
    else data = {};
    return { data, status: 200, statusText: 'OK', headers: {}, config };
  };
  await mount(Menu);
  // 로그인하지 않았으면 익명 닉네임과 등급을 보여 주지 않는다(헤더의 로그인 버튼이 대신한다)
  const menuButtons = () => view.root.findAll(n => n.type === 'button' && String(n.props.className || '').includes('member-menu'));
  assert.equal(menuButtons().length, 0, '방문자에게는 계정 메뉴를 보여 주지 않는다');
  assert.ok(!text(view.toJSON()).includes('기존방문자'));
  assert.equal(view.root.findAllByProps({ 'aria-label': '등급 은 쿠키 Ⅴ' }).length, 0);
  await act(() => { localStorage.setItem('sync:account', JSON.stringify({ token: 'test-account', nickname: '회원닉네임' })); window.dispatchEvent(new Event('sync:change')); });
  // 헤더의 내 계정은 누르면 열리는 메뉴다(등급, 학습 현황, 바로가기, 로그아웃). 비밀번호 찾기는 계정 페이지로 옮겼다
  const menuButton = () => view.root.find(n => n.type === 'button' && String(n.props.className || '').includes('member-menu'));
  const menuLink = label => view.root.findAllByType('a').find(link => text(link).startsWith(label));
  const logoutButton = () => view.root.findAll(n => n.type === 'button' && text(n) === '로그아웃');
  assert.equal(menuButton().props['aria-expanded'], false);
  await act(async () => menuButton().props.onClick());
  assert.equal(menuButton().props['aria-expanded'], true);
  assert.equal(menuLink('계정 설정')?.props.href, '/account#settings');
  assert.equal(menuLink('내 학습 자세히 보기')?.props.href, '/stats');
  assert.equal(logoutButton().length, 1, '로그인한 계정은 메뉴 맨 아래에 로그아웃');
  assert.equal(view.root.findAllByType('a').filter(link => text(link) === '비밀번호 찾기').length, 0);
  await act(() => { localStorage.setItem('sync:account',JSON.stringify({ token: 'test-account', nickname: '회원닉네임' })); window.dispatchEvent(new Event('sync:change')); });
  assert.equal(logoutButton().length, 1, '로그인하면 메뉴 맨 아래에 로그아웃');
  assert.equal(view.root.findAllByProps({ 'aria-label': '등급 금 쿠키 Ⅴ' }).length, 2, '메뉴가 열려 있으면 버튼과 메뉴에 배지가 하나씩'); assert.ok(text(view.toJSON()).includes('회원닉네임'));
  await act(async () => { await changeNickname('바꾼회원'); });
  assert.ok(text(view.toJSON()).includes('바꾼회원'));
  fail = true;
  await act(() => { localStorage.removeItem('sync:account'); window.dispatchEvent(new Event('sync:change')); });
  assert.equal(menuButtons().length, 0, '로그아웃하면 계정 메뉴가 사라진다'); assert.equal(view.root.findAllByProps({ 'aria-label': '등급 금 쿠키 Ⅴ' }).length, 0);
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
  assert.ok(view.root.findByProps({ 'aria-label': '로그인 닉네임' }));
  for (const label of ['내 등급', '개인정보 · 교육생 배지', '풀었던 문제', '학습 완료한 전공노트', '현재 브라우저의 비로그인 풀이 기록']) {
    assert.ok(!text(view.toJSON()).includes(label), label);
  }
  assert.equal(view.root.findAllByProps({ 'aria-label': '방문자 닉네임' }).length, 0);
  // 비밀번호 찾기는 이메일로 재설정 링크를 보낸다(닉네임만으로 바꾸던 방식은 보안 때문에 없앴다)
  await act(() => view.root.findAllByType('button').find(b => text(b) === '비밀번호 찾기').props.onClick());
  assert.ok(text(view.toJSON()).includes('재설정 링크를 보내 드려요'));
  const forgotEmail = () => view.root.findAll(n => n.type === 'input' && n.props.type === 'email')[0];
  await act(() => forgotEmail().props.onChange({ target: { value: 'me@example.com' } }));
  await act(async () => { await forgotEmail().parent.parent.props.onSubmit({ preventDefault() {} }); });
  assert.deepEqual(resetRequest, { email: 'me@example.com' });
  assert.ok(text(view.toJSON()).includes('재설정 메일을 보냈습니다'));
  await act(() => view.root.findAllByType('button').find(b => text(b).includes('로그인으로 돌아가기')).props.onClick());
  await act(() => view.root.findAllByType('button').find(b => text(b) === '새 계정 만들기').props.onClick());
  assert.ok(view.root.findByProps({ 'aria-label': '가입 비밀번호 확인' }));
  assert.ok(!text(view.toJSON()).includes('내 등급'));
  await act(() => {
    localStorage.setItem('sync:account', JSON.stringify({ id: 1, token: 'test-account', nickname: '회원닉네임' }));
    window.dispatchEvent(new Event('sync:change'));
  });
  assert.ok(text(view.toJSON()).includes('본인 설정'));
  assert.ok(text(view.toJSON()).includes('누적 125문제'));
  assert.ok(text(view.root.findByProps({ 'aria-label': '내 교육생 배지' })).includes('16기 대전 4반'));
  assert.ok(text(view.toJSON()).includes('풀었던 문제'));
  await unmount();
  const { default: Gate } = await server.ssrLoadModule('/src/components/RoleGate.jsx');
  for (const [nickname, token, allowed] of [['소유자', 'cookie-owner', true], ['다른이름', 'cookie-owner', true], ['일반', 'ordinary-user', false], ['일반2', 'other-user', false]]) {
    localStorage.setItem('sync:account', JSON.stringify({ id: token, token, nickname }));
    await mount(Menu);
    await act(() => view.root.findAllByType('button').find(b => b.props['aria-haspopup'] === 'menu').props.onClick());
    assert.equal(view.root.findAll(n => n.props.role === 'menuitem' && n.props.to === '/private/chanung').length, allowed ? 1 : 0);
    await unmount();
    await mount(() => React.createElement(Gate, { role: 'OWNER', title: '전용 페이지' }, React.createElement('p', null, '개인 면접 자료')));
    assert.equal(text(view.toJSON()).includes('개인 면접 자료'), allowed);
    await unmount();
  }
  // 비공개 문제집 바로가기는 서버가 열어 준 계정(privateBank)에게만 보인다. 닉네임은 화면 코드에 없다
  for (const [token, allowed] of [['bank-guest', true], ['ordinary-user', false]]) {
    localStorage.setItem('sync:account', JSON.stringify({ id: token, token, nickname: '아무개' }));
    await mount(Menu);
    await act(() => view.root.findAllByType('button').find(b => b.props['aria-haspopup'] === 'menu').props.onClick());
    assert.equal(view.root.findAll(n => n.props.role === 'menuitem' && n.props.to === '/private/banks').length, allowed ? 1 : 0, token);
    await unmount();
  }
  assert.deepEqual(errors, []);
  console.log('Member menu passed: nickname/tier, settings link, guest/member renames, account switching/offline state, logout, email password reset, five rank tiers, tier guide toggle/Escape/close. No live network.');
} finally { if (view) await unmount(); await server.close(); console.error = originalError; }
