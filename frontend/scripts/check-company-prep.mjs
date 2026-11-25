import assert from 'node:assert/strict';
import React from 'react';import R,{act} from 'react-test-renderer';import {MemoryRouter} from 'react-router-dom';import {createServer} from 'vite';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});let v;
try{
const {default:Page,selectFocus}=await server.ssrLoadModule('/src/pages/DeloitteAiFocusPage.jsx');
const {default:Hub}=await server.ssrLoadModule('/src/pages/CompanyPrepPage.jsx');
const total=selectFocus('전체','').length;assert.ok(total>=51,'문항이 줄지 않았는지');assert.ok(selectFocus('보안·협업','권한').length);
await act(async()=>{v=R.create(React.createElement(MemoryRouter,null,React.createElement(Page)));});
assert.equal(v.root.findAllByType('article').length,total);assert.equal(v.root.findAllByProps({className:'prep-answer'}).length,0);
await act(async()=>v.root.findAllByProps({className:'prep-answer-toggle'})[0].props.onClick());
assert.equal(v.root.findAllByProps({className:'prep-answer'}).length,1);
await act(async()=>v.root.findByType('input').props.onChange({target:{value:'no-such-question-xyz'}}));assert.equal(v.root.findAllByType('article').length,0);
await act(async()=>v.unmount());await act(async()=>{v=R.create(React.createElement(MemoryRouter,null,React.createElement(Hub)));});
assert.ok(v.root.findAllByType('a').some(a=>a.props.href==='/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9'));
console.log('PASS: company link, 24 JD + 27 basics, answers hidden, toggle, search');
}finally{if(v)await act(async()=>v.unmount());await server.close();}
