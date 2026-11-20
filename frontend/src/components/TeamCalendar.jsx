import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import { DEV_LOG } from '../data/devLog';
import './TeamCalendar.css';

const CS_DAY = '2026-11-23';
const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const todayKst = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);

export default function TeamCalendar() {
  const today = todayKst();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [state, setState] = useState({ entries: DEV_LOG, loading: true, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    const token = account()?.token;
    api.get('/devlog', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
      timeout: 15000,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(data?.entries)) throw new Error('Invalid calendar entries');
      const saved = data.entries;
      const remaining = DEV_LOG.filter(seed => !saved.some(entry => entry.date === seed.date));
      setState({ entries: [...saved, ...remaining], loading: false, failed: false });
    }).catch(() => {
      if (!controller.signal.aborted) setState(current => ({ ...current, loading: false, failed: true }));
    });
    return () => controller.abort();
  }, []);

  const [year, monthNumber] = month.split('-').map(Number);
  const firstWeekday = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((firstWeekday + days) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= days ? `${month}-${String(day).padStart(2, '0')}` : null;
  });
  const current = state.entries.find(entry => entry.date === selected);

  function moveMonth(offset) {
    const next = new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 10);
    setMonth(next.slice(0, 7));
    setSelected(next);
  }

  return <section id="calendar" className="ob-section team-calendar" aria-labelledby="calendar-title">
    <h2 id="calendar-title">팀 일정</h2>
    <p className="team-launch"><b>전체 공개 목표</b> 2026년 11월 말~12월 초 · 잠정<br />
      공개 대상과 기능 범위는 지인, SSAFY 전체, 취업 단톡방 등 단계별로 협의합니다.
    </p>
    <div className="team-calendar-nav">
      <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>←</button>
      <h3 aria-live="polite">{year}년 {monthNumber}월</h3>
      <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>→</button>
      <button type="button" onClick={() => { setMonth(today.slice(0, 7)); setSelected(today); }}>오늘</button>
    </div>
    <table className="team-calendar-grid" aria-label={`${year}년 ${monthNumber}월 팀 일정`}>
      <thead><tr>{weekdays.map(day => <th scope="col" key={day}>{day}</th>)}</tr></thead>
      <tbody>{Array.from({ length: cells.length / 7 }, (_, week) => <tr key={week}>
        {cells.slice(week * 7, week * 7 + 7).map((date, index) => <td key={date || `empty-${index}`}>
          {date && <button type="button" aria-label={`${date} 일정 보기`} aria-pressed={date === selected}
            aria-current={date === today ? 'date' : undefined} onClick={() => setSelected(date)}>
            <span>{Number(date.slice(-2))}</span>
            {state.entries.some(entry => entry.date === date) && <small>개발 일지</small>}
            {date === CS_DAY && <small>CS 채널</small>}
          </button>}
        </td>)}
      </tr>)}</tbody>
    </table>
    {state.loading && <p role="status">저장된 개발 일지를 불러오는 중…</p>}
    {state.failed && <p role="alert">저장된 개발 일지를 불러오지 못했습니다. 기본 일정이 표시됩니다. 새로고침해 주세요.</p>}
    <div className="team-calendar-detail" aria-live="polite">
      <h3>{selected.replaceAll('-', '.')} 일정</h3>
      {current && <p>
        <Link to={`/x/f9aa1502c8/log?d=${selected}`}>{current.title}</Link>
        {current.owner && ` · ${current.owner}`}
        {current.complete && ' · 완료'}
      </p>}
      {selected === CS_DAY && <p>
        <a href="https://github.com/AnChanUng/mycookie/issues/102" target="_blank" rel="noopener noreferrer">
          CS 구독 채널·관리자 기능 개발
        </a> · 보민 · 개발 예정<br />
        채널 준비, 웹 필수지식 선정, 관리자 미리보기와 발송 관리, 권한·재시도 검증
      </p>}
      {!current && selected !== CS_DAY && <p>등록된 일정이 없습니다.</p>}
      <p><Link to={current ? `/x/f9aa1502c8/log?d=${selected}` : '/x/f9aa1502c8/log'}>
        {current ? '개발 일지에서 일정 확인·수정' : '개발 일지에서 새 날짜 추가'}
      </Link></p>
    </div>
  </section>;
}
