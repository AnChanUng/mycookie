import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {createServer} from 'vite';
import {FACTS, koreanDay, dayLabel, factForDay, quizForDay} from '../src/data/todayCs.js';
import {TOPICS} from '../src/data/topicBank.js';
const memory=()=>{const values={};return new Proxy({getItem:k=>values[k]??null,setItem:(k,v)=>{values[k]=String(v);},removeItem:k=>delete values[k]}, {ownKeys:()=>Object.keys(values),getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});};
assert.equal(dayLabel(koreanDay(Date.parse('2026-10-17T14:59:59Z'))),'2026-10-17');
assert.equal(dayLabel(koreanDay(Date.parse('2026-10-17T15:00:00Z'))),'2026-10-18');
for(let cycle=440;cycle<443;cycle++)assert.equal(new Set(Array.from({length:FACTS.length},(_,i)=>factForDay(cycle*FACTS.length+i).t)).size,FACTS.length);
for(const fact of FACTS){
 const selected=quizForDay(fact,20743,TOPICS.questions);
 assert.equal(selected.length,5,fact.t);
 assert.equal(new Set(selected.map(q=>q.id)).size,5);
 assert.equal(new Set(selected.map(q=>JSON.stringify([q.q,q.code||'',q.o]))).size,5);
 for(const q of selected){const topic=q.topic.split(' · ')[0];assert.ok(fact.re.test(topic)||fact.more?.test(topic),fact.t+' '+topic);assert.ok(!fact.not?.test(topic));}
 assert.ok(selected.filter(q=>fact.re.test(q.topic.split(' · ')[0])).length>=Math.min(4,selected.length),'backfill only fills the gap');
 assert.deepEqual(selected,quizForDay(fact,20743,[...TOPICS.questions].reverse()),'same day selection does not depend on pool ordering');
}
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.localStorage=memory();globalThis.sessionStorage=memory();
globalThis.window=Object.assign(new EventTarget(),{location:{href:"http://test.invalid/"}});globalThis.document=Object.assign(new EventTarget(),{body:{style:{overflow:"auto"}}});
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
let view;const original=console.error,errors=[];
const originalInterval=globalThis.setInterval, originalNow=Date.now;
let midnightTick;
let shown=0,closed=0,focused=0;
globalThis.setInterval=(fn,delay,...args)=>{if(delay===1000)midnightTick=fn;return originalInterval(fn,delay,...args);};
console.error=(...args)=>{if(!String(args[0]).startsWith('react-test-renderer is deprecated'))errors.push(args.join(' '));};
const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join('');
try{
 const {default:Today}=await server.ssrLoadModule('/src/components/TodayCs.jsx');
 const {default:api}=await server.ssrLoadModule('/src/api.js');
 const {buildAccountRetry}=await server.ssrLoadModule('/src/accountRetry.js');
 api.defaults.adapter=async config=>({data:{data:null},status:200,statusText:'OK',headers:{},config});
 const mount=async()=>{await act(async()=>{view=TestRenderer.create(React.createElement(Today), {createNodeMock: element => element.type === "dialog" ? {showModal(){shown++;},close(){closed++;}} : element.props["aria-haspopup"] === "dialog" ? {focus(){focused++;}} : null});});};
 const toggle=()=>view.root.findAllByType('button').find(b=>b.props['aria-controls']);
 await mount();assert.equal(toggle().props['aria-expanded'],false);
 await act(async()=>{toggle().props.onClick();});
 assert.equal(view.root.findAllByProps({className:'today-quiz-q'}).length,5);
 assert.equal(shown,1);assert.equal(document.body.style.overflow,'hidden');
 const dialog=view.root.findByType('dialog');assert.ok(dialog.props['aria-labelledby']);
 const today=quizForDay(factForDay(koreanDay()),koreanDay(),TOPICS.questions);
 for(let index=0;index<5;index++){
  const q=today[index],choice=index===0?(q.a+1)%q.o.length:q.a;
  const button=view.root.findAllByProps({className:'today-quiz-q'})[index].findAllByType('button')[choice];
  await act(()=>{button.props.onClick();button.props.onClick();});
 }
 assert.ok(text(view.toJSON()).includes('5문제 중 4문제 정답'));
 let records=JSON.parse(localStorage.getItem('exam-progress:topics'));
 assert.equal(Object.keys(records.stats).length,5);
 assert.equal(Object.values(records.stats).reduce((sum,s)=>sum+s.c+s.w,0),5,'each question counted once');
 assert.ok(buildAccountRetry({topics:records}).company.questions.some(q=>q.id==='topics:'+today[0].id),'wrong daily question appears in all-bank wrong-note');
 await act(()=>{view.root.findByProps({'aria-label':'확인 문제 닫기'}).props.onClick();});
 assert.equal(document.body.style.overflow,'auto');assert.ok(closed>0);assert.ok(focused>0);
 await act(async()=>{toggle().props.onClick();});
 let prevented=false;
 await act(()=>view.root.findByType('dialog').props.onCancel({preventDefault(){prevented=true;}}));
 assert.ok(prevented);assert.equal(toggle().props['aria-expanded'],false);
 await act(async()=>{toggle().props.onClick();});
 assert.ok(text(view.toJSON()).includes('5문제 중 4문제 정답'));
 await act(()=>view.unmount());await mount();await act(async()=>{toggle().props.onClick();});
 assert.ok(text(view.toJSON()).includes('5문제 중 4문제 정답'),'answers survive refresh');
 assert.equal(JSON.stringify(records.stats),JSON.stringify(JSON.parse(localStorage.getItem('exam-progress:topics')).stats));
 await act(()=>{localStorage.setItem('sync:account',JSON.stringify({id:99,token:'new-account',nickname:'new'}));window.dispatchEvent(new Event('sync:change'));});
 await act(async()=>{toggle().props.onClick();});
 assert.ok(text(view.toJSON()).includes('0/5문제 완료'),'another account does not inherit daily answers');
 const previousDay=koreanDay();
 Date.now=()=>((previousDay+1)*86400000-9*3600000);
 await act(()=>midnightTick());
 assert.ok(text(view.toJSON()).includes(dayLabel(previousDay+1)),'open page switches to the new Korean date');
 assert.equal(toggle().props['aria-expanded'],false);
 await act(async()=>{toggle().props.onClick();});
 assert.ok(text(view.toJSON()).includes('0/5문제 완료'),'new day starts with unanswered questions');
 await act(()=>view.unmount());view=null;
 assert.deepEqual(errors,[]);
 console.log('Today CS passed: Korean midnight, non-repeating concept cycle, 46 concepts each with five related/deduplicated/common questions, answer/review, persistence, no double scoring, wrong-note integration and account isolation.');
}finally{Date.now=originalNow;globalThis.setInterval=originalInterval;if(view)await act(()=>view.unmount());await server.close();console.error=original;}
