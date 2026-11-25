// 전공노트(CS 노트) 기반 문제. 노트마다 객관식 1문제와, 답이 용어 하나로 정해지면 단답형 1문제를 둔다.
// 단답형은 허용 답안(acc)과 글자가 같을 때만 정답이다(띄어쓰기·대소문자·괄호·점은 무시).
import { CS_NOTES } from './csNotes';
import { CS_NOTE_PART1 } from './csNoteQuestions1';
import { CS_NOTE_PART2 } from './csNoteQuestions2';
import { placeAnswer } from './noteQuizPlace';
import { CS_NOTE_TOPICS } from './csNoteTopics';

// 전공노트 과목(source-…)을 문제집 영역으로 쓴다. 문항이 적은 과목은 가까운 영역으로 묶는다
const AREA = {
  'source-d09e977b090b': 'network',
  'source-8143161f55aa': 'os',
  'source-cb53ca6fdafa': 'db',
  'source-ac3ae07b543f': 'algo',
  'source-6802155862a6': 'security',
  'source-d41a09d4fd4f': 'algo',
  'source-c1ba60ce1358': 'java',
  'source-db29e82a9287': 'spring',
  'source-e85d998148c5': 'spring',
  'source-09a27433c354': 'lang',
  'source-18885f27b5af': 'lang',
  'source-65616bf93566': 'eng',
  'source-b9691ec4af83': 'eng',
  'source-bc19d3b3c9e4': 'eng',
  'source-fd1f092afc61': 'infra',
  'source-0ccbd8486b25': 'infra',
  'source-e491b4631422': 'infra',
  bigdata: 'bigdata',
};

export const CS_NOTE_SECTIONS = {
  network: { name: '네트워크', short: '네트워크' },
  os: { name: '운영체제', short: 'OS' },
  db: { name: '데이터베이스', short: 'DB' },
  algo: { name: '자료구조 · 알고리즘', short: '자료구조' },
  security: { name: '암호학 · 보안', short: '보안' },
  java: { name: 'Java', short: 'Java' },
  spring: { name: 'Spring · JPA', short: 'Spring' },
  lang: { name: 'Python · Node.js', short: '언어' },
  eng: { name: '설계 · 테스트', short: '설계' },
  infra: { name: '인프라 · DevOps', short: '인프라' },
  bigdata: { name: '빅데이터', short: '빅데이터' },
};

const topicOf = n => CS_NOTE_TOPICS[n.id.replace(/^ksundong-/, '')] || n.title;
const noteInfo = Object.fromEntries(CS_NOTES.flatMap(s => s.items.map(n => [n.id, { title: topicOf(n), sec: AREA[s.id] }])));

// 각 파트는 [노트 id, 객관식, 단답형?] 묶음을 내보낸다.
// 객관식: { q, o: [보기 4개], a: 정답 번호(0부터), e: 해설 } / 단답형: { q, ans, acc: [허용 답안], e }
const build = ([note, mc, sa]) => {
  const info = noteInfo[note] || { title: note, sec: 'eng' };
  const base = { sec: info.sec, topic: info.title, note, link: `/notes#${note}` };
  const list = [placeAnswer({ ...base, id: `cn-${note}-o`, ...mc })];
  if (sa) list.push({ ...base, id: `cn-${note}-s`, kind: 'short', strict: true, a: 0, ...sa });
  return list;
};

export const CS_NOTE_QUESTIONS = [...CS_NOTE_PART1, ...CS_NOTE_PART2].flatMap(build);
