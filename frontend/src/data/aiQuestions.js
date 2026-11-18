// AI 문제집: 여러 기업 문제집에 흩어져 있던 AI · 머신러닝 문항을 한곳에 모은다.
// 문항은 원본 파일을 그대로 쓰고(복사하지 않는다) 과목만 AI 기준으로 다시 나눈다.
import { KICOX_QUESTIONS } from './kicoxQuestions';
import { KICOX_PRED_QUESTIONS } from './kicoxPredictedQuestions';
import { IBKDT_QUESTIONS } from './ibkDigitalQuestions';
import { IBK_BIGDATA_B } from './ibkBigdataBQuestions';

const DEEP = new Set(['Adam', '역전파', '활성화 함수', 'Self-Attention', '과적합', '기울기 소실', '소프트맥스', '트랜스포머']);
const ML = new Set(['K-means', '분류 평가 지표']);

const kicox = [...KICOX_QUESTIONS, ...KICOX_PRED_QUESTIONS].filter(q => q.sec === 'ai');
const as = (sec) => (q) => ({ ...q, sec, set: undefined });

export const AI_QUESTIONS = [
  ...kicox.filter(q => DEEP.has(q.topic)).map(as('dl')),
  ...kicox.filter(q => ML.has(q.topic)).map(as('ml')),
  ...IBK_BIGDATA_B.filter(q => q.sec === 'bd3').map(as('ml')),
  ...IBKDT_QUESTIONS.filter(q => q.sec === 'bda').map(as('bda')),
];

const count = (sec) => AI_QUESTIONS.filter(q => q.sec === sec).length;

export const AI_SECTIONS = {
  dl: { name: '딥러닝 기초', short: '딥러닝', sub: '역전파 · 활성화 함수 · 최적화 · 과적합 · 트랜스포머 · 어텐션', count: count('dl') },
  ml: { name: '머신러닝 · 모델링', short: '머신러닝', sub: '회귀 · 분류 · 군집 · 앙상블 · 평가 지표', count: count('ml') },
  bda: { name: '빅데이터 · AI 실무', short: '실무', sub: '전처리 · 모델 평가 · 생성형 AI · 분산 처리', count: count('bda') },
};
