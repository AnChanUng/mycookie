// 비공개 문제집. 실제 응시 후기·복기 자료를 바탕으로 만든 문제집과 컴퓨터일반 문제집을 모은다.
// /private/chanung 에서 비밀번호를 확인한 뒤에만 동적으로 불러오므로 공개 화면의 번들에는 들어가지 않는다.
// 풀이 기록 키는 예전 공개 문제집과 같게 두어 이전 기록을 그대로 이어서 쓴다.
import { SECTIONS as HF_SECTIONS } from './examQuestions';
import { KORAIL_SECTIONS, EX_SECTIONS, KWATER_SECTIONS, KDN_SECTIONS, KICOX_SECTIONS } from './splitSections';
import { KORAIL_QUESTIONS } from './korailQuestions';
import { EX_QUESTIONS } from './exQuestions';
import { KWATER_QUESTIONS } from './kwaterQuestions';
import { KDN_QUESTIONS } from './kdnQuestions';
import { KICOX_QUESTIONS } from './kicoxQuestions';
import { KOSCOM_SECTIONS, KOSCOM_QUESTIONS } from './koscomQuestions';
import { IBK_SECTIONS, IBK_QUESTIONS } from './ibkQuestions';
import { KFSB_SECTIONS, KFSB_QUESTIONS } from './kfsbQuestions';
import { BNK_SECTIONS, BNK_QUESTIONS } from './bnkQuestions';
import { HF_RECALL_2026B } from './hfRecall2026bQuestions';
import { SSAFY_ALGO_SECTIONS, SSAFY_ALGO_QUESTIONS, SSAFY_ALGO_SETS } from './ssafyAlgoQuestions';
import { SSAFY_MONTHLY_SECTIONS, SSAFY_MONTHLY_QUESTIONS, SSAFY_MONTHLY_SETS } from './ssafyMonthlyQuestions';
import { COMIL as COMIL_BANK } from './comilQuestions';
import { COMIL_UNITS } from './comilUnits';
import { explanationKey } from './explanationLookup';
import privateNotes from './privateExplanations.json' with { type: 'json' };

// 비공개 문항의 상세 해설. 해설 키에 문항 본문이 들어 있어 공개 해설 파일과 나눠 두었다
const withNotes = (questions) => questions.map(q => {
  const note = !q.explanation && privateNotes[explanationKey(q)];
  return note ? { ...q, explanation: note } : q;
});

const recallSource = (label, file) => ({ kind: 'recall', label, ...(file ? { file } : {}) });

// 예상문제 회차는 공개 문제집에 남기고, 복기 기반 회차만 여기로 옮겼다
const SPLIT_RECALL = [
  { key: 'korail', abbr: 'KORAIL', name: '코레일 (복기 기반)', questions: KORAIL_QUESTIONS, sections: KORAIL_SECTIONS, minutes: 50, label: '2026 상반기 복기문제', file: '공기업 필기/2026 상반기 코레일.hwpx', lede: '2026 상반기 응시 후기에 복원된 문항(포렌식, 블록 암호 모드, 파이프라인·AMAT 계산, 관계대수, 서브넷 등)을 바탕으로 만든 40문제, 50분, 5지선다입니다.' },
  { key: 'ex', abbr: 'EX', name: '한국도로공사 (복기 기반)', questions: EX_QUESTIONS, sections: EX_SECTIONS, minutes: 50, label: '2026 상반기 복기문제', file: '공기업 필기/2026_한국도로공사_상반기전산전공.hwp', lede: '2026 상반기 응시 후기에 복원된 40문항의 주제와 보기 구성을 따라 만든 40문제, 50분, 5지선다입니다.' },
  { key: 'kwater', abbr: 'K-water', name: '한국수자원공사 (복기 기반)', questions: KWATER_QUESTIONS, sections: KWATER_SECTIONS, minutes: 40, label: '2026 상반기 복기문제', file: '공기업 필기/2026_한국수자원공사_상반기2차전산전공.hwp', lede: '2026 상반기 2차 응시 후기에 복원된 문항(C·Python·Java 코드, C-SCAN, LRU, 논리회로, RAID 등)을 바탕으로 만든 30문제, 40분, 4지선다입니다.' },
  { key: 'kdn', abbr: 'KDN', name: '한전KDN (복기 기반)', questions: KDN_QUESTIONS, sections: KDN_SECTIONS, minutes: 60, label: '2026 복기문제', file: '공기업 필기/2026_한전KDN_전산필기_1차.hwp', lede: '2026 1차 응시 후기에 복원된 50문항의 주제 순서를 따라 만든 50문제, 60분, 5지선다입니다.' },
  { key: 'kicox', abbr: 'KICOX', name: '한국산업단지공단 (복기 기반)', questions: KICOX_QUESTIONS, sections: KICOX_SECTIONS, minutes: 55, label: '복기문제', file: '공기업 필기/산업단지공단 복기 문제.pdf', lede: '응시 후기에 복원된 39문항의 주제(인덱스 선택도, 비트맵 인덱스, Strict 2PL, 체크포인트, AVL·Red-Black 트리, Adam, Self-Attention, K-means 등)를 따라 만든 39문제, 55분, 5지선다입니다.' },
].map(({ label, file, ...b }) => ({ ...b, questions: withNotes(b.questions), ready: true, meta: `복기 기반 ${b.questions.length}문제 · ${b.minutes}분`, source: recallSource(label, file) }));

const HF_RECALL_BANK = {
  key: 'hf', abbr: 'HF', name: '한국주택금융공사 2026 하반기 복원', ready: true,
  meta: `복원 ${HF_RECALL_2026B.questions.length}문제 · 5지선다`,
  source: recallSource('2026 하반기 복기문제'),
  questions: withNotes(HF_RECALL_2026B.questions), sections: HF_SECTIONS, minutes: 60,
  lede: HF_RECALL_2026B.lede,
};

const MOVED_BANKS = [
  {
    key: "koscom", category: "finance", abbr: "KOSCOM", name: "코스콤", meta: "전산 전공 35문제 · 45분 · 4지선다", ready: true,
    source: { kind: "recall", label: "2026 상반기 복기문제", file: "공기업 필기/2026 상반기 코스콤 필기전형 복기.pdf" },
    questions: KOSCOM_QUESTIONS, sections: KOSCOM_SECTIONS, minutes: 45,
    lede: "소프트웨어공학 6문제, 운영체제 7문제, 데이터베이스 7문제, 네트워크·데이터통신 8문제, 자료구조 7문제. 총 35문제, 45분, 4지선다. 2026 상반기 응시 후기에 복원된 35문항(CMMI 순서, COCOMO II, 격리 수준, 2PL 변형, 포트 번호 등 명칭·순서·예외를 묻는 경향)을 바탕으로 새로 만든 문제입니다.",
  },
  {
    key: "ibk", category: "finance", abbr: "IBK", name: "기업은행", meta: "NCS 40 + 전공 35 · 120분 · 4지선다", ready: true,
    source: { kind: "recall", label: "2026 상반기 복기문제", file: "공기업 필기/IBK기업은행 2026 상반기 필기 기출복원 문제지.pdf" },
    questions: IBK_QUESTIONS, sections: IBK_SECTIONS, minutes: 120,
    lede: "NCS 직업기초능력(의사소통·수리·문제해결·자료해석·명제논리) 40문제, 직무수행능력 35문제(경제학 12 · 재무관리 8 · 회계 8 · 경영·금융상식 7). 총 75문제, 120분, 4지선다. 출제 구성만 참고해 새로 만든 문제입니다.",
  },
  {
    key: "kfsb", category: "finance", abbr: "KFSB", name: "저축은행중앙회", meta: "IT직무 전공 50문제 · 60분 · 4지선다", ready: true,
    source: { kind: "recall", label: "복기문제", file: "공기업 필기/저은중IT필기복원.txt" },
    questions: KFSB_QUESTIONS, sections: KFSB_SECTIONS, minutes: 60,
    lede: "데이터베이스 11문제, 운영체제·인프라 10문제, 네트워크·분산통신 8문제, 정보보호 11문제, 자료구조·설계·아키텍처 10문제. 총 50문제, 60분, 4지선다. 계좌·입출금·결제 같은 실무 상황을 제시하고 '왜 이 기술을 택하는가'를 묻는 응시 후기 경향을 따라 새로 만든 문제입니다.",
  },
  {
    key: "bnk", category: "finance", abbr: "BNK", name: "BNK캐피탈", meta: "금융상식 15 + NCS 15 · 40분 · 4지선다", ready: true,
    source: { kind: "recall", label: "2024 하반기 복기문제", file: "공기업 필기/2024_하반기_BNK_IT직무_필기복기.pdf" },
    questions: BNK_QUESTIONS, sections: BNK_SECTIONS, minutes: 40,
    lede: "금융·경제·경영 기초상식 15문제, 직무기초소양(NCS) 15문제. 총 30문제, 40분, 4지선다. 2024 하반기 IT직무 응시 후기의 키워드 정리(예금자보호, CD, 롱숏펀드, 레그테크, 환헤지, 재정환율, 피셔 방정식, MR=MC, BCG 등)와 NCS 기록 유형을 바탕으로 새로 만든 문제입니다. 코딩테스트(SQL·알고리즘)는 포함하지 않습니다.",
  },
  {
    key: "ssafyalgo", category: "major", abbr: "SSAFY", name: "SSAFY 알고리즘 과목평가", meta: "객관식 21 · 단답형 9 · 서술형 2 × 2회 + 기초 다지기 30문제 · 60분", ready: true,
    source: { kind: "recall", label: "복기 범위" },
    questions: SSAFY_ALGO_QUESTIONS, sections: SSAFY_ALGO_SECTIONS, minutes: 60,
    sets: SSAFY_ALGO_SETS,
    lede: "객관식 21문제, 단답형 9문제, 서술형 2문제. 시간복잡도·빅오 계산, 큐 메서드, 트리 용어·순회, 힙 구조, 재귀 구조와 완전탐색, 순열·조합·부분집합 구분과 next_permutation, 그래프 표현·차수·BFS/DFS, 비트마스킹 상태관리와 장점, Union-Find와 경로 압축, 분할 정복 설계, 위상 정렬 전제 조건, 백트래킹 가지치기, 탐욕 알고리즘 특징, 이진 탐색 조건 처리, 투 포인터까지 복기된 출제 범위를 따라 2회분을 만들었고, 같은 범위를 쉬운 난이도로 다시 짚는 기초 다지기 30문제(객관식 21 · 단답형 9)를 더했습니다. 단답형은 답을 입력하면 자동 채점하고(표기가 다르면 모범답안을 보고 직접 채점), 서술형은 답안을 써 본 뒤 모범답안·채점 포인트와 비교해 스스로 채점합니다.",
  },
  {
    key: "ssafymonthly", category: "monthly", abbr: "SSAFY", name: "SSAFY 알고리즘 월말평가", meta: "복기 서술형 3문항 · 20분", ready: true,
    source: { kind: "recall", label: "복기 범위" },
    questions: SSAFY_MONTHLY_QUESTIONS, sections: SSAFY_MONTHLY_SECTIONS, minutes: 20,
    sets: SSAFY_MONTHLY_SETS,
    lede: "월말평가는 구현 3문제(과제 복기 2 + 기본 알고리즘 1)와 서술형 1문제로 치러지며, 여기서는 구현을 빼고 서술형만 연습합니다. 복기된 서술형 소문항 3개(BFS·DFS 진행 방식 차이와 핵심 자료구조, 그래프 표현 방식에 따른 탐색 소요시간과 이유, 위상 정렬 대상 그래프의 구조적 제한 2가지)만 그대로 담았습니다.",
  },
];
const MOVED = MOVED_BANKS.map(b => ({ ...b, questions: withNotes(b.questions) }));

export const COMIL = {
  ...COMIL_BANK, questions: withNotes(COMIL_BANK.questions),
  sections: { ...COMIL_BANK.sections, ...COMIL_UNITS.sections },
  units: { ...COMIL_UNITS, questions: withNotes(COMIL_UNITS.questions) },
};

// 화면에서 묶어 보여 줄 순서
export const PRIVATE_GROUPS = [
  { key: 'recall', name: '복기 문제집', banks: [...MOVED.filter(b => b.category !== 'major' && b.category !== 'monthly'), ...SPLIT_RECALL, HF_RECALL_BANK] },
  { key: 'comil', name: '컴퓨터일반', desc: '전산직 9급 컴퓨터일반 모의고사 · 단원별 문제집', banks: [COMIL] },
];

// 주소의 :key 는 같은 키를 쓰는 문제집이 있을 수 있어 그룹 키와 함께 쓴다
export const privateBankId = (group, bank) => `${group.key}-${bank.key}`;
export const findPrivateBank = (id) => {
  for (const group of PRIVATE_GROUPS) for (const bank of group.banks) if (privateBankId(group, bank) === id) return { group, bank };
  return null;
};
