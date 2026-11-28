// 문제집별 풍부한 해설. 문항 id는 문제집끼리 겹칠 수 있어(c01, d01 등) id가 아니라 문제 문장, 코드, 보기를 합친 값으로 찾는다.
// 각 항목: wrong(오답 보기별 이유, 기존 해설이 이미 보기마다 짚는 문제집은 생략), fix(바로잡은 코드), tips(더 알아 둘 점)
import { PRACTICAL_QUESTIONS } from './practicalQuestions';
import { PRACTICAL_DETAILS } from './practicalDetails';
import { JAVA_QUESTIONS } from './javaQuestions';
import { JAVA_DETAILS } from './javaDetails';
import { SPRING_PRACTICE_QUESTIONS } from './springPracticeQuestions';
import { SPRING_PRACTICE_DETAILS } from './springPracticeDetails';
import { SPRING_QUESTIONS } from './springQuestions';
import { SPRING_DETAILS } from './springDetails';

// 문제집 key, 문항 목록, 해설 묶음
export const DETAIL_SOURCES = [
  ['practical', PRACTICAL_QUESTIONS, PRACTICAL_DETAILS],
  ['java', JAVA_QUESTIONS, JAVA_DETAILS],
  ['spring-practice', SPRING_PRACTICE_QUESTIONS, SPRING_PRACTICE_DETAILS],
  ['spring', SPRING_QUESTIONS, SPRING_DETAILS],
];

// 문장만으로는 겹친다("다음 코드가 출력하는 값은?" 등). 코드와 보기까지 합쳐 문항을 구분한다
const keyOf = q => [q.q, q.code || '', ...(q.o || [])].join('');
const byQuestion = new Map();
for (const [, questions, details] of DETAIL_SOURCES)
  for (const q of questions) if (details[q.id]) byQuestion.set(keyOf(q), details[q.id]);

/** 문항(복사본 포함)에 맞는 풍부한 해설. 없으면 undefined */
export const detailFor = q => (q?.q ? byQuestion.get(keyOf(q)) : undefined);
