import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';

const values = new Map();
globalThis.localStorage = { getItem:k=>values.get(k)??null, setItem:(k,v)=>values.set(k,String(v)), removeItem:k=>values.delete(k) };
globalThis.window = Object.assign(new EventTarget(), { location:{href:'http://test.invalid/',origin:'http://test.invalid'} });
globalThis.document = Object.assign(new EventTarget(), {visibilityState:'visible'});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const server = await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const oldError = console.error, errors = [];
console.error = (...args) => { if(!String(args[0]).startsWith('react-test-renderer is deprecated')) errors.push(args.join(' ')); };
let view;
const settle = () => new Promise(resolve=>setTimeout(resolve,30));
const users = {A:{id:1,nickname:'A',token:'A'},B:{id:2,nickname:'B',token:'B'}};
const login = name => {
  if(name)localStorage.setItem('sync:account',JSON.stringify(users[name]));else localStorage.removeItem('sync:account');
  window.dispatchEvent(new Event('sync:change'));
};
try {
  const {default:api}=await server.ssrLoadModule('/src/api.js');
  const sync=await server.ssrLoadModule('/src/sync.js');
  const {useExamProgress,syncProgress}=await server.ssrLoadModule('/src/hooks/useExamProgress.js');
  const remote={A:{},B:{}};const writes=[];
  let offline=false,holdPut=null,holdGet=null,active=0,maxActive=0;
  api.defaults.adapter=async config=>{
    const token=config.headers.Authorization.replace('Bearer ','');
    const bank=config.url.split('/').at(-1);
    if(config.method==='put') {
      active++;maxActive=Math.max(maxActive,active);
      try {
        const entry={token,bank,data:JSON.parse(JSON.parse(config.data).data)};writes.push(entry);
        if(holdPut)await holdPut;
        if(offline)throw new Error('offline');
        remote[token][bank]=entry.data;
      } finally {active--;}
    }
    const record=structuredClone(remote[token][bank]||null);
    if(config.method==='get'&&holdGet)await holdGet;
    return {data:{data:record?JSON.stringify(record):null},status:200,statusText:'OK',headers:{},config};
  };
  login('A');
  sync.pushRemote('ibk',{stats:{phone:{c:1,at:1}}},60000);
  login('B');
  assert.equal(await sync.pushRemoteNow('ibk',{stats:{pc:{c:1,at:2}}}),true);
  assert.ok(writes.every(w=>w.token==='B'&&!w.data.stats.phone),'A queued record never uses B credentials');
  login('A');await settle();
  assert.ok(remote.A.ibk.stats.phone);
  assert.ok(!remote.B.ibk.stats.phone);
  offline=true;
  assert.equal(await sync.pushRemoteNow('offline-bank',{stats:{kept:{c:1,at:3}}}),false);
  assert.ok(JSON.parse(values.get('sync:pending:v1:user:1'))['offline-bank']);
  offline=false;window.dispatchEvent(new Event('online'));await settle();
  assert.ok(remote.A['offline-bank'].stats.kept,'reconnect retries without another answer');
  login(null);
  localStorage.setItem('sync:pending:v1:user:1',JSON.stringify({'restored-bank':{stats:{durable:{c:1,at:4}}}}));
  login('A');await settle();
  assert.ok(remote.A['restored-bank'].stats.durable,'durable queue can be rebuilt from storage');
  let release;holdPut=new Promise(resolve=>{release=resolve;});
  const first=sync.pushRemoteNow('serial-bank',{stats:{q:{c:1,at:5}}});
  const second=sync.pushRemoteNow('serial-bank',{stats:{q:{c:2,at:6}}});
  await settle();assert.equal(maxActive,1);
  holdPut=null;release();await Promise.all([first,second]);
  assert.equal(remote.A['serial-bank'].stats.q.c,2,'newer save is sent after older request completes');
  const originalAdapter=api.defaults.adapter;
  let reads=0;
  remote.A.transient={stats:{recovered:{c:1,at:7}}};
  api.defaults.adapter=config=>{
    if(config.url==='/exam/progress/transient' && ++reads<=2) throw Object.assign(new Error('server starting'),{response:{status:503}});
    return originalAdapter(config);
  };
  assert.ok((await sync.fetchRemote('transient')).stats.recovered,'temporary server failures retry automatically');
  assert.equal(reads,3);
  let rejectOld;
  api.defaults.adapter=config=>config.url==='/exam/progress/stale-auth'?new Promise((_,reject)=>{rejectOld=reject;}):originalAdapter(config);
  const stale=sync.fetchRemote('stale-auth');
  login('B');rejectOld({response:{status:401}});
  await assert.rejects(stale);
  assert.equal(sync.account().token,'B','old 401 cannot log out the current account');
  api.defaults.adapter=originalAdapter;
  login(null);
  let progress;
  function Probe(){progress=useExamProgress('peer-bank');return React.createElement('div',null,JSON.stringify(progress.data));}
  await act(async()=>{view=TestRenderer.create(React.createElement(Probe));});
  remote.A['peer-bank']={stats:{phone:{c:1,at:10}},history:[],marks:{}};
  await act(async()=>{login('A');await settle();});
  assert.ok(progress.data.stats.phone,'login refreshes a page that was already open');
  remote.A['peer-bank'].stats.pc={c:1,at:11};
  await act(async()=>{window.dispatchEvent(new Event('focus'));await settle();});
  assert.ok(progress.data.stats.pc,'returning to the window fetches the other device');
  let releaseGet;holdGet=new Promise(resolve=>{releaseGet=resolve;});
  await act(async()=>{window.dispatchEvent(new Event('focus'));await settle();});
  await act(()=>progress.save(previous=>({...previous,stats:{...previous.stats,local:{c:1,at:12}}})));
  await act(async()=>{holdGet=null;releaseGet();await settle();});
  assert.ok(progress.data.stats.local,'an answer entered during GET is not replaced in the UI');
  await sync.pushRemoteNow('peer-bank',progress.data);
  // 실제 계정 전환처럼 저장소를 비워도 열린 화면의 메모리가 섞이면 안 된다.
  await act(async()=>{
    localStorage.removeItem('exam-progress:peer-bank');
    login('B');
    await settle();
  });
  assert.deepEqual(progress.data.stats,{},'account switch clears mounted progress');
  await act(()=>progress.save(previous=>({...previous,stats:{...previous.stats,onlyB:{c:1,at:30}}})));
  await sync.pushRemoteNow('peer-bank',progress.data);
  assert.deepEqual(Object.keys(remote.B['peer-bank'].stats),['onlyB'],'B cannot upload A records from memory');
  await act(()=>view.unmount());view=null;
  offline=true;
  localStorage.setItem('exam-progress:failed-manual',JSON.stringify({stats:{q:{c:1,at:20}}}));
  await assert.rejects(syncProgress('failed-manual',{wait:true}),'manual sync must not report success when upload failed');
  offline=false;window.dispatchEvent(new Event('online'));await settle();
  assert.deepEqual(errors,[]);
  console.log('Cross-device sync passed: persisted retries, reconnect, captured credentials, stale 401 isolation, serialized writes, login/focus refresh, in-flight answer preservation, honest manual-sync failure.');
} finally {
  if(view)await act(()=>view.unmount());
  await server.close();console.error=oldError;
}
