import { explanationFor } from '../data/explanationLookup';
import { QUESTION_DETAILS } from '../data/questionDetails';
import Code from './Code';

const CIRC = ['①', '②', '③', '④'];

export default function QuestionExplanation({ q }) {
  const story = explanationFor(q);
  const rich = QUESTION_DETAILS[q.id];
  if (rich) return <DetailedExplanation q={q} detail={rich} story={story} />;
  if (!story) return null;
  return <section className="exam-explanation" aria-label="문항별 상세 해설">
    <h4>풀이 과정, 헷갈리기 쉬운 점</h4>
    {story.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}
  </section>;
}

// 풍부한 해설: 기존 풀이 과정(있으면), 다른 보기가 틀린 이유, 고친 코드, 더 알아 둘 점을 나눠 보여 준다(길이보다 종류로 풍부하게)
function DetailedExplanation({ q, detail, story }) {
  const wrong = Object.entries(detail.wrong || {}).sort(([a], [b]) => a - b);
  return <section className="exam-explanation" aria-label="문항별 상세 해설">
    {story && <>
      <h4>풀이 과정</h4>
      {story.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    </>}
    {wrong.length > 0 && <>
      <h4>다른 보기가 틀린 이유</h4>
      <ul className="exam-explanation-list">
        {wrong.map(([i, text]) => <li key={i}><b>{CIRC[i]} {q.o[i]}</b><span>{text}</span></li>)}
      </ul>
    </>}
    {detail.fix && <>
      <h4>이렇게 고쳐요</h4>
      <Code code={detail.fix} />
    </>}
    {detail.tips?.length > 0 && <>
      <h4>더 알아 둘 점</h4>
      <ul className="exam-explanation-list">
        {detail.tips.map((tip, i) => <li key={i}><span>{tip}</span></li>)}
      </ul>
    </>}
  </section>;
}
