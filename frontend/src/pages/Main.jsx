import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { visitorId } from '../track';
import { useMembership, TIER_NAMES } from '../membership';
import { factForDay, koreanDay } from '../data/todayCs';
import TierBadge from '../components/TierBadge';
import { quoteForDay } from '../data/quotes';
import './Main.css';

// 나의쿠키 메인. 디자인 시스템(styles/ds.css) 부품만으로 만든 벤토 그리드.
// 위쪽에서 "오늘 무엇을 할지"와 오늘 목표 진행을, 아래로 내려가며 바로가기를 보여 준다.
// 학습 기록 요약은 무거운 문제은행 데이터를 쓰므로 화면이 뜬 뒤에 불러온다(첫 화면을 가볍게)

const CODING_SITES = [
  { name: '백준', tag: 'BOJ', tone: 'brand', href: 'https://www.acmicpc.net/' },
  { name: '프로그래머스', tag: 'PG', tone: 'night', href: 'https://school.programmers.co.kr/learn/challenges' },
  { name: '코드트리', tag: 'CT', tone: 'green', href: 'https://www.codetree.ai/' },
  { name: '리트코드', tag: 'LC', tone: 'yellow', href: 'https://leetcode.com/problemset/' },
];
const PRACTICE = [
  { to: '/exam', icon: '🏢', name: '기업별 전공필기' },
  { to: '/topics', icon: '🧩', name: '주제별 통합 문제집' },
  { to: '/aptitude', icon: '🧠', name: 'NCS · 인적성' },
  { to: '/calc', icon: '🧮', name: '계산 문제 무한 연습' },
  { to: '/bug-hunt', icon: '🐞', name: '버그 찾기' },
];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const TODAY_GOAL = 5;
const tokenSnapshot = () => account()?.token || '';

// 오늘의 CS 5문제 중 몇 개를 풀었는지(오늘의 CS가 쓰는 저장 위치를 읽기만 한다)
function readTodayDone(day) {
  const identity = account() ? `account:${account().id || account().token}` : `visitor:${visitorId()}`;
  try {
    const saved = JSON.parse(localStorage.getItem(`today-cs:v1:${day}:${identity}`));
    return saved && typeof saved === 'object' ? Math.min(TODAY_GOAL, Object.keys(saved).length) : 0;
  } catch { return 0; }
}

// 마지막으로 풀다 만 문제(또는 최근 본 문제집)
function readContinue() {
  const visible = to => typeof to === 'string' && !/^\/(ssafy|exam\/ssafy)/.test(to);
  try {
    let best = null;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('exam-resume:')) continue;
      try {
        const r = JSON.parse(localStorage.getItem(key));
        if (visible(r?.to) && Array.isArray(r.ids) && (!best || (r.at || 0) > (best.at || 0))) best = r;
      } catch { /* 깨진 항목은 건너뛴다 */ }
    }
    if (best) {
      const answered = Object.keys(best.answers || {}).length;
      return { to: `${best.to}?resume=1`, name: best.name, detail: `${answered} / ${best.ids.length} 답변`, pct: Math.round(answered / best.ids.length * 100) };
    }
    const last = JSON.parse(localStorage.getItem('exam:last'));
    if (visible(last?.to) && last.name) return { to: last.to, name: last.name, detail: '최근에 본 문제집' };
  } catch { /* 저장소를 못 쓰면 없음 */ }
  return null;
}

function Ring({ value, max }) {
  const r = 26, c = 2 * Math.PI * r, pct = max ? Math.min(1, value / max) : 0;
  return (
    <svg className="mn-ring" viewBox="0 0 64 64" role="img" aria-label={`오늘의 CS ${value} / ${max}`}>
      <circle cx="32" cy="32" r={r} className="mn-ring-track" />
      <circle cx="32" cy="32" r={r} className="mn-ring-fill" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
      <text x="32" y="37" textAnchor="middle">{value}/{max}</text>
    </svg>
  );
}

export default function Main() {
  useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const user = account();
  const { membership } = useMembership();
  const [learning, setLearning] = useState(null);
  const [resume] = useState(readContinue);
  const day = koreanDay();
  const today = factForDay(day);
  const quote = quoteForDay(day);
  const [todayDone] = useState(() => readTodayDone(day));
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;

  useEffect(() => {
    let alive = true;
    import('../learningStats')
      .then(m => { if (alive) setLearning({ ...m.collectLearning(account()), notesTotal: m.NOTES_TOTAL }); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const goalDone = todayDone >= TODAY_GOAL;

  return (
    <div className="mn">
      <figure className="mn-quote ds-rise">
        <blockquote>“{quote.text}”</blockquote>
        <figcaption>{quote.by}</figcaption>
      </figure>
      {/* 인사 + 오늘 목표 */}
      <section className="mn-top">
        <div className="mn-hello ds-rise">
          <p className="ds-eyebrow">{dateLabel}</p>
          <h1 className="ds-h1">
            {user?.nickname ? <>{user.nickname}님,<span className="mn-br" /> 오늘 할 공부예요</> : <>개발자 취업 준비,<span className="mn-br" /> 오늘은 여기서 시작해요</>}
          </h1>
          <div className="mn-chips">
            {membership && <Link to="/account" className="ds-chip"><TierBadge tier={membership.tier} division={membership.division} />{TIER_NAMES[membership.tier]}</Link>}
            <Link to="/stats" className="ds-chip"><span aria-hidden="true">🔥</span>{learning ? `${learning.streak}일 연속` : '연속 학습'}</Link>
            {membership?.nextTier && <span className="ds-chip ds-chip--soft">승급까지 {membership.remaining.toLocaleString()}문제</span>}
          </div>
        </div>
        <Link to="/cs" className="ds-card mn-goal ds-rise" style={{ '--d': 1 }}>
          <Ring value={todayDone} max={TODAY_GOAL} />
          <div>
            <small className="ds-caption">오늘의 목표</small>
            <b className="ds-title">{goalDone ? '오늘 목표 달성! 🎉' : `오늘의 CS ${TODAY_GOAL - todayDone}문제 남았어요`}</b>
            <span className="ds-link">{goalDone ? '복습하러 가기' : '이어서 풀기'} →</span>
          </div>
        </Link>
      </section>

      <div className="mn-grid">
        {/* 오늘의 CS */}
        <Link to="/cs" className="ds-card ds-card--brand mn-today ds-rise" style={{ '--d': 2 }}>
          <span className="ds-badge ds-badge--glass">오늘의 CS</span>
          <h2 className="ds-h2">{today.t}</h2>
          <p className="ds-text-2 ds-clamp-2">{today.s}</p>
          <span className="mn-go">오늘의 5문제 풀기 <span aria-hidden="true">→</span></span>
          <span className="mn-cookie" aria-hidden="true">🍪</span>
        </Link>

        {/* 실시간 대결 */}
        <Link to="/duel" className="ds-card ds-card--night mn-duel ds-rise" style={{ '--d': 3 }}>
          <span className="ds-badge ds-badge--glass ds-badge--live">실시간 대결</span>
          <h2 className="ds-h2">같은 10문제로<span className="mn-br" /> 지금 겨뤄요</h2>
          <div className="mn-players" aria-hidden="true"><span>🍪</span><span>🥠</span><span>🧁</span><span>🍩</span><i>+</i></div>
          <span className="mn-go">대결 시작하기 <span aria-hidden="true">→</span></span>
        </Link>

        {/* 이어서 하기 */}
        <Link to={resume?.to || '/exam'} className="ds-card mn-small mn-continue ds-rise" style={{ '--d': 4 }}>
          <span className="ds-icon ds-icon--sm" aria-hidden="true">▶</span>
          <small className="ds-caption">{resume ? '이어서 하기' : '처음이라면'}</small>
          <b className="ds-title ds-clamp-2">{resume ? resume.name : '실전 문제부터 풀어 봐요'}</b>
          {resume?.pct != null
            ? <span className="ds-bar" aria-label={`진행 ${resume.pct}%`}><i style={{ width: `${Math.max(resume.pct, 4)}%` }} /></span>
            : <span className="ds-caption ds-text-3">{resume ? resume.detail : '기업별 · 주제별 문제집'}</span>}
        </Link>

        {/* 내 학습 */}
        <Link to="/stats" className="ds-card mn-small ds-rise" style={{ '--d': 5 }}>
          <span className="ds-icon ds-icon--sm ds-icon--cookie" aria-hidden="true">📊</span>
          <small className="ds-caption">내 학습</small>
          <div className="mn-stats">
            <div className="ds-stat"><b>{learning ? learning.week : '–'}</b><span>이번 주</span></div>
            <div className="ds-stat"><b>{learning?.rate ?? '–'}{learning?.rate != null && <em>%</em>}</b><span>정답률</span></div>
            <div className="ds-stat"><b>{learning ? learning.solved.toLocaleString() : '–'}</b><span>누적</span></div>
          </div>
        </Link>

        {/* 다시 풀기 */}
        <Link to="/weak" className="ds-card mn-small ds-rise" style={{ '--d': 6 }}>
          <span className="ds-icon ds-icon--sm ds-icon--red" aria-hidden="true">↺</span>
          <small className="ds-caption">다시 풀기</small>
          <b className="ds-title">{learning?.wrongOpen ? `틀린 문제 ${learning.wrongOpen}개` : '남은 오답이 없어요'}</b>
          <span className="ds-caption ds-text-3">{learning?.weak?.[0] ? `약한 주제 · ${learning.weak[0].name} ${learning.weak[0].rate}%` : '풀수록 약한 주제를 알려 드려요'}</span>
        </Link>

        {/* 코딩테스트 */}
        <section className="ds-card mn-half ds-rise" style={{ '--d': 7 }} aria-labelledby="mn-coding">
          <div className="ds-section-head"><h2 id="mn-coding">코딩테스트</h2><span className="ds-caption ds-text-3">새 탭에서 열려요</span></div>
          <div className="mn-sites">
            {CODING_SITES.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className="ds-tile">
                <span className={`mn-site-tag tone-${s.tone}`} aria-hidden="true">{s.tag}</span>
                {s.name}
                <span className="sr-only">(새 탭에서 열림)</span>
              </a>
            ))}
          </div>
        </section>

        {/* CS · 면접 */}
        <section className="ds-card mn-half ds-rise" style={{ '--d': 8 }} aria-labelledby="mn-cs">
          <div className="ds-section-head"><h2 id="mn-cs">CS · 면접</h2><Link to="/cs">전체 보기</Link></div>
          <ul className="ds-list">
            <li><Link to="/notes" className="ds-list-item"><span className="ds-icon ds-icon--sm" aria-hidden="true">📚</span><b>전공노트</b><small>{learning ? `${learning.notesDone} / ${learning.notesTotal}` : '운영체제 · 네트워크'}</small></Link></li>
            <li><Link to="/web-essentials" className="ds-list-item"><span className="ds-icon ds-icon--sm ds-icon--green" aria-hidden="true">🌐</span><b>웹 필수지식</b><small>57문답</small></Link></li>
            <li><Link to="/interview" className="ds-list-item"><span className="ds-icon ds-icon--sm ds-icon--cookie" aria-hidden="true">🎥</span><b>면접 공통질문 연습</b><small>카메라로 실전처럼</small></Link></li>
          </ul>
        </section>

        {/* 실전 문제집 */}
        <section className="mn-wide mn-practice ds-rise" style={{ '--d': 9 }} aria-labelledby="mn-practice">
          <div className="ds-section-head"><h2 id="mn-practice">실전 문제집</h2><Link to="/exam">전체 보기</Link></div>
          <div className="mn-pills">
            {PRACTICE.map(p => <Link key={p.to} to={p.to} className="ds-chip mn-pill"><span aria-hidden="true">{p.icon}</span>{p.name}</Link>)}
          </div>
        </section>

        {/* 소개 */}
        <Link to="/intro" className="ds-card ds-card--soft mn-wide mn-intro ds-rise" style={{ '--d': 10 }}>
          <span className="mn-intro-art" aria-hidden="true">🍪</span>
          <span className="mn-intro-text">
            <small className="ds-caption">나의쿠키가 처음이라면</small>
            <b className="ds-title">개발자 취업 준비, 이제 쿠키 하나로</b>
          </span>
          <span className="ds-btn ds-btn--primary ds-btn--sm">서비스 소개 보기</span>
        </Link>
      </div>
    </div>
  );
}
