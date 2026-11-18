import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

globalThis.localStorage = { getItem: () => null };
const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
try {
  const render = C => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(C)));
  const { default: Web } = await server.ssrLoadModule('/src/pages/WebPage.jsx');
  const web = render(Web);
  assert.ok(web.includes('href="/web/spring"'));
  assert.ok(web.includes('웹 필수지식'));
  assert.ok(web.includes('href="/web-essentials"'));
  const { WEB_ESSENTIALS } = await server.ssrLoadModule('/src/data/webEssentials.js');
  assert.equal(WEB_ESSENTIALS.items.length, 57);
  const { default: Aptitude } = await server.ssrLoadModule('/src/pages/AptitudePage.jsx');
  const aptitude = render(Aptitude);
  for (const title of ['NCS/인적성', 'SKCT', '삼성 GSAT']) assert.ok(aptitude.includes(title), title);
  assert.ok(aptitude.includes('href="/ncs"'));
  const { COMPANIES, companyPath } = await server.ssrLoadModule('/src/data/examQuestions.js');
  const spring = COMPANIES.find(c => c.key === 'spring');
  assert.equal(companyPath(spring), '/web/spring');
  assert.equal(spring.questions.length, 60);
  const home = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8');
  const destinations = [...home.matchAll(/\{ to: '([^']+)'/g)].map(m => m[1]);
  assert.deepEqual(destinations, ['/exam', '/aptitude', '/web', '/tech-blogs']);
  console.log('PASS: merged NCS/aptitude, third web menu, Spring 60 questions, 57 web answers available');
} finally { await server.close(); }
