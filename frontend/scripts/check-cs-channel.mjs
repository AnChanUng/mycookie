import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createServer } from 'vite';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const server=await createServer({server:{middlewareMode:true},appType:'custom',optimizeDeps:{noDiscovery:true}});
let view;
try {
 const {default:api}=await server.ssrLoadModule('/src/api.js');
 const {default:Panel}=await server.ssrLoadModule('/src/components/CsChannelAdmin.jsx');
 const calls=[];
 api.defaults.adapter=async config=>{
  calls.push([config.method,config.url,config.data]);
  assert.equal(config.headers['X-Admin-Key'],'test-key');
  let data={enabled:false,configured:true,index:0,joinUrl:'',version:0,catalog:[{title:'HTTP',id:'http'}],deliveries:[]};
  if(config.url.endsWith('/preview')) data={text:'HTTP 학습 본문'};
  if(config.url.endsWith('/test')) data={status:'SENT'};
  return {data,status:200,statusText:'OK',headers:{},config};
 };
 await act(async()=>{view=TestRenderer.create(React.createElement(Panel,{headers:{'X-Admin-Key':'test-key'}}));});
 const text=n=>typeof n==='string'?n:(n?.children||[]).map(text).join('');
 const button=name=>view.root.findAllByType('button').find(b=>text(b)===name);
 await act(async()=>button('미리보기').props.onClick());
 assert.ok(text(view.toJSON()).includes('HTTP 학습 본문'));
 await act(async()=>button('테스트 발송').props.onClick());
 assert.ok(text(view.toJSON()).includes('SENT'));
 assert.equal(calls.filter(c=>c[1]==='/admin/cs-channel/test').length,1);
 assert.equal(calls.filter(c=>c[1]==='/admin/cs-channel/send').length,0);
 console.log('CS channel panel passed: authenticated preview, explicit test send, no automatic daily send.');
} finally {if(view) await act(()=>view.unmount());await server.close();}
