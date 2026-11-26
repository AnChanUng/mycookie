import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
const oldError = console.error;
const errors = [];
console.error = (...args) => { if (!String(args[0]).startsWith('react-test-renderer is deprecated')) errors.push(args.join(' ')); };
let view;
const text = node => typeof node === 'string' ? node : (Array.isArray(node) ? node : node?.children || []).map(text).join('');
try {
  const { default: StudyNotice } = await server.ssrLoadModule('/src/components/StudyNotice.jsx');
  // 공지에 바로가기 링크가 있어 라우터 안에서 그린다
  const Notice = () => React.createElement(MemoryRouter, null, React.createElement(StudyNotice));
  const { daysLeft, loadExams, saveExams, examFor } = await server.ssrLoadModule('/src/schedule.js');
  assert.deepEqual(loadExams(), [], 'new visitors start without schedules');
  values.set('study:exams', JSON.stringify([{name:'기업은행',date:'2099-10-17',to:'/exam/ibk'},{name:'코스콤',date:'2099-10-24'}]));
  assert.deepEqual(loadExams(), [], 'existing browser schedules are cleared');
  assert.equal(values.has('study:exams'), false);
  assert.equal(examFor('/exam/ibk'), null, 'removed schedules do not create a study goal');
  const added = [{name:'새 시험',date:'2099-12-01',to:'/exam/ibk'}];
  saveExams(added);
  assert.deepEqual(loadExams(), added, 'newly added schedules survive reload');
  assert.equal(examFor('/exam/ibk').name, '새 시험');
  values.set('study:exams:v2', 'broken-json');
  assert.deepEqual(loadExams(), [], 'corrupt storage never restores old defaults');
  assert.equal(daysLeft('2026-10-17', new Date('2026-10-14T15:00:00Z')), 2);
  assert.equal(daysLeft('2026-10-17', new Date('2026-10-16T15:00:00Z')), 0);
  assert.equal(daysLeft('2026-10-17', new Date('2026-10-17T15:00:00Z')), -1);
  assert.equal(daysLeft('2026-02-30'), null);
  assert.equal(daysLeft(''), null);
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  saveExams([{name:'오늘 시험',date:today},{name:'지난 시험',date:'2000-01-01'},{name:'잘못된 날짜',date:'invalid'}]);
  const modal = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  await act(()=>{view=TestRenderer.create(React.createElement(Notice),{createNodeMock: el => el.type==='dialog' ? modal : null});});
  assert.equal(modal.open,true,'Notice opens on first render');
  // 공지는 짧게 한 가지 소식만: 제목 하나와 바로가기 하나, 긴 목록은 없다
  assert.equal(view.root.findAllByType('h2').length, 1, 'Notice has one headline');
  assert.ok(text(view.root.findByType('h2')).trim().length > 0);
  assert.equal(view.root.findAllByType('li').length, 0, 'Notice has no long item list');
  assert.ok(!text(view.toJSON()).includes('오늘 시험'));
  assert.ok(!text(view.toJSON()).includes('D-DAY'));
  assert.ok(!text(view.toJSON()).includes('지난 시험'));
  assert.ok(!text(view.toJSON()).includes('잘못된 날짜'));
  await act(()=>view.root.findAllByType('button').find(b=>text(b)==='닫기').props.onClick());
  assert.equal(modal.open,false);
  saveExams([]);
  await act(()=>view.unmount());
  await act(()=>{view=TestRenderer.create(React.createElement(Notice),{createNodeMock: el => el.type==='dialog' ? modal : null});});
  assert.equal(modal.open,true);
  await act(()=>view.root.findAllByType('button').find(b=>text(b)==='다시 보지 않기').props.onClick());
  assert.equal(modal.open,false);
  await act(()=>view.unmount());
  await act(()=>{view=TestRenderer.create(React.createElement(Notice),{createNodeMock: el => el.type==='dialog' ? modal : null});});
  assert.equal(modal.open,false,'Dismissal survives remount');
  assert.ok(!view.root.findAllByType('button').some(b=>text(b)==='공지사항'),'No separate notice launcher');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS: Automatic notice, close, persistent dismissal, no launcher; schedule reset, new schedule persistence and date regressions.');
} finally {
  if(view) await act(()=>view.unmount());
  await server.close();
  console.error=oldError;
}
