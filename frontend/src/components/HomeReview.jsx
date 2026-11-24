import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dailyWrongRows, pickReview, recordDailyAnswer } from '../dailyPracticeRecords';
import './HomeReview.css';

const MARKS = ['①', '②', '③', '④'];

// 첫 화면 "오늘의 복습": 학습 메일 연습 문제에서 틀린 문제를 하루 3개 다시 풀어 본다.
// 맞히면 오답노트에서 빠지고, 기록은 이 브라우저에만 있다. 틀린 문제가 없으면 아무것도 그리지 않는다
function dayNumber() {
  return Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000);
}

export default function HomeReview() {
  const [rows] = useState(() => pickReview(dailyWrongRows(), dayNumber()));
  const [picked, setPicked] = useState({});
  if (!rows.length) return null;

  const choose = (row, i) => {
    if (picked[row.id] !== undefined) return;
    setPicked(prev => ({ ...prev, [row.id]: i }));
    recordDailyAnswer(row.day, row.index, row.theme, row.question, i === row.question.answer);
  };
  const done = rows.every(r => picked[r.id] !== undefined);

  return <section className="mn-section hr" aria-labelledby="mn-review">
    <div className="mn-section-head">
      <h2 id="mn-review">오늘의 복습</h2>
      <span className="mn-note">틀렸던 문제 {rows.length}개 · 맞히면 오답노트에서 빠져요</span>
      <Link to="/weak" className="mn-section-more">오답노트</Link>
    </div>
    <div className="hr-list">
      {rows.map(row => {
        const q = row.question, choice = picked[row.id], answered = choice !== undefined;
        return <article key={row.id} className="ds-card hr-item">
          <p className="hr-theme">{row.theme}</p>
          <p className="hr-prompt">{q.prompt}</p>
          <div className="hr-options">
            {q.options.map((option, i) => {
              const state = !answered ? '' : i === q.answer ? 'right' : i === choice ? 'wrong' : 'idle';
              return <button key={i} type="button" className={`hr-option ${state}`} disabled={answered} onClick={() => choose(row, i)}>
                <span>{MARKS[i]}</span>{option}
              </button>;
            })}
          </div>
          {answered && <div className="hr-explain" role="status">
            <b>{choice === q.answer ? '맞혔어요. 오답노트에서 빠졌어요' : `아쉬워요. 정답은 ${MARKS[q.answer]}번`}</b>
            {q.explanation.map((line, k) => <p key={k}>{line}</p>)}
          </div>}
        </article>;
      })}
    </div>
    {done && <p className="mn-note hr-done">오늘 복습을 마쳤어요. 내일 다른 문제가 나와요.</p>}
  </section>;
}
