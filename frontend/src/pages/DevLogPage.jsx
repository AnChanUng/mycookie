import { useEffect, useState } from 'react';
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
          {current.goals && <GoalRanking key={current.date} date={current.date} owner={current.owner} goals={current.goals} />}
        </article>}
      </div>
    </div>
  );
}

// 목표 우선순위 매기기. 누른 순서대로 1, 2, 3…이 붙고, 다시 누르면 빠진다. 순서는 이 브라우저에만 저장한다
const read = key => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } };
function GoalRanking({ date, owner, goals }) {
  const storeKey = `devlog:goals:${date}`;
  const known = new Set(goals.list.map(g => g.key));
  const [order, setOrder] = useState(() => read(storeKey).filter(k => known.has(k)));
  const [copied, setCopied] = useState('');
  useEffect(() => { try { localStorage.setItem(storeKey, JSON.stringify(order)); } catch { /* 저장 못 해도 화면은 동작 */ } }, [storeKey, order]);
  const toggle = key => { setCopied(''); setOrder(o => o.includes(key) ? o.filter(k => k !== key) : [...o, key]); };
  const done = order.length === goals.list.length;
  const result = `${owner ? owner + '의 ' : ''}나의쿠키 목표 우선순위\n` + order.map((k, i) => `${i + 1}. ${goals.list.find(g => g.key === k).text}`).join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(result); setCopied('복사했어요. Mattermost에 붙여 넣어 주세요.'); }
    catch { setCopied('복사하지 못했어요. 아래 순서를 직접 옮겨 적어 주세요.'); }
  }
  return <section className="dl-goals" aria-labelledby="dl-goals-title">
    <h3 id="dl-goals-title">{goals.title}</h3>
    <p className="dl-goals-lead">{goals.lead}</p>
    <ul className="dl-goal-list">
      {goals.list.map(g => {
        const rank = order.indexOf(g.key) + 1;
        return <li key={g.key}>
          <button type="button" className={rank ? 'on' : ''} aria-pressed={!!rank} onClick={() => toggle(g.key)}>
            <span className="dl-rank" aria-label={rank ? `${rank}위` : '순위 없음'}>{rank || ''}</span>
            <span><b>{g.text}</b><small>{g.note}</small></span>
          </button>
        </li>;
      })}
    </ul>
    <div className="dl-goal-actions">
      <span role="status">{done ? '모두 매겼어요!' : `${order.length} / ${goals.list.length} 매김`}</span>
      <button type="button" className="dl-goal-btn" onClick={() => { setOrder([]); setCopied(''); }} disabled={!order.length}>처음부터</button>
      <button type="button" className="dl-goal-btn primary" onClick={copy} disabled={!order.length}>결과 복사</button>
    </div>
    {copied && <p className="dl-goals-lead" role="alert">{copied}</p>}
  </section>;
}
