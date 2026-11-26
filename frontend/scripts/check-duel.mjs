import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {MemoryRouter, Routes, Route} from 'react-router-dom';
import {createServer} from 'vite';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const memory=new Map();
globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
globalThis.sessionStorage=globalThis.localStorage;
globalThis.window=Object.assign(new EventTarget(),{location:{origin:'http://test.invalid',host:'test.invalid'}});
globalThis.document=Object.assign(new EventTarget(),{hidden:false});
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
let view;
const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join('');
try {
 const {default:api}=await server.ssrLoadModule('/src/api.js');
 const {TOPICS}=await server.ssrLoadModule('/src/data/topicBank.js');
 const {default:Duel}=await server.ssrLoadModule('/src/pages/DuelPage.jsx');
 const ids=TOPICS.questions.slice(0,3).map(q=>q.id);
 let players=[{nickname:'나',me:true,score:0,answered:0,seconds:0,started:false,done:false}];
 let joined=false;
 api.defaults.adapter=async config=>{
  if(config.url.endsWith('/join'))joined=true;
  const data=config.url==='/duels/record'?{wins:2,losses:1,draws:1,total:4,recent:[]}:
   config.url==='/duels/open'?[]:{questionIds:ids,players,open:false};
  return {data,status:200,statusText:'OK',headers:{},config};
 };
 const mount=async path=>{
  if(view)await act(()=>view.unmount());
  await act(()=>{view=TestRenderer.create(React.createElement(MemoryRouter,{initialEntries:[path]},React.createElement(Routes,null,React.createElement(Route,{path:'/duel/:code?',element:React.createElement(Duel)}))));});
 };
 await mount('/duel/ABC234');
 assert.ok(joined);
 assert.ok(text(view.toJSON()).includes('시작하기'));
 assert.ok(text(view.toJSON()).includes('대기 중'));
 for(const [score,seconds,label] of [[3,20,'승리했습니다!'],[1,20,'아쉽게 패배했습니다'],[2,30,'무승부입니다!']]){
  players=[{nickname:'나',me:true,score,seconds,answered:3,done:true,started:true},{nickname:'상대',me:false,score:2,seconds:30,answered:3,done:true,started:true}]
   .sort((a,b)=>b.score-a.score||a.seconds-b.seconds);
  await mount('/duel/ABC234');
  assert.ok(text(view.toJSON()).includes(label),label);
 }
 await mount('/duel');
 assert.ok(text(view.toJSON()).includes('나의 누적 전적'));
 assert.ok(text(view.toJSON()).includes('50%'));
 const find=(label)=>view.root.findAll(n=>n.type==='button'&&text(n).includes(label))[0];
 const stats=()=>JSON.parse(localStorage.getItem('exam-progress:topics')||'{"stats":{}}').stats;
 // 1:1 방에서 고른 답은 주제별 통합 풀이 기록에 바로 들어간다(맞힌 것 · 틀린 것 모두)
 players=[{nickname:'나',me:true,score:0,answered:0,seconds:0,started:false,done:false}];
 await mount('/duel/ABC234');
 await act(()=>find('시작하기').props.onClick());
 const first=TOPICS.questions.find(q=>q.id===ids[0]);
 await act(()=>view.root.findAll(n=>n.type==='button'&&n.props.className?.startsWith('exam-opt'))[(first.a+1)%first.o.length].props.onClick());
 assert.equal(stats()[ids[0]]?.w,1,'wrong duel answer is saved to topics progress');
 assert.ok(text(view.toJSON()).includes('정답은'),'shared question card shows explanation');
 // 새로고침 뒤 서버가 1문제 풀었다고 알려 주면 같은 문제를 다시 세지 않는다
 players=[{nickname:'나',me:true,score:0,answered:1,picks:'x',marks:'0',seconds:3,started:true,done:false}];
 await mount('/duel/ABC234');
 assert.equal(stats()[ids[0]].w,1,'resumed room does not count the same answer twice');
 // 혼자 풀기: 방을 만들지 않고 10문제를 풀면 모두 풀이 기록과 최고 기록에 남는다
 const before=Object.keys(stats()).length;
 await mount('/duel');
 assert.ok(text(view.toJSON()).includes('혼자 풀기'));
 await mount('/duel/solo?s=all');
 assert.ok(text(view.toJSON()).includes('혼자 풀기 · 전체 과목'));
 assert.ok(!text(view.toJSON()).includes('링크 복사'),'solo has no share link');
 await act(()=>find('시작하기').props.onClick());
 for(let n=0;n<10;n++){
  await act(()=>view.root.findAll(n=>n.type==='button'&&n.props.className?.startsWith('exam-opt'))[0].props.onClick());
  await act(()=>(find('다음')||find('결과 보기')).props.onClick());
 }
 assert.ok(text(view.toJSON()).includes('첫 기록을 세웠습니다!'),'first solo run sets a record');
 assert.ok(Object.keys(stats()).length>=before+9,'solo answers are saved to topics progress');
 assert.ok(JSON.parse(localStorage.getItem('duel:solo-best')).all,'solo best is saved per subject');
 await act(()=>find('새 문제로 한 번 더').props.onClick());
 assert.ok(text(view.toJSON()).includes('1 / 10'),'again starts a new round');
 console.log('Duel passed: auto-join without starting, waiting participant, win/loss/draw results, cumulative record and win rate, answers saved to progress without double counting, solo mode with best record.');
}finally{if(view)await act(()=>view.unmount());await server.close();}
