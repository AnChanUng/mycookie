import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {MemoryRouter, useLocation} from 'react-router-dom';
import {createServer} from 'vite';
import {readFile} from 'node:fs/promises';
const saved=new Map();
globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
globalThis.window=new EventTarget(); window.location={href:'http://localhost/chanung',origin:'http://localhost'};
globalThis.document={getElementById:()=>({scrollIntoView(){}})};
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
let view,location;
function Probe(){location=useLocation();return null;}
const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join('');
try {
 const {default:Page}=await server.ssrLoadModule('/src/pages/ChanungPage.jsx');
 const {default:api}=await server.ssrLoadModule('/src/api.js');api.get=async()=>({data:{available:true}});
 const {CHANUNG_QUESTIONS:current}=await server.ssrLoadModule('/src/data/chanung.js');
 const snapshot=JSON.parse(await readFile('src/data/interview-versions/20261103_ver1.json','utf8'));
 // 보관본은 그날 답변을 고정해 둔 기록이라 지금 답변과 달라도 된다. 문항 구성과 내용이 온전한지만 본다
 assert.ok(snapshot.questions.length>0,'snapshot has questions');
 const currentIds=new Set(current.map(q=>q.id));
 for(const q of snapshot.questions){assert.ok(currentIds.has(q.id),`snapshot question ${q.id} still exists`);assert.ok(typeof q.answer==='string'&&q.answer.trim(),`snapshot ${q.id} has an answer`);}
 const snapshotIntro=snapshot.questions.find(q=>q.id==='cu-intro').answer;
 current.find(q=>q.id==='cu-intro').answer='Future revised answer';
 const mount=async path=>{
   if(view)await act(async()=>view.unmount());
   await act(async()=>{view=TestRenderer.create(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(Page),React.createElement(Probe)));});
 };
 await mount('/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?view=versions');
 assert.ok(view.root.findByProps({'aria-label':'답변 버전 관리'}));
 assert.ok(view.root.findAllByProps({to:'/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?version=20261103_ver1'}).length);
 saved.set('chanung:practice:v1:guest',JSON.stringify({'cu-intro':'latest draft'}));
 await mount('/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?version=20261103_ver1');
 const intro=view.root.findByProps({id:'cu-intro'});
 await act(async()=>intro.findAllByType('button').find(b=>text(b)==='기억 안 나요 · 답변 보기').props.onClick());
 assert.equal(text(intro.findByProps({className:'chanung-original'})),snapshotIntro,'archive does not follow future edits');
 assert.equal(view.root.findByProps({id:'draft-cu-intro'}).props.value,'','archive has independent drafts');
 await act(async()=>view.root.findByProps({id:'draft-cu-intro'}).props.onChange({target:{value:'archive draft'}}));
 await act(async()=>view.root.findByProps({'aria-label':'자기소개 학습 완료'}).props.onChange());
 assert.ok(saved.has('chanung:practice:v1:guest:version:20261103_ver1:completed:v2'));
 assert.ok(!saved.has('chanung:practice:v1:guest:completed:v2'));
 const nav=view.root.findByProps({'aria-label':'면접 질문 목차'});
 await act(async()=>nav.findAllByType('button')[1].props.onClick());
 assert.equal(location.search,'?version=20261103_ver1','navigation retains snapshot');
 await mount('/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?version=20261103_ver1');
 // 완료한 문항은 기본으로 숨기므로 다시 열면 '완료한 답변도 표시'를 켜고 본다
 const showDone=()=>act(async()=>view.root.findAll(n=>n.type==='label'&&text(n).includes('완료한 답변도 표시'))[0].findByType('input').props.onChange({target:{checked:true}}));
 await showDone();
 assert.equal(view.root.findByProps({id:'draft-cu-intro'}).props.value,'archive draft','archive draft survives reload');
 assert.equal(view.root.findByProps({'aria-label':'자기소개 학습 완료'}).props.checked,true);
 await mount('/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9');
 assert.equal(view.root.findByProps({id:'draft-cu-intro'}).props.value,'latest draft','latest draft unaffected');
 assert.equal(view.root.findByProps({'aria-label':'자기소개 학습 완료'}).props.checked,false);
 await mount('/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9?version=missing');
 assert.ok(text(view.root.findByProps({role:'alert'})).includes('찾을 수 없는'));
 console.log('PASS: snapshot intact, future-edit isolation, version navigation/reload, independent drafts/completion, missing version');
} finally {if(view)await act(async()=>view.unmount());await server.close();}
