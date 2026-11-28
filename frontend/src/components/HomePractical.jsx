import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './HomePractical.css';

const BANK = '/web/practical';
const PROGRESS_KEY = 'exam-progress:practical';

// 한국 날짜 기준 일련번호. 날마다 다른 오늘의 문제를 고른다
const dayNumber = () => Math.floor((Date.now() + 9 * 3600 * 1000) / 86400000);

// 이 브라우저에서 푼 실무형 문항 수(문제집이 저장하는 풀이 기록을 읽기만 한다)
function solvedCount(ids) {
  try {
    const stats = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}')?.stats || {};
    return ids.filter(id => stats[id] && (stats[id].c || stats[id].w)).length;
  } catch {
    return 0;
  }
}

/** 날짜마다 돌아가는 오늘의 문제 하나(문항이 없으면 null) */
function pickToday(questions, day = dayNumber()) {
  if (!questions.length) return null;
  return questions[((day % questions.length) + questions.length) % questions.length];
}

// 첫 화면 "실무형 문제" 카드. 오늘의 상황과 질문을 보여 주고 누르면 그 문제로 바로 들어간다.
// 문제 데이터는 화면이 뜬 뒤에 불러와 첫 화면을 가볍게 둔다
export default function HomePractical() {
  const [bank, setBank] = useState(null);

  useEffect(() => {
    let alive = true;
    import('../data/practicalQuestions')
      .then(m => { if (alive) setBank({ questions: m.PRACTICAL_QUESTIONS, sections: m.PRACTICAL_SECTIONS }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!bank) return <section className="hp ds-card hp-loading" aria-hidden="true" />;

  const { questions, sections } = bank;
  const today = pickToday(questions);
  const solved = solvedCount(questions.map(q => q.id));
  const percent = Math.round(solved / questions.length * 100);

  return <section className="hp ds-card" aria-labelledby="hp-title">
    <div className="hp-head">
      <span className="hp-badge">실무형 문제</span>
      <h2 id="hp-title" className="hp-title">실제 코드에서 무엇이 문제인지 찾아요</h2>
      <Link to={BANK} className="hp-all">전체 {questions.length}문제</Link>
    </div>

    {today && <Link to={`${BANK}?q=${today.id}`} className="hp-today">
      <span className="hp-today-label">오늘의 문제 <em>{sections[today.sec]?.name}</em></span>
      <span className="hp-ctx">{today.ctx}</span>
      <b className="hp-q">{today.q}</b>
      <span className="hp-go">풀어 보기 <span aria-hidden="true">→</span></span>
    </Link>}

    <div className="hp-chips" role="list" aria-label="주제별로 풀기">
      {Object.entries(sections).map(([key, s]) => (
        <Link key={key} role="listitem" to={`${BANK}?sec=${key}`} className="hp-chip">{s.name}</Link>
      ))}
    </div>

    <div className="hp-progress">
      <span className="hp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={solved} aria-label="실무형 문제 진행">
        <i style={{ width: `${Math.max(percent, solved ? 3 : 0)}%` }} />
      </span>
      <small>{solved ? `${questions.length}문제 중 ${solved}문제 풀었어요` : '아직 푼 문제가 없어요. 오늘의 문제부터 시작해 보세요'}</small>
    </div>
  </section>;
}
