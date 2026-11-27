import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
const bankPath = new URL('../src/data/interviewPractice.js', import.meta.url);
assert.ok(existsSync(bankPath), '면접 연습 전용 질문 은행이 있어야 한다');
const { PERSONAL_QUESTIONS, TECH_QUESTIONS, drawQuestion } = await import(bankPath);
assert.deepEqual(['기본 질문', '직무/회사 질문', '개발 공통 질문'].map(c => PERSONAL_QUESTIONS.filter(q => q.category === c).length), [17, 13, 19]);
assert.equal(new Set(PERSONAL_QUESTIONS.map(q => q.original)).size, 49);
assert.ok(PERSONAL_QUESTIONS.some(q => q.original.includes('디버깅')));
assert.ok(PERSONAL_QUESTIONS.every(q => q.text && q.original && q.id.startsWith('personal-v2-')));
assert.equal(new Set(TECH_QUESTIONS.map(q => q.id)).size, TECH_QUESTIONS.length);
assert.ok(TECH_QUESTIONS.some(q => q.source === 'cs') && TECH_QUESTIONS.some(q => q.source === 'web'));
assert.ok(TECH_QUESTIONS.every(q => q.answer.length > 30 && q.noteLink && q.text));
assert.ok(TECH_QUESTIONS.every(q => !q.answer.includes('|') && !q.answer.includes('~~~')), '구술 답변에 표나 코드 블록을 남기지 않는다');
const pool = PERSONAL_QUESTIONS.filter(q => q.category === '직무/회사 질문');
let seen = [], current;
for (let i = 0; i < pool.length; i++) {
  current = drawQuestion(pool, seen, () => 0);
  assert.ok(current && !seen.includes(current.id));
  seen.push(current.id);
}
assert.equal(drawQuestion(pool, seen), null, '소진 뒤 임의로 중복 출제하지 않는다');
assert.equal(drawQuestion([], []), null);
assert.ok(drawQuestion(TECH_QUESTIONS, seen));
console.log(`PASS: 원문 49개 (17/13/19), 기술 ${TECH_QUESTIONS.length}개, 고유 ID·답변·노트 링크, 무중복 출제와 소진·빈 목록`);

const { default: React } = await import('react');
const { default: TestRenderer, act } = await import('react-test-renderer');
const { MemoryRouter } = await import('react-router-dom');
const { createServer } = await import('vite');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const records = new Map([['notes:done:v1:guest', '{"old-id":true}'], ['tech-interview:drafts:v1:guest', '{"old":"답변"}']]);
const before = [...records];
globalThis.localStorage = { getItem: k => records.get(k) ?? null, setItem: (k,v) => records.set(k,v), removeItem: k => records.delete(k) };
globalThis.window = new EventTarget();
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'silent' });
const text = n => typeof n === 'string' ? n : (n?.children || []).map(text).join('');
let view;
try {
  const { default: api } = await server.ssrLoadModule('/src/api.js');
  api.defaults.adapter = async config => ({ data: { available: false }, status: 200, statusText: 'OK', headers: {}, config });
  const { default: Page } = await server.ssrLoadModule('/src/pages/InterviewPracticePage.jsx');
  await act(async () => { view = TestRenderer.create(React.createElement(MemoryRouter, null, React.createElement(Page))); });
  const button = label => view.root.findAll(n => n.type === 'button' && text(n) === label)[0];
  const change = async (label,value) => act(() => view.root.findByProps({'aria-label':label}).props.onChange({target:{value}}));
  assert.equal(view.root.findAllByProps({'aria-label':'질문 목차'}).length, 1, '웹노트처럼 질문 목차를 제공한다');
  assert.equal(view.root.findAllByProps({'aria-label':'랜덤 면접 연습'}).length, 1, '랜덤 출제 영역이 페이지 상단에 있다');
  assert.ok(!text(view.toJSON()).includes('카메라로 표정 확인하기') && !text(view.toJSON()).includes('질문 출처 · 이용 조건'));
  assert.equal(view.root.findByProps({'aria-label':'음성 답변 연습'}).props['data-phase'], 'idle');
  assert.ok(button('인성면접') && button('기술면접'), '두 모드를 선택할 수 있다');
  const drawn = new Set();
  const initial = text(view.root.findByProps({'data-testid':'interview-prompt'}));
  if (PERSONAL_QUESTIONS.some(q => q.category === '기본 질문' && q.text === initial)) drawn.add(initial);
  await change('질문 카테고리','기본 질문');
  while (drawn.size < 17) {
    const prompt = text(view.root.findByProps({'data-testid':'interview-prompt'}));
    assert.ok(!drawn.has(prompt), '다음 질문은 중복되지 않는다'); drawn.add(prompt);
    await act(() => button('다음 질문').props.onClick());
  }
  assert.ok(text(view.toJSON()).includes('선택한 범위의 질문을 모두 연습했습니다'));
  await act(() => button('이 범위 다시 연습').props.onClick());
  assert.ok(view.root.findByProps({'data-testid':'interview-prompt'}));
  await act(() => button('기술면접').props.onClick());
  const question = text(view.root.findByProps({'data-testid':'interview-prompt'}));
  assert.equal(view.root.findAllByProps({'aria-label':'구술형 모범답안'}).length, 0);
  await act(() => button('모범답안 보기').props.onClick());
  assert.ok(text(view.root.findByProps({'aria-label':'구술형 모범답안'})).length > 30);
  await act(() => button('다음 질문').props.onClick());
  assert.notEqual(text(view.root.findByProps({'data-testid':'interview-prompt'})), question);
  assert.equal(view.root.findAllByProps({'aria-label':'구술형 모범답안'}).length, 0, '다음 질문의 답안은 다시 접힌다');
  await change('노트 선택','web');
  assert.ok(text(view.toJSON()).includes('웹 ·'));
  await change('질문 카테고리','web:보안');
  assert.ok(text(view.toJSON()).includes('웹 · 보안'));
  await act(() => button('인성면접').props.onClick());
  await change('질문 카테고리','기본 질문');
  assert.ok(text(view.toJSON()).includes('기본 질문'));
  const reference = view.root.findAll(n => n.type === 'article' && String(n.props.id).startsWith('reference-') && n.findAll(child => child.type === 'button' && text(child) === '이 질문 연습').length)[0];
  const referenceText = text(reference.findByType('h3'));
  await act(() => reference.findByType('button').props.onClick());
  assert.equal(text(view.root.findByProps({'data-testid':'interview-prompt'})), referenceText, '노트에서 고른 질문으로 상단 녹음 연습을 시작한다');
  // 권한을 기다리는 동안에도 녹음 대상이 바뀌지 않아야 한다.
  let permission;
  globalThis.MediaRecorder = class {};
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: () => new Promise(resolve => { permission = resolve; }) } } });
  await act(() => { void button('녹음 시작').props.onClick(); });
  assert.ok(button('다음 질문').props.disabled && button('기술면접').props.disabled);
  assert.ok(view.root.findByProps({'aria-label':'질문 카테고리'}).props.disabled);
  await act(() => button('요청 취소').props.onClick());
  assert.ok(!button('다음 질문').props.disabled);
  let stopped = false;
  await act(async () => { permission({ getTracks: () => [{ stop() { stopped = true; } }] }); });
  assert.ok(stopped, '취소 후 늦게 허용된 마이크를 해제한다');
  assert.deepEqual([...records], before, '기존 학습·답변 기록을 쓰거나 지우지 않는다');
  console.log('PASS: 화면 모드·카테고리·노트 선택, 17회 무중복·소진·재시작, 모범답안 숨김·초기화, 기존 기록 보존');
} finally {
  if (view) await act(() => view.unmount());
  await server.close();
}
