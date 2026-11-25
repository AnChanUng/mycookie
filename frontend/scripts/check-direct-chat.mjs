import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.window = Object.assign(new EventTarget(), { location: { host: 'test.invalid' } });
globalThis.document = Object.assign(new EventTarget(), { hidden: false });
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
let view;
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  const { default: Direct } = await server.ssrLoadModule('/src/components/DirectChat.jsx');
  const props = { participants: [{id:'other',nickname:'친구'}], self:'self' };
  await act(() => { view = TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(Direct,props))); });
  assert.ok(text(view.toJSON()).includes('로그인하고 이용하기'));
  await act(() => view.unmount());
  values.set('sync:account', JSON.stringify({token:'test-token',nickname:'나'}));
  let friendship = 'received', rows = [], failed = false;
  const posts = [];
  api.defaults.adapter = async config => {
    assert.equal(config.headers.Authorization, 'Bearer test-token');
    const body = config.data ? JSON.parse(config.data) : null;
    if (config.url.endsWith('/friend')) { friendship = body.action === 'accept' ? 'friends' : 'none'; }
    if (config.method === 'post' && config.url.endsWith('/messages')) {
      posts.push(body);
      if (!failed) { failed = true; throw new Error('lost response'); }
      rows = [{id:1,mine:true,text:body.text,at:new Date().toISOString()}];
    }
    const data = config.url === '/direct/members' ? [] : config.url === '/direct' ? [{id:1,nickname:'친구',friendship,unread:0}] : config.url.endsWith('/messages') ? rows : {ok:true};
    return {data,status:200,statusText:'OK',headers:{},config};
  };
  await act(() => { view = TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(Direct,props))); });
  const button = label => view.root.findAllByType('button').find(b => text(b) === label);
  await act(() => button('수락').props.onClick());
  // 대화를 열고 ⋯(친구 관리) 메뉴에서 친구 삭제가 보이면 수락된 것이다
  await act(() => view.root.findAll(n => n.type === 'button' && String(n.props.className || '').includes('direct-row'))[0].props.onClick());
  await act(() => view.root.findByProps({'aria-label':'친구 관리'}).props.onClick());
  assert.ok(button('친구 삭제'));
  await act(() => view.root.findByProps({'aria-label':'친구 관리'}).props.onClick());
  const input = () => view.root.findByProps({'aria-label':'1:1 메시지'});
  await act(() => input().props.onChange({target:{value:'안녕하세요'}}));
  const submit = () => view.root.findByType('form').props.onSubmit({preventDefault(){}});
  await act(submit);
  assert.equal(input().props.value,'안녕하세요');
  await act(submit);
  assert.equal(posts.length,2);
  assert.equal(posts[0].clientId,posts[1].clientId);
  assert.equal(input().props.value,'');
  assert.ok(text(view.toJSON()).includes('안녕하세요'));
  console.log('Direct chat passed: guest login, friend acceptance, private message, failed draft and retry idempotency. No live network.');
} finally { if(view) await act(() => view.unmount()); await server.close(); }
