import { useSearchParams } from 'react-router-dom';
import OnboardingTabs from '../components/OnboardingTabs';
import { DEV_LOG } from '../data/devLog';
import './OnboardingPage.css';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const label = date => {
  const [y, m, d] = date.split('-').map(Number);
  return { short: `${m}.${d}`, long: `${y}년 ${m}월 ${d}일 (${WEEK[new Date(y, m - 1, d).getDay()]})` };
};

// 개발 일지. 왼쪽 날짜를 누르면 그날 적어 둔 할 일이 오른쪽(휴대폰은 아래)에 열린다. ?d=2026-11-20 으로 바로 열 수 있다
export default function DevLogPage() {
  const [params, setParams] = useSearchParams();
  const current = DEV_LOG.find(e => e.date === params.get('d')) || DEV_LOG[0];
  return (
    <div className="ob">
      <header className="ob-hero ob-hero--slim">
        <OnboardingTabs />
        <p className="ob-eyebrow">나의쿠키</p>
        <h1>개발 일지</h1>
        <p className="ob-lead">날마다 정한 할 일과 메모를 남깁니다. 날짜를 누르면 그날 기록이 열려요.</p>
      </header>

      <div className="dl">
        <nav className="dl-dates" aria-label="날짜">
          {DEV_LOG.map(e => {
            const l = label(e.date);
            return <button key={e.date} type="button" className={e === current ? 'on' : ''} aria-current={e === current ? 'true' : undefined}
              onClick={() => setParams({ d: e.date }, { replace: true })}>
              <b>{l.short}</b><small>{e.title}</small>
            </button>;
          })}
        </nav>

        {current && <article className="dl-entry" aria-labelledby="dl-title">
          <p className="dl-meta">{label(current.date).long}{current.owner && <> · 담당 <b>{current.owner}</b></>}</p>
          <h2 id="dl-title">{current.title}</h2>
          <ol className="dl-items">
            {current.items.map((item, i) => <li key={i}>
              <b>{item.text}</b>
              {item.note && <p>{item.note}</p>}
              {item.sub && <ol className="dl-sub">
                {item.sub.map((s, j) => <li key={j}><span className="dl-no">{i + 1}.{j + 1}</span><div><b>{s.text}</b>{s.note && <p>{s.note}</p>}</div></li>)}
              </ol>}
            </li>)}
          </ol>
        </article>}
      </div>
    </div>
  );
}
