import { useSyncExternalStore } from 'react';
import LineIcon from '../components/LineIcon';
import { Link } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { CS_NOTES } from '../data/csNotes';
import { WEB_ESSENTIALS } from '../data/webEssentials';
import { CS_NOTE_QUESTIONS } from '../data/csNoteQuestions';
import { WEB_NOTE_QUESTIONS } from '../data/webNoteQuestions';
import TodayCs from '../components/TodayCs';
import './MyLearning.css';
import './CsHub.css';

// CS · 면접: 흩어져 있던 기술면접 · 전공노트 · 웹 필수지식 · 면접 연습을 한곳에서 고른다.
// 진도는 각 화면이 쓰던 저장 위치를 그대로 읽기만 한다(저장 형식은 바꾸지 않음)

function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; }
}
const tokenSnapshot = () => account()?.token || '';

export default function CsHubPage() {
  useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const user = account();
  const notesDone = user ? Object.values(readJson(`cs-notes:v1:${user.nickname}`, {}) || {}).filter(v => v?.done).length : null;
  const notesTotal = CS_NOTES.reduce((n, s) => n + (s.items?.length || 0), 0);

  const tracks = [
    {
      to: '/notes', icon: 'book', title: '전공노트',
      body: '운영체제 · 네트워크 · 데이터베이스 · 자료구조를 주제별로 정리했어요.',
      done: notesDone, total: notesTotal, unit: '개념', hint: user ? null : '로그인하면 완료 표시가 저장돼요',
    },
    {
      to: '/web-essentials', icon: 'globe', title: '웹 필수지식',
      body: 'HTTP · 쿠키 · 세션 · JWT · CORS처럼 백엔드 면접 단골 질문을 문답으로.',
      total: WEB_ESSENTIALS.items.length, unit: '문답',
    },
    {
      to: '/cs/csnote', icon: 'pencil', title: '전공노트 문제풀이',
      body: '전공노트로 객관식 · 단답형을 풀고, 틀리면 해당 노트로 바로 돌아가 복습해요.',
      total: CS_NOTE_QUESTIONS.length, unit: '문항',
    },
    {
      to: '/web/webnote', icon: 'pencil', title: '웹노트 문제풀이',
      body: '웹 필수지식을 객관식 · 단답형으로 확인해요. 단답형은 바로 자동 채점돼요.',
      total: WEB_NOTE_QUESTIONS.length, unit: '문항',
    },
    {
      to: '/topics', icon: 'puzzle', title: '주제별 통합 문제집',
      body: '과목별로 모은 문제를 풀며 개념을 확인하고, 틀린 문제는 다시 풀어요.',
    },
    {
      to: '/interview', icon: 'video', title: '면접 공통질문 연습',
      body: '카메라를 켜고 자기소개 · 지원동기 같은 공통질문에 실제처럼 답해 봐요.',
    },
  ];

  return (
    <div className="ml cs-hub fade-in">
      <header className="ml-head">
        <p className="ml-eyebrow">컴퓨터공학</p>
        <h1>면접에서 막힘없이<br />설명할 수 있게</h1>
        <p className="ml-sub">개념을 읽고, 내 말로 말해 보고, 꼬리질문까지. 오늘 할 것을 골라 보세요.</p>
      </header>

      <section className="cs-tracks" aria-label="학습 메뉴">
        {tracks.map(t => {
          const pct = t.total && Number.isFinite(t.done) ? Math.min(100, Math.round(t.done / t.total * 100)) : null;
          return (
            <Link key={t.to} to={t.to} className="cs-track">
              <span className="cs-track-icon" aria-hidden="true"><LineIcon name={t.icon} /></span>
              <span className="cs-track-text">
                <b>{t.title}</b>
                <span>{t.body}</span>
                {t.total ? (
                  <span className="cs-track-meta">
                    {pct !== null ? <>{t.done} / {t.total} {t.unit}</> : <>{t.total} {t.unit}</>}
                    {t.hint && <em> · {t.hint}</em>}
                  </span>
                ) : null}
                {pct !== null && <span className="ml-bar"><i style={{ width: `${Math.max(pct, 2)}%` }} /></span>}
              </span>
              <span className="ml-go" aria-hidden="true">→</span>
            </Link>
          );
        })}
      </section>

      <section className="ml-section" aria-labelledby="cs-today">
        <h2 id="cs-today">오늘의 CS</h2>
        <TodayCs />
      </section>

      <section className="ml-section ml-panel cs-more" aria-labelledby="cs-more">
        <h2 id="cs-more">더 둘러보기</h2>
        <div className="cs-links">
          <Link to="/tech-blogs">기업 기술 블로그 →</Link>
          <Link to="/search">질문 검색 →</Link>
        </div>
      </section>
    </div>
  );
}
