import { Link } from 'react-router-dom';
import { account } from '../sync';
import { readPlan, taskDone, today } from '../studyCoach';
import '../pages/StudyCoachPage.css';

export default function StudyCoachEntry() {
  const plan = readPlan(account());
  const current = plan?.day === today();
  const done = current ? plan.tasks.filter(taskDone).length : 0;
  return <section className="coach-entry" aria-label="AI 학습 코치">
    <div><span className="ds-eyebrow">AI 학습 코치</span><h2>{current ? `오늘의 학습 · ${plan.tasks.length}개 중 ${done}개 완료` : '오늘 뭐 공부하지?'}</h2>
      <p>{current ? '계획에 맞춰 복습하고 문제를 풀어 보세요.' : '시험 일정과 공부 시간에 맞춰 오늘 할 공부를 정해드려요.'}</p></div>
    <Link className="ds-btn ds-btn--primary" to="/study-coach">{current ? '이어서 공부하기' : 'AI 학습 계획 만들기'} →</Link>
  </section>;
}
