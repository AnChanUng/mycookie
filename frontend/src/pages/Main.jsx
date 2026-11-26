import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { visitorId } from '../track';
import { useMembership, TIER_NAMES } from '../membership';
import { factForDay, koreanDay } from '../data/todayCs';
import TierBadge from '../components/TierBadge';
import LineIcon from '../components/LineIcon';
import StudyCoachEntry from '../components/StudyCoachEntry';
import HomeRank from '../components/HomeRank';
import HomeReview from '../components/HomeReview';
import { quoteForDay } from '../data/quotes';
import './Main.css';

// 바로가기 카드 아이콘(직접 그린 플랫 일러스트 SVG). 파일 이름이 카드의 icon 값이다
const HOME_ICONS = import.meta.glob('../assets/home-icons/*.svg', { eager: true, query: '?url', import: 'default' });

// 나의쿠키 메인. 디자인 시스템(styles/ds.css) 부품만으로 만든 벤토 그리드.
// 위쪽에서 "오늘 무엇을 할지"와 오늘 목표 진행을, 아래로 내려가며 바로가기를 보여 준다.
// 학습 기록 요약은 무거운 문제은행 데이터를 쓰므로 화면이 뜬 뒤에 불러온다(첫 화면을 가볍게)

const WEB_STUDY = [
  { to: '/web-essentials', icon: 'webnote', name: '웹노트', sub: 'HTTP · 쿠키와 세션 · CORS' },
  { to: '/web', icon: 'web', name: '웹', sub: 'Spring · JPA · DB · Servlet' },
  // AI는 문제집을 다듬는 중이라 웹과 한 구역에 둔다(다듬은 뒤 과목별 카드로 나눠 따로 뺀다)
  { to: '/ai', icon: 'ai', name: 'AI', sub: '딥러닝 · 머신러닝 · 빅데이터 AI' },
];
// 취업 준비 카드(첫 화면 구역마다 카드가 3개 이상 되게 맞춘다)
const CAREER_STUDY = [
  { to: '/interview', icon: 'interview', name: '면접 공통질문 연습', sub: '카메라로 실전처럼' },
  { to: '/certifications', icon: 'cert', name: '추천 자격증', sub: '개발 · 데이터 · AI · 클라우드' },
  { to: '/news', icon: 'news', name: '기업 소식', sub: '기술 블로그 · 뉴스룸 새 글' },
];
// 맨 위 "오늘의 목표" 고리 카드(오늘 할 일 구역과 겹쳐 숨긴다)
const SHOW_TODAY_STUDY = false;
const SHOW_COACH_ENTRY = false;
const PRACTICE = [
  { to: '/notes', icon: 'notes', name: '전공노트', sub: '개념 정리 · 운영체제 · 네트워크 · 데이터베이스' },
  { to: '/exam', icon: 'exam', name: '기업별 전공필기', sub: '금융공기업 · 공기업 전산직' },
  { to: '/topics', icon: 'topics', name: '주제별 통합 문제집', sub: '과목별로 모아 풀기' },
  { to: '/aptitude', icon: 'aptitude', name: 'NCS · 인적성', sub: '언어 · 수리 · 추리' },
  { to: '/calc', icon: 'calc', name: '계산 문제 무한 연습', sub: '서브넷 · 페이지 · 진법' },
  { to: '/bug-hunt', icon: 'bug', name: '버그 찾기', sub: '코드 읽고 원인 찾기' },
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
  const day = koreanDay();
  const today = factForDay(day);
  const [quote] = useState(quoteForDay);
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
      {/* 오늘의 명언: 첫 화면 맨 위 가운데 */}
      <figure className="mn-quote ds-rise">
        <blockquote>“{quote.text}”</blockquote>
        {quote.by && <figcaption>{quote.by}</figcaption>}
      </figure>

      {/* 인사 + 오늘 목표 */}
      <section className="mn-top">
        <div className="mn-hello">
          <p className="ds-eyebrow">{dateLabel}</p>
          <h1 className="mn-h1">{user?.nickname ? <>{user.nickname}님,<br />오늘은 뭘 공부해 볼까요?</> : '개발자 공부, 여기 다 있어요'}</h1>
          <p className="mn-sub">AI, 웹 개발, 컴퓨터공학 모든 공부를 한곳에서</p>
          <div className="mn-chips">
            {membership && <Link to="/account" className="ds-chip"><TierBadge tier={membership.tier} division={membership.division} />{TIER_NAMES[membership.tier]}</Link>}
            {learning?.streak > 0 && <Link to="/stats" className="ds-chip">{learning.streak}일 연속 학습</Link>}
            {membership?.nextTier && <span className="ds-chip ds-chip--soft">승급까지 {membership.remaining.toLocaleString()}문제</span>}
          </div>
          {/* 첫 화면은 단순하게: 이어서 풀기와 학습 숫자 칸은 두지 않는다(내 학습 화면에서 본다) */}
          <div className="mn-cta">
            <Link to="/cs" className="ds-btn ds-btn--primary">공부 시작하기</Link>
          </div>
        </div>
        {/* 실시간 순위: 첫 화면 맨 위 오른쪽(휴대폰에서는 인사 아래) */}
        <HomeRank />
        {SHOW_TODAY_STUDY && <Link to="/cs" className="mn-goal">
          <Ring value={todayDone} max={TODAY_GOAL} />
          <span>
            <small>오늘의 목표</small>
            <b>{goalDone ? '오늘 목표를 달성했어요' : `오늘의 CS ${TODAY_GOAL - todayDone}문제 남았어요`}</b>
          </span>
          <LineIcon name="chevron" size={18} className="mn-chev" />
        </Link>}
      </section>

      {/* AI 학습 코치 바로가기: 첫 화면에서는 숨긴다(상단 메뉴 /study-coach로 들어간다) */}
      {SHOW_COACH_ENTRY && <StudyCoachEntry />}

      {/* 학습 메일 연습에서 틀린 문제가 있으면 하루 3개 복습(없으면 안 보인다) */}
      <HomeReview />

      <Section id="mn-web" title="웹 & AI">
        <div className="mn-cards">{WEB_STUDY.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      <Section id="mn-practice" title="전공필기" more={{ to: '/exam', label: '전체 보기' }}>
        <div className="mn-cards">{PRACTICE.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      <Section id="mn-career" title="취업 준비">
        <div className="mn-cards">{CAREER_STUDY.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      {/* 오늘 할 일: 출석 → 오늘의 CS 5문제 → 오늘의 퀘스트 포인트, 그리고 친구와 대결 */}
      <Section id="mn-today" title="오늘 할 일">
        <div className="mn-cards">
          <Category to="/cs" icon="today" name="오늘의 CS" sub={goalDone ? `오늘 ${TODAY_GOAL}문제 완료!` : `${todayDone} / ${TODAY_GOAL} · ${today.t}`} />
          <Category to="/shop" icon="quest" name="오늘의 퀘스트" sub="하루 5 · 15 · 30문제 풀고 포인트 받기" />
          <Category to="/duel" icon="duel" name="친구와 CS 대결" sub="같은 10문제로 1:1 실시간 대결" />
        </div>
      </Section>
    </div>
  );
}

function Section({ id, title, note, more, children }) {
  return <section className="mn-section" aria-labelledby={id}>
    <div className="mn-section-head">
      <h2 id={id}>{title}</h2>
      {note && <span className="mn-note">{note}</span>}
      {more && <Link to={more.to} className="mn-section-more">{more.label} <LineIcon name="chevron" size={14} /></Link>}
    </div>
    {children}
  </section>;
}

function Category({ to, icon, name, sub }) {
  return <Link to={to} className="ds-card mn-cat">
    <img className="mn-cat-icon" src={HOME_ICONS[`../assets/home-icons/${icon}.svg`]} alt="" width="52" height="52" />
    <span className="mn-cat-text"><b>{name}</b><small>{sub}</small></span>
    <LineIcon name="chevron" size={18} className="mn-chev" />
  </Link>;
}
