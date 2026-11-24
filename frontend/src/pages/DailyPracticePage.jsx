import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { recordDailyAnswer } from '../dailyPracticeRecords';
import './DailyPracticePage.css';

const MARKS = ['①', '②', '③', '④'];

// 점수 문구(5문제 기준)
function scoreMessage(correct, total) {
  if (total > 0 && correct === total) return '모두 맞혔어요. 오늘 주제는 완벽해요!';
  if (correct >= Math.ceil(total * 0.6)) return '잘했어요. 틀린 문제 해설만 한 번 더 읽어 보세요.';
  return '해설을 읽고 다시 풀면 금방 익숙해져요.';
}

// 학습 메일의 "오늘 주제 5문제 더 풀기"로 들어오는 화면. 한 문제씩 풀고 바로 정답과 해설을 본다
// day가 바뀌면 key로 상태를 통째로 새로 시작한다
export default function DailyPracticePage() {
  const { day } = useParams();
  return <DailyPractice key={day} day={day} />;
}

function DailyPractice({ day }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    let stale = false;
    api.get(`/daily/${encodeURIComponent(day)}`)
      .then(({ data: body }) => { if (!stale) setData(body); })
      .catch(e => { if (!stale) setError(e?.response?.status === 404 ? '이 날짜의 연습 문제를 찾을 수 없어요.' : '문제를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.'); });
    return () => { stale = true; };
  }, [day]);

  if (error) return <div className="daily-page fade-in"><p role="alert">{error}</p><Link className="exam-btn sm" to="/">첫 화면으로</Link></div>;
  if (!data) return <div className="daily-page fade-in"><p role="status">문제를 불러오는 중…</p></div>;

  const total = data.practice.length;
  const finished = results.length === total;
  const correct = results.filter(Boolean).length;
  const q = data.practice[Math.min(index, total - 1)];
  const answered = picked !== null;

  const choose = i => {
    if (answered) return;
    setPicked(i);
    setResults(prev => [...prev, i === q.answer]);
    recordDailyAnswer(data.day, index + 1, data.theme, q, i === q.answer);
  };
  const next = () => { setIndex(index + 1); setPicked(null); };
  const restart = () => { setIndex(0); setPicked(null); setResults([]); };

  return <div className="daily-page fade-in">
    <header className="page-header">
      <p className="daily-kicker">오늘 주제 · {data.theme}</p>
      <h1>{finished ? '결과' : `${index + 1} / ${total}번 문제`}</h1>
    </header>

    {!finished && <section className="daily-card" aria-live="polite">
      <h2 className="daily-title">{q.title}</h2>
      {q.context && <p className="daily-context">{q.context}</p>}
      <p className="daily-prompt">{q.prompt}</p>
      <ul className="daily-options">
        {q.options.map((option, i) => {
          const state = !answered ? '' : i === q.answer ? 'right' : i === picked ? 'wrong' : 'idle';
          return <li key={i}>
            <button type="button" className={`daily-option ${state}`} onClick={() => choose(i)} disabled={answered} aria-pressed={picked === i}>
              <span className="daily-mark">{MARKS[i]}</span>{option}
            </button>
          </li>;
        })}
      </ul>
      {answered && <div className="daily-explain" role="status">
        {/* 해설이 길어도 스크롤 없이 넘어가도록 버튼을 해설 위, 보기 바로 아래에 둔다 */}
        <div className="daily-verdict">
          <strong>{picked === q.answer ? '정답이에요' : `아쉬워요. 정답은 ${MARKS[q.answer]}번`}</strong>
          {index + 1 < total
            ? <button type="button" className="exam-btn sm" onClick={next} autoFocus>다음 문제</button>
            : <button type="button" className="exam-btn sm" onClick={() => setIndex(total)} autoFocus>결과 보기</button>}
        </div>
        {q.explanation.map((line, i) => <p key={i}>{line}</p>)}
      </div>}
    </section>}

    {finished && <section className="daily-card">
      <p className="daily-score"><strong>{correct}</strong> / {total}</p>
      <p>{scoreMessage(correct, total)}</p>
      <div className="daily-actions">
        <button type="button" className="exam-btn sm" onClick={restart}>다시 풀기</button>
        {data.blog?.url && <a className="exam-btn sm" href={data.blog.url} target="_blank" rel="noopener noreferrer">{data.blog.company} 기술블로그 읽기</a>}
        <Link className="exam-btn sm" to="/">첫 화면으로</Link>
      </div>
    </section>}
  </div>;
}
