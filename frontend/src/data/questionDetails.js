// 문제집별 풍부한 해설을 문항 id로 모은다. 문항 id는 문제집마다 접두어가 달라 겹치지 않는다(check:question-details가 확인).
// 각 항목: wrong(오답 보기별 이유), fix(바로잡은 코드, 있을 때만), tips(더 알아 둘 점)
import { PRACTICAL_DETAILS } from './practicalDetails';
import { JAVA_DETAILS } from './javaDetails';
import { SPRING_PRACTICE_DETAILS } from './springPracticeDetails';

export const QUESTION_DETAILS = { ...PRACTICAL_DETAILS, ...JAVA_DETAILS, ...SPRING_PRACTICE_DETAILS };
