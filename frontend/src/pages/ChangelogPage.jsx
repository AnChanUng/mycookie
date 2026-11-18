import { CHANGELOG } from '../data/changelog';
import './InfoPages.css';

// 공개 패치노트. 연 · 월별로 무엇이 바뀌었는지 보여 준다
export default function ChangelogPage() {
  return (
    <article className="info-page">
      <header className="info-hero">
        <p className="info-eyebrow">Patch Notes</p>
        <h1>패치노트</h1>
        <p>나의쿠키가 언제 무엇을 바꿨는지 모았어요.</p>
      </header>
      {CHANGELOG.map(y => (
        <section key={y.year} className="changelog-year" aria-labelledby={`year-${y.year}`}>
          <h2 id={`year-${y.year}`}>{y.year}년</h2>
          <ol className="changelog-months">
            {y.months.map(m => (
              <li key={m.month} className="changelog-month">
                <div className="changelog-when">{m.month}월</div>
                <div className="changelog-body">
                  <h3>{m.title}</h3>
                  <ul>{m.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </article>
  );
}
