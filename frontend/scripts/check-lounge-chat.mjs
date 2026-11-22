import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.localStorage=memory();globalThis.sessionStorage=memory();
globalThis.window=Object.assign(new EventTarget(),{location:{host:'test.invalid'}});
globalThis.document=Object.assign(new EventTarget(),{hidden:false,referrer:''});
const RealDate=Date;
let now=RealDate.parse('2026-11-23T14:59:59Z');
globalThis.Date=class extends RealDate {constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}};
class Stream {
 static instances=[];
 constructor(url){this.url=url;this.listeners={};Stream.instances.push(this);}
 addEventListener(name,callback){this.listeners[name]=callback;}
 emit(data){this.listeners.messages({data:JSON.stringify(data)});}
 close(){this.closed=true;}
}
globalThis.EventSource=Stream;
const originalError=console.error,errors=[];
console.error=(...a)=>{if(!String(a[0]).startsWith('react-test-renderer is deprecated'))errors.push(a.join(' '));};
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
let view;
const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join('');
const originalTimeout=setTimeout;
let midnight;
try {
 const {default:api}=await server.ssrLoadModule('/src/api.js');
 let deferred;let duelRequest;
 const posts=[];
 const presenceRequests=[];
 api.defaults.adapter=async config=>{
  if(config.url==='/duels'){duelRequest=JSON.parse(config.data);return {data:{code:'ABC234'},status:200,statusText:'OK',headers:{},config};}
  if(config.url==='/lounge/presence') { presenceRequests.push(config.method); return {data:{self:'self',participants:[{id:'self',nickname:'나'},{id:'other',nickname:'상대'}]},status:200,statusText:'OK',headers:{},config}; }
  if(config.method==='post') {posts.push(JSON.parse(config.data));return new Promise((resolve,reject)=>{deferred={resolve:data=>resolve({data,status:200,statusText:'OK',headers:{},config}),reject};});}
  return {data:{messages:[],epoch:1,online:2},status:200,statusText:'OK',headers:{},config};
 };
 const {default:Chat}=await server.ssrLoadModule('/src/components/LoungeChat.jsx');
 globalThis.setTimeout=(fn,delay,...args)=>{const id=originalTimeout(fn,delay,...args);if(delay===1000)midnight={fn,id};return id;};
 const props={open:true,online:2,onOnline(){},onUnread(){},onClose(){}};
 await act(()=>{view=TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(Chat,{...props,open:false})));});
 assert.ok(presenceRequests.includes('post'),'closed chat registers site presence');
 await act(()=>view.update(React.createElement(MemoryRouter,null,React.createElement(Chat,props))));
 await act(()=>view.update(React.createElement(MemoryRouter,null,React.createElement(Chat,{...props,open:false}))));
 assert.ok(!presenceRequests.includes('delete'),'closing chat retains site presence');
 await act(()=>view.update(React.createElement(MemoryRouter,null,React.createElement(Chat,props))));
 const stream=Stream.instances.at(-1);assert.ok(stream.url.endsWith('/lounge/stream'));
 const input=()=>view.root.findByProps({'aria-label':'메시지'});
 const send=async value=>{await act(()=>input().props.onChange({target:{value}}));await act(()=>view.root.findByProps({className:'lounge-form'}).props.onSubmit({preventDefault(){}}));};
 await send('즉시 보이기');
 assert.ok(text(view.toJSON()).includes('전송 중…'));assert.ok(text(view.toJSON()).includes('즉시 보이기'));assert.equal(input().props.value,'');
 const posted=posts[0];
 await act(()=>deferred.reject(new Error('network')));
 assert.ok(text(view.toJSON()).includes('전송 실패'));
 await act(()=>{view.root.findAllByType('button').find(b=>text(b)==='재시도').props.onClick();});
 assert.equal(posts[1].clientId,posted.clientId,'retry uses the same idempotency key');
 await act(()=>input().props.onChange({target:{value:'작성 중인 다음 글'}}));
 const confirmed={id:1,clientId:posted.clientId,nickname:posted.nickname,visitor:posted.visitorId.slice(0,8),text:posted.text,at:new Date().toISOString()};
 await act(()=>stream.emit({messages:[confirmed],epoch:1,online:2}));
 assert.equal(view.root.findAllByProps({className:'lounge-bubble'}).length,1,'stream echo replaces optimistic bubble');
 await act(()=>deferred.resolve(confirmed));
 assert.equal(view.root.findAllByProps({className:'lounge-bubble'}).length,1,'HTTP confirmation is deduplicated');
 assert.equal(input().props.value,'작성 중인 다음 글');
 // A stream-confirmed send stays successful even if its HTTP response is lost.
 await send('응답만 유실');
 const second={...confirmed,id:2,clientId:posts.at(-1).clientId,text:'응답만 유실'};
 await act(()=>stream.emit({messages:[confirmed,second],epoch:1,online:2}));
 await act(()=>deferred.reject(new Error('response lost')));
 assert.equal(view.root.findAllByProps({role:'alert'}).length,0);
 // Server-pushed deletion applies immediately.
 await act(()=>stream.emit({messages:[],epoch:2,online:2}));
 assert.equal(view.root.findAllByProps({className:'lounge-bubble'}).length,0);
 await act(()=>stream.emit({messages:[confirmed],epoch:3,online:2}));
 assert.ok(!midnight,'no midnight clearing timer: history stays after the day changes');
 assert.equal(view.root.findAllByProps({className:'lounge-bubble'}).length,1,'conversation history keeps showing');
 // 기록 시작일(2026-11-22) 이전 글은 목록에 올리지 않는다
 await act(()=>stream.emit({messages:[{...confirmed,id:90,text:'기록 시작 전',at:'2026-11-21T14:59:59.000Z'}],epoch:3,online:2}));
 assert.equal(view.root.findAllByProps({className:'lounge-bubble'}).length,0,'messages before the history start are not shown');
 await act(()=>stream.emit({messages:[confirmed],epoch:4,online:2}));
 const beforeChallenge=posts.length;
 await act(async()=>{
  view.root.findAllByType('button').find(b=>text(b)==='대결 신청').props.onClick();
  for(let i=0;i<400&&posts.length===beforeChallenge;i++)await new Promise(resolve=>originalTimeout(resolve,5));
 });
 assert.ok(duelRequest,text(view.toJSON()).slice(-1600));
 assert.equal(duelRequest.questionIds.length,10);assert.equal(new Set(duelRequest.questionIds).size,10);assert.equal(duelRequest.open,false);
 assert.ok(posts.at(-1).text.includes('상대님'));assert.ok(posts.at(-1).text.includes('/duel/ABC234'));
 assert.ok(text(view.toJSON()).includes('내 대결 방 입장'));
 await act(()=>deferred.resolve({...confirmed,id:3,clientId:posts.at(-1).clientId,text:posts.at(-1).text,at:new Date().toISOString()}));
 await act(()=>stream.onerror());
 await act(()=>view.unmount());view=null;assert.ok(stream.closed);
 assert.deepEqual(errors,[]);
 console.log('Lounge passed: immediate pending display, failure/retry, idempotency key reuse, SSE/HTTP deduplication, draft preservation, live deletion, history kept across days, history start, disconnect cleanup. No live network.');
} finally {
 if(view)await act(()=>view.unmount());
 await server.close();console.error=originalError;globalThis.Date=RealDate;globalThis.setTimeout=originalTimeout;
}
