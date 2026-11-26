import { useState } from 'react';
import { CHECKED_AT, EVENTS, FIRST_MONTH, KINDS, LAST_MONTH, PENDING } from '../data/certSchedule';
import { dayLabel, koreanDay } from '../data/todayCs';
import './CertCalendar.css';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const pad = n => String(n).padStart(2, '0');

function addMonth(month, step) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + step, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

const short = day => {
  const d = new Date(`${day}T00:00:00Z`);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}(${WEEKDAYS[d.getUTCDay()]})`;
};

// 달력 칸에 적을 말. 접수 기간은 시작일과 마감일에만 적어 칸이 가득 차지 않게 한다
function labelOn(event, day) {
  if (event.kind === 'apply') {
    if (day === event.start) return '접수 시작';
    return day === event.end ? '접수 마감' : null;
  }
  return day >= event.start && day <= event.end ? KINDS[event.kind] : null;
}

export default function CertCalendar() {
  const today = dayLabel(koreanDay());
  const [month, setMonth] = useState(() => {
    const now = today.slice(0, 7);
    if (now < FIRST_MONTH) return FIRST_MONTH;
    return now > LAST_MONTH ? LAST_MONTH : now;
  });
  const [year, mon] = month.split('-').map(Number);
  const blank = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const days = Array.from({ length }, (_, i) => `${month}-${pad(i + 1)}`);
  const list = EVENTS.filter(e => e.start.slice(0, 7) <= month && e.end.slice(0, 7) >= month)
    .sort((a, b) => a.start.localeCompare(b.start));

  return <section className="cert-cal" aria-labelledby="cert-cal-title">
    <div className="cert-cal-head">
      <button type="button" onClick={() => setMonth(addMonth(month, -1))} disabled={month <= FIRST_MONTH} aria-label="이전 달">‹</button>
      <h2 id="cert-cal-title" aria-live="polite">{year}년 {mon}월 시험 일정</h2>
      <button type="button" onClick={() => setMonth(addMonth(month, 1))} disabled={month >= LAST_MONTH} aria-label="다음 달">›</button>
    </div>
    {/* 달력은 눈으로 훑는 용도라 읽기 도구에는 아래 목록을 읽어 준다 */}
    <div className="cert-cal-grid" aria-hidden="true">
      {WEEKDAYS.map(w => <span key={w} className="cert-cal-week">{w}</span>)}
      {Array.from({ length: blank }, (_, i) => <span key={`blank-${i}`} />)}
      {days.map(day => <div key={day} className={`cert-cal-day${day === today ? ' today' : ''}`}>
        <b>{Number(day.slice(8))}</b>
        {list.map(e => {
          const label = labelOn(e, day);
          return label && <span key={e.cert + e.title} className={`cert-cal-chip ${e.kind}`} title={`${e.cert} ${e.title}`}>
            <em>{label}</em> {e.cert}
          </span>;
        })}
      </div>)}
    </div>
    {list.length ? <ul className="cert-cal-list">
      {list.map(e => <li key={e.cert + e.title}>
        <span className={`cert-cal-chip ${e.kind}`}>{KINDS[e.kind]}</span>
        <time dateTime={e.start}>{short(e.start)}{e.end !== e.start && ` ~ ${short(e.end)}`}</time>
        <a href={e.href} target="_blank" rel="noopener noreferrer"><b>{e.cert}</b> {e.title}<span className="sr-only"> (공식 일정, 새 탭에서 열림)</span></a>
      </li>)}
    </ul> : <p className="cert-cal-empty">이 달에 확인된 일정이 없어요.</p>}
    <p className="cert-cal-note">
      {CHECKED_AT.replaceAll('-', '.')}에 시험 기관 발표를 확인했어요. 일정은 바뀔 수 있으니 접수 전에 공식 사이트를 확인하세요. AWS 자격증은 원하는 날짜를 골라 예약해요.
    </p>
    <p className="cert-cal-note">
      2027년 일정을 아직 확인하지 못한 곳: {PENDING.map((p, i) => <span key={p.name}>{i > 0 && ', '}<a href={p.href} target="_blank" rel="noopener noreferrer">{p.name}</a></span>)}
    </p>
  </section>;
}
