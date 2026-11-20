import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';
import { BANKS } from '../src/data/examQuestions.js';

// In-memory test doubles only: no browser, user storage, or live backend is accessed.
const memory = () => { const values=new Map(); return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k),clear:()=>values.clear(),key:i=>[...values.keys()][i],get length(){return values.size;}}; };
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.localStorage=memory();
globalThis.sessionStorage=memory();
globalThis.window=Object.assign(new EventTarget(),{location:{search:'?resume=1',pathname:'/exam/pearl',host:'test.invalid'},scrollTo:()=>{},matchMedia:()=>({matches:false})});
globalThis.document=Object.assign(new EventTarget(),{referrer:''});
globalThis.confirm=()=>true;
globalThis.alert=()=>{};
const originalError=console.error;
const errors=[];
console.error=(...args)=>{if(String(args[0]).startsWith('react-test-renderer is deprecated'))return;errors.push(args.join(' '));originalError(...args);};
const server=await createServer({server:{middlewareMode:true},appType:'custom'});
let view;
const text=node=>typeof node==='string'?node:(node?.children||[]).map(text).join('');
const button=label=>view.root.findAllByType('button').find(b=>text(b)===label);
const click=async b=>{assert.ok(b,'button missing');assert.ok(!b.props.disabled,'button disabled');await act(()=>b.props.onClick());};
const stored=()=>JSON.parse(localStorage.getItem('exam-progress:pearl'));
try {
 const {default:api}=await server.ssrLoadModule('/src/api.js');
 const requests=[];
 api.defaults.adapter=async config=>{requests.push(config.url);return {data:{},status:200,statusText:'OK',headers:{},config};};
 const {CompanyExam,ReviewCard}=await server.ssrLoadModule('/src/pages/ExamCompanyPage.jsx');
 const {MemoryRouter}=await import('react-router-dom');
 const bank=BANKS.find(b=>b.key==='pearl');
 const mount=async()=>{await act(()=>{view=TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(CompanyExam,{company:bank})));});};
 const seed=(mode,ids)=>localStorage.setItem('exam-resume:pearl',JSON.stringify({mode,sec:'net',ids,idx:0,answers:{},revealed:{},texts:{},peeked:{},elapsed:0}));
 seed('practice',bank.questions.map(q=>q.id));await mount();
 // Bookmark state persists without being treated as an answered question.
 await click(view.root.findAllByType('button').find(b=>b.props.title==='북마크 (나중에 다시 보기)'));
 assert.equal(stored().marks.pa01.on,true);assert.deepEqual(stored().stats,{});
 for(let i=0;i<50;i++) {
  const q=bank.questions[i];assert.ok(text(view.toJSON()).includes(q.q));
  const correct=i%2===0;
  if(q.kind) {
   await act(()=>view.root.findByType('textarea').props.onChange({target:{value:'테스트 답안 '+i}}));
   await click(button('답안 확인'));
   assert.ok(text(view.toJSON()).includes(q.ans));
   for(const point of q.pts)assert.ok(text(view.toJSON()).includes(point));
   await click(button(correct?'맞았어요':'틀렸어요'));
  } else {
   const opts=view.root.findAllByType('button').filter(b=>(b.props.className||'').split(' ').includes('exam-opt'));
   await click(opts[correct?q.a:(q.a+1)%5]);
   assert.ok(text(view.toJSON()).includes(q.explanation));
   assert.ok(view.root.findAllByType('button').filter(b=>(b.props.className||'').split(' ').includes('exam-opt')).every(b=>b.props.disabled));
  }
  assert.ok(text(view.toJSON()).includes(q.e));
  assert.equal(stored().stats[q.id].last,correct?'r':'w');
  assert.equal(stored().stats[q.id].c+stored().stats[q.id].w,1);
  if(i===5){ // saved answers and explanation must survive unmount/remount
   await act(()=>view.unmount());await mount();
   assert.ok(text(view.toJSON()).includes(q.explanation));
   assert.equal(JSON.parse(localStorage.getItem('exam-resume:pearl')).idx,5);
  }
  await click(button(i===49?'결과 보기':'다음'));
 }
 assert.equal(stored().history.at(-1).score,25);assert.equal(stored().history.at(-1).total,50);
 assert.equal(localStorage.getItem('exam-resume:pearl'),null);
 assert.ok(text(view.toJSON()).includes('채점 결과'));
 assert.ok(button('틀린 25문제 바로 다시 풀기'));
 await click(button('틀린 25문제 바로 다시 풀기'));
 assert.equal(JSON.parse(localStorage.getItem('exam-resume:pearl')).ids.length,25);
 await act(()=>view.unmount());
 // Exam mode must defer recording until submission, including self-graded essays.
 localStorage.clear();seed('exam',['pa01','pa41']);await mount();
 await click(button('1GET·PUT·DELETE'));assert.equal(stored(),null);
 await click(button('다음'));await click(button('답안 확인'));await click(button('맞았어요'));
 assert.equal(stored(),null);await click(button('제출하고 채점'));
 assert.equal(stored().history[0].score,2);assert.equal(stored().stats.pa41.c,1);
 await act(()=>view.unmount());
 // Old time limits no longer submit exams. Only manual submission records results.
 localStorage.clear();seed('exam',['pa01','pa41']);
 await act(()=>{view=TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(CompanyExam,{company:{...bank,minutes:0}})));});
 await act(async()=>{await new Promise(resolve=>setTimeout(resolve,1100));});
 assert.equal(stored(),null,'No automatic submission at the former deadline');
 assert.ok(!view.root.findAllByType('span').some(n=>(n.props.className||'').split(' ').includes('timer')));
 assert.equal(JSON.parse(localStorage.getItem('exam-resume:pearl')).elapsed,undefined,'Elapsed time is no longer measured');
 await click(button('다음'));
 await click(button('제출하고 채점'));
 assert.equal(stored().history[0].score,0);assert.equal(stored().history[0].total,2);
 assert.equal(stored().stats.pa41.last,'w');assert.equal(localStorage.getItem('exam-resume:pearl'),null);
 await act(()=>view.unmount());
 // 서비스기업 분류는 기업별 목록에서 숨겼으므로 /exam으로 돌려보낸다(문제집은 /exam/pearl로 바로 열 수 있다).
 const {default:ExamList}=await server.ssrLoadModule('/src/pages/ExamListPage.jsx');
 const {Routes,Route}=await import('react-router-dom');
 await act(()=>{view=TestRenderer.create(React.createElement(MemoryRouter,{initialEntries:['/exam/category/tech']},React.createElement(Routes,null,React.createElement(Route,{path:'/exam/category/:category',element:React.createElement(ExamList)}),React.createElement(Route,{path:'/exam',element:'exam-home'}))));});
 assert.equal(text(view.toJSON()),'exam-home');
 await act(()=>view.unmount());
 // Review states: right, wrong, unanswered for all 50 questions.
 for(const q of bank.questions) for(const a of [undefined,q.kind?'r':q.a,q.kind?'w':(q.a+1)%5]) {
  await act(()=>{view=TestRenderer.create(React.createElement(ReviewCard,{q,a,sections:bank.sections}));});
  assert.ok(text(view.toJSON()).includes(q.e));
  assert.ok(!view.root.findAllByType('a').some(a=>String(a.props.href).startsWith('/question/')));
  await act(()=>view.unmount());
 }
 const {default:Similar}=await server.ssrLoadModule('/src/components/SimilarQuestion.jsx');
 const q=bank.questions.find(q=>q.id==='pa19');
 await act(()=>{view=TestRenderer.create(React.createElement(Similar,{q}));});
 await click(view.root.findByType('button'));
 let opts=view.root.findAllByType('button').filter(b=>(b.props.className||'').includes('exam-opt'));
 assert.ok(opts.length>=4);await click(opts[0]);
 // 해설은 항상 보이고, 상세 해설은 있는 문제만 붙는다(상세 해설이 없는 문제은행도 있다)
 const similarEx=view.root.findByProps({className:'exam-similar-ex'});
 assert.ok(text(similarEx).trim().length>10,'similar question shows its explanation');
 if(button('하나 더')) {await click(button('하나 더'));opts=view.root.findAllByType('button').filter(b=>(b.props.className||'').includes('exam-opt'));assert.ok(opts.every(b=>!b.props.disabled));}
 await act(()=>view.unmount());view=null;
 assert.ok(requests.every(url=>url==='/track'),'Unexpected backend API invocation');
 assert.deepEqual(errors,[],'React errors');
 console.log('Interaction tests passed: 50 answers, resume, result/25 wrong retry, deferred exam scoring, timeout/unanswered, bookmarks, hidden service category redirect, 150 review states, similar-question retry. Live network disabled.');
} finally {
 if(view)await act(()=>view.unmount());
 await server.close();console.error=originalError;
}
