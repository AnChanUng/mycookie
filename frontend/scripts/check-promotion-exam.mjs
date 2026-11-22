import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';
const memory = () => { const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)}; };
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.localStorage=memory();globalThis.sessionStorage=memory();globalThis.window=new EventTarget();
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
const original=console.error,errors=[];
console.error=(...args)=>{if(!String(args[0]).startsWith('react-test-renderer is deprecated'))errors.push(args.join(' '));};
let view,failSubmit=true,starts=0,submits=0,lastRequest;
const text=node=>typeof node==='string'?node:(Array.isArray(node)?node:node?.children||[]).map(text).join('');
try {
  const {default:api}=await server.ssrLoadModule('/src/api.js');
  const {default:Menu}=await server.ssrLoadModule('/src/components/MemberMenu.jsx');
  const {default:Page}=await server.ssrLoadModule('/src/pages/PromotionExamPage.jsx');
  const questions=Array.from({length:30},(_,i)=>({id:'q'+i,group:i<6?'os':i<12?'net':i<18?'db':i<24?'arch':i<26?'c':i<28?'java':'python',q:'문항 '+i,topic:'기존 문제',o:['보기 하나','보기 둘','보기 셋','보기 넷']}));
  const paper={id:'attempt-a',questions,result:null};
  api.defaults.adapter=async config=>{
    assert.ok(config.headers['X-Visitor-Id']);
    let data;
    if(config.url==='/membership') data={tier:'GOLD',division:paper.result?4:5,tierName:paper.result?'금 쿠키 Ⅳ':'금 쿠키 Ⅴ',nickname:'시험응시자',solvedCount:0};
    else if(config.url==='/promotion-exams'){starts++;data=paper;}
    else if(config.url.endsWith('/submit')){
      submits++;lastRequest=JSON.parse(config.data);
      if(failSubmit)throw new Error('offline');
      data={correct:29,total:30,score:96.7,passed:true,promoted:true,tierName:'금 쿠키 Ⅳ',review:questions.map(q=>({id:q.id,answer:1,selected:lastRequest.answers[q.id],correct:true,explanation:'해설'}))};
      paper.result=data;
    } else data=paper;
    return {data,status:200,statusText:'OK',headers:{},config};
  };
  const mount=async()=>{await act(async()=>{view=TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(React.Fragment,null,React.createElement(Menu),React.createElement(Page))));});};
  const button=label=>view.root.findAllByType('button').find(b=>text(b).includes(label));
  // 계정 메뉴의 등급 배지는 로그인한 계정에만 보인다
  localStorage.setItem('sync:account',JSON.stringify({token:'exam-user',nickname:'시험응시자'}));
  await mount();await act(async()=>{await button('시험 시작').props.onClick();});
  assert.equal(view.root.findAllByProps({'aria-label':'등급 금 쿠키 Ⅴ'}).length,1);
  assert.equal(starts,1);assert.equal(view.root.findAllByType('fieldset').length,30);
  assert.equal(button('시험 제출').props.disabled,true);
  assert.equal(view.root.findAllByProps({className:'promotion-review'}).length,0);
  // Each event must observe the latest rendered state.
  for(let i=0;i<30;i++)await act(()=>view.root.findAllByType('fieldset')[i].findAllByType('input')[1].props.onChange());
  assert.equal(button('시험 제출').props.disabled,false);
  await act(()=>view.unmount());await mount();
  assert.equal(view.root.findAllByType('input').filter(i=>i.props.checked).length,30);
  await act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){}});});
  assert.ok(text(view.toJSON()).includes('답안은 유지됩니다'));
  assert.equal(view.root.findAllByType('input').filter(i=>i.props.checked).length,30);
  failSubmit=false;
  await act(async()=>{await view.root.findByType('form').props.onSubmit({preventDefault(){}});});
  assert.equal(submits,2);assert.equal(Object.keys(lastRequest.answers).length,30);
  assert.equal(lastRequest.score,undefined);
  assert.ok(text(view.toJSON()).includes('금 쿠키 Ⅳ 승급 완료'));
  assert.equal(view.root.findAllByProps({'aria-label':'등급 금 쿠키 Ⅳ'}).length,1);
  assert.equal(view.root.findAllByProps({className:'promotion-review'}).length,30);
  await act(()=>view.unmount());await mount();
  assert.ok(text(view.toJSON()).includes('금 쿠키 Ⅳ 승급 완료'));
  assert.equal(view.root.findAllByProps({'aria-label':'등급 금 쿠키 Ⅳ'}).length,1);
  assert.equal(starts,1);
  await act(()=>view.unmount());view=null;
  assert.deepEqual(errors,[]);
  console.log('Promotion exam passed: 30 questions, complete-answer requirement, saved answers/resume, retry without lost answers, server result and review, no client score submission.');
}finally{if(view)await act(()=>view.unmount());await server.close();console.error=original;}
