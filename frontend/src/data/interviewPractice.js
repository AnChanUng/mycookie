import { CS_NOTES } from './csNotes';
import { WEB_ESSENTIALS } from './webEssentials';
import { ORAL_OVERRIDES } from './interviewOral';
export { PERSONAL_QUESTIONS } from './interviewPersonal';

// 원본 노트·ID·진도는 변경하지 않는다. 검토된 노트의 설명을 구술용으로 정리한다.
export function toInterviewQuestion(question) {
  const clean = question.replace(/\([^)]*(?:보충필요|알아만|간단한 정도|생각보다 어려움)[^)]*\)/g, '').trim();
  return clean.replace(/설명해(?:보세요|주세요)\.?/g, '설명해 주시겠습니까?')
    .replace(/설명하세요\.?/g, '설명해 주시겠습니까?')
    .replace(/말해주세요\.?/g, '말씀해 주시겠습니까?')
    .replace(/예를 들어주세요\.?/g, '예를 들어 주시겠습니까?')
    .replace(/아는대로/g, '알고 계신 내용을').replace(/\?\s*\?/g, '?');
}

export function toOralAnswer(markdown) {
  return markdown
    .replace(/(```|~~~)[\s\S]*?\1[^\n]*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '').replace(/[*`#]/g, '')
    .replace(/^\s*(?:[-•]|\d+\.)\s+/gm, '')
    .replace(/이다(?=[.!?\s]|$)/g, '입니다')
    .replace(/한다(?=[.!?\s]|$)/g, '합니다')
    .replace(/된다(?=[.!?\s]|$)/g, '됩니다')
    .replace(/있다(?=[.!?\s]|$)/g, '있습니다')
    .replace(/없다(?=[.!?\s]|$)/g, '없습니다')
    .replace(/다르다(?=[.!?\s]|$)/g, '다릅니다')
    .replace(/작다(?=[.!?\s]|$)/g, '작습니다')
    .replace(/크다(?=[.!?\s]|$)/g, '큽니다')
    .replace(/준다(?=[.!?\s]|$)/g, '줍니다')
    .replace(/나눈다(?=[.!?\s]|$)/g, '나눕니다')
    .replace(/쓴다(?=[.!?\s]|$)/g, '씁니다')
    .replace(/낮춘다(?=[.!?\s]|$)/g, '낮춥니다')
    .replace(/높인다(?=[.!?\s]|$)/g, '높입니다')
    .replace(/줄인다(?=[.!?\s]|$)/g, '줄입니다')
    .replace(/바꾼다(?=[.!?\s]|$)/g, '바꿉니다')
    .replace(/따른다(?=[.!?\s]|$)/g, '따릅니다')
    .replace(/모은다(?=[.!?\s]|$)/g, '모읍니다')
    .replace(/알린다(?=[.!?\s]|$)/g, '알립니다')
    .replace(/중요하다(?=[.!?\s]|$)/g, '중요합니다')
    .replace(/어렵다(?=[.!?\s]|$)/g, '어렵습니다')
    .replace(/돌아간다(?=[.!?\s]|$)/g, '돌아갑니다')
    .replace(/않는다(?=[.!?\s]|$)/g, '않습니다')
    .replace(/맞춘다(?=[.!?\s]|$)/g, '맞춥니다')
    .replace(/필요하다(?=[.!?\s]|$)/g, '필요합니다')
    .replace(/가깝다(?=[.!?\s]|$)/g, '가깝습니다')
    .replace(/아니다(?=[.!?\s]|$)/g, '아닙니다')
    .replace(/생긴다(?=[.!?\s]|$)/g, '생깁니다')
    .replace(/찾는다(?=[.!?\s]|$)/g, '찾습니다')
    .replace(/묶는다(?=[.!?\s]|$)/g, '묶습니다')
    .replace(/부풀려진다(?=[.!?\s]|$)/g, '부풀려집니다')
    .replace(/강하다(?=[.!?\s]|$)/g, '강합니다')
    .replace(/(문제|순서|위치|예|일부|관계|상태|표)다(?=[.!?\s]|$)/g, '$1입니다')
    .replace(/\n{3,}/g, '\n\n').trim();
}

const fromNote = (note, source, categoryId, category) => ({
  id: `practice-${source}-${note.id}`, noteId: note.id, source, categoryId, category,
  text: ({
    'ksundong-346ea3e9bb00d9fe': '브라우저 주소창에 HTTPS URL을 입력하면 화면이 표시되기까지 어떤 일이 일어나는지 설명해 주시겠습니까?',
    'ksundong-d21932e114664fbf': '얕은 복사와 깊은 복사의 차이를 예를 들어 설명해 주시겠습니까?',
    'ksundong-40fd823888047f17': '시간 복잡도는 무엇이며, 반복문과 이진 탐색의 시간 복잡도를 어떻게 계산하시는지 설명해 주시겠습니까?',
  })[note.id] || toInterviewQuestion(note.question),
  answer: ORAL_OVERRIDES[note.id] || toOralAnswer(note.answer),
  noteLink: `${source === 'cs' ? '/notes' : '/web-essentials'}#${note.id}`,
  sourceUrl: note.sourceUrl, references: note.references || [],
});

export const TECH_QUESTIONS = [
  ...CS_NOTES.flatMap(section => section.items.map(note => fromNote(note, 'cs', `cs:${section.id}`, `전공 · ${section.title}`))),
  ...WEB_ESSENTIALS.items.map(note => fromNote(note, 'web', `web:${note.topic}`, `웹 · ${note.topic}`)),
];

// 이미 출제된 ID를 모드·필터 변경 후에도 제외한다. 소진 뒤 재시작은 사용자가 선택한다.
export function drawQuestion(pool, seen, random = Math.random) {
  const used = new Set(seen);
  const remaining = pool.filter(q => !used.has(q.id));
  return remaining.length ? remaining[Math.floor(random() * remaining.length)] : null;
}
