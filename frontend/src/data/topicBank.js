// 주제별 통합 문제집: 기업별 문제은행과 컴퓨터일반에 흩어진 객관식 문제를 과목으로 다시 묶는다.
// 문제를 새로 만들지 않고 기존 문제를 그대로 가져오며, 풀이 기록은 원래 문제은행과 따로('topics') 쌓인다.
import { COMPANIES, allQuestions } from './examQuestions';

const SUBJECTS = {
  db:  { name: '데이터베이스', short: 'DB', sub: '정규화 · 트랜잭션 · SQL · 인덱스 · 회복' },
  os:  { name: '운영체제·컴퓨터구조', short: 'OS', sub: '스케줄링 · 교착상태 · 메모리 · 캐시 · 논리회로' },
  net: { name: '네트워크', short: 'NW', sub: 'OSI · TCP/IP · 서브넷 · 라우팅 · 데이터통신' },
  ds:  { name: '자료구조·알고리즘', short: '자료', sub: '트리 · 해시 · 정렬 · 탐색 · 그래프 · 복잡도' },
  sec: { name: '정보보호', short: '보안', sub: '암호 · 전자서명 · 공격 기법 · 접근 통제 · 네트워크 보안' },
  se:  { name: '소프트웨어공학', short: 'SE', sub: '생명주기 · 설계 · UML · 테스트 · 프로젝트 관리' },
  pl:  { name: '프로그래밍', short: 'PL', sub: 'C · Java · Python 실행 결과 · 언어론 · 객체지향' },
  bd:  { name: '빅데이터·AI·신기술', short: '신기술', sub: '분석 기획 · 통계 · 머신러닝 · 클라우드 · 블록체인' },
};

// 영역 이름(없으면 문제의 주제)으로 과목을 정한다. 위에서부터 처음 맞는 과목을 쓴다
const RULES = [
  ['sec', /보안|정보보호|암호|침해/],
  ['db', /데이터베이스|DB|SQL/],
  ['net', /네트워크|통신|인터넷|TCP/],
  ['se', /소프트웨어 ?공학|SW ?공학|소프트웨어 설계/],
  ['ds', /자료구조|알고리즘/],
  ['pl', /프로그래밍|언어론|Java|Python|C\+\+|객체지향/],
  ['os', /운영체제|OS|컴퓨터 ?구조|논리회로|자료 표현|전자계산기/],
  ['bd', /빅데이터|AI|인공지능|신기술|최신IT/],
];
const subjectOf = (text) => RULES.find(([, re]) => re.test(text || ''))?.[0];

// 전산 전공 필기가 아닌 문제은행(NCS · 인적성 · 경제/금융상식 · SSAFY 서술형 · Spring 같은 개발 스택)은 뺀다
const SOURCES = [...COMPANIES.filter(c => c.ready && c.category !== 'aptitude' && c.category !== 'major' && c.category !== 'monthly' && c.category !== 'stack' && c.category !== 'csnote')];

const QUESTIONS = SOURCES.flatMap(bank => allQuestions(bank)
  .filter(q => !q.kind && Array.isArray(q.o))
  .map(q => {
    const sec = subjectOf(bank.sections?.[q.sec]?.name) || subjectOf(q.topic);
    // 같은 번호가 문제은행마다 있으므로 문제은행 키를 앞에 붙여 구분한다
    return sec ? { ...q, id: `${bank.key}:${q.id}`, sec, topic: `${q.topic} · ${bank.abbr}` } : null;
  })
  .filter(Boolean));

const count = (k) => QUESTIONS.filter(q => q.sec === k).length;

export const TOPICS = {
  key: 'topics', abbr: '주제별', name: '주제별 통합 문제집', ready: true,
  meta: `${Object.keys(SUBJECTS).length}개 과목 · ${QUESTIONS.length}문항 · 4·5지선다`,
  questions: QUESTIONS,
  sections: Object.fromEntries(Object.entries(SUBJECTS).map(([k, s]) => [k, { ...s, count: count(k) }])),
  minutes: 50,
  examSub: '과목마다 5문제씩 뽑아 출제',
  draw: Object.fromEntries(Object.keys(SUBJECTS).map(k => [k, 5])),
  // 과목마다 문제가 수백 개라 한 번에 이만큼씩만 낸다. 안 푼 문제 → 틀린 문제 → 맞힌 문제 순으로 뽑는다
  practiceSize: 20,
  lede: `기업별 문제집과 컴퓨터일반에 흩어져 있는 객관식 ${QUESTIONS.length}문항을 과목별로 다시 묶었습니다. 특정 기업을 정하지 않았거나 한 과목만 집중해서 풀고 싶을 때 씁니다. 영역별 연습은 과목마다 20문제씩, 아직 안 푼 문제부터 나옵니다. 모의고사는 과목마다 5문제씩 40문제를 뽑습니다. 문제마다 출처 기업이 주제 옆에 표시되고, 여기서 푼 기록은 기업별 문제집의 기록과 따로 쌓입니다.`,
};
