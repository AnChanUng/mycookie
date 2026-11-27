import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {createServer} from 'vite';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.localStorage={getItem:()=>null};
globalThis.sessionStorage={getItem:()=>null};
globalThis.window=new EventTarget();
const server=await createServer({server:{middlewareMode:true},appType:'custom',logLevel:'silent'});
const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join('');
let view;
try {
 const {default:api}=await server.ssrLoadModule('/src/api.js');
 const {default:Admin}=await server.ssrLoadModule('/src/pages/AdminPage.jsx');
 let denied=false;
 api.defaults.adapter=async config=>{
   if(config.url==='/admin/usage'&&denied) throw {response:{status:401}};
   const summary={views:20,visitors:10,exams:4};
   const data=config.url==='/admin/usage'?{days:config.params.days,range:summary,today:summary,week:summary,all:summary,newToday:2,active:1,studying:1,daily:[],hours:Array(24).fill(0),devices:[],pages:[],clicks:[],solves:[],scores:[],exams:[],visitors:[],referrers:[],recent:[],server:{events:20}}
    :config.url==='/public/metrics'?{registeredAccounts:12,asOf:'2026-11-27T00:00:00Z'}
    :config.url==='/admin/reports'?{open:2,last7d:2,total:2,items:[],top:[]}:null;
   return {data,status:200,statusText:'OK',headers:{},config};
 };
 const mount=async()=>act(async()=>{view=TestRenderer.create(React.createElement(MemoryRouter,null,React.createElement(Admin,{viaLogin:true})));});
 await mount();
 assert.equal(view.root.findAllByProps({'aria-label':'모니터링 메뉴'}).length,1);
 assert.ok(text(view.toJSON()).includes('많이 클릭한 기능'));
 const button=label=>view.root.findAll(n=>n.type==='button'&&text(n)===label)[0];
 await act(()=>button('개요').props.onClick());
 assert.ok(text(view.toJSON()).includes('일별 추이'));
 await act(()=>button('방문자').props.onClick());
 assert.ok(view.root.findByProps({'aria-label':'모니터링 메뉴'}));
 await act(()=>button('이용 분석').props.onClick());
 await act(()=>button('최근 7일').props.onClick());
 assert.ok(text(view.toJSON()).includes('최근 7일의 행동 기록'));
 assert.ok(button('최근 7일').props['aria-pressed']);
 assert.equal(view.root.findAllByProps({className:'admin-public-metrics'}).length,1);
 await act(()=>view.unmount());view=null;
 denied=true;await mount();
 assert.ok(text(view.toJSON()).includes('관리자 권한이 없거나'));
 assert.ok(text(view.toJSON()).includes('자료를 갱신하지 못했습니다.'));
 assert.ok(!text(view.toJSON()).includes('자료를 불러오는 중입니다.'));
 assert.equal(view.root.findAllByProps({'aria-label':'이용 분석'}).length,0);
 console.log('PASS: 관리자 전체 셸·메뉴·탭·기간 선택·접힌 공개 지표·권한 오류');
} finally {if(view)await act(()=>view.unmount());await server.close();}
