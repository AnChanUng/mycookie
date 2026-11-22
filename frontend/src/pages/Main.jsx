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
import { quoteForVisit, rememberQuote } from '../data/quotes';
import './Main.css';

// 나의쿠키 메인. 디자인 시스템(styles/ds.css) 부품만으로 만든 벤토 그리드.
// 위쪽에서 "오늘 무엇을 할지"와 오늘 목표 진행을, 아래로 내려가며 바로가기를 보여 준다.
// 학습 기록 요약은 무거운 문제은행 데이터를 쓰므로 화면이 뜬 뒤에 불러온다(첫 화면을 가볍게)

const CODING_SITES = [
  { name: '백준', sub: '단계별 문제 · 삼성 기출', href: 'https://www.acmicpc.net/' },
  { name: '프로그래머스', sub: '기업 코딩테스트 연습', href: 'https://school.programmers.co.kr/learn/challenges' },
  { name: '코드트리', sub: '유형별 커리큘럼', href: 'https://www.codetree.ai/' },
  { name: '리트코드', sub: '해외 기업 대비', href: 'https://leetcode.com/problemset/' },
];
const CS_STUDY = [
  { to: '/notes', icon: 'book', name: '전공노트', sub: '운영체제 · 네트워크 · 데이터베이스' },
];
const AI_STUDY = [
  { to: '/ai', icon: 'brain', name: 'AI', sub: '딥러닝 · 머신러닝 · 빅데이터 AI' },
];
const WEB_STUDY = [
  { to: '/web', icon: 'code', name: '웹', sub: 'Spring · JPA · DB · Servlet' },
  { to: '/web-essentials', icon: 'globe', name: '웹 필수지식', sub: 'HTTP · 쿠키와 세션 · CORS' },
];
// 오늘의 CS · 대결 · 이어서 하기 카드 묶음. 쓰임새를 다시 정할 때까지 숨긴다
const SHOW_TODAY_STUDY = false;
const SHOW_COACH_ENTRY = false;
const PRACTICE = [
  { to: '/exam', icon: 'building', name: '기업별 전공필기', sub: '금융공기업 · 공기업 전산직' },
  { to: '/topics', icon: 'puzzle', name: '주제별 통합 문제집', sub: '과목별로 모아 풀기' },
  { to: '/aptitude', icon: 'brain', name: 'NCS · 인적성', sub: '언어 · 수리 · 추리' },
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
  const [quote] = useState(quoteForVisit);
  useEffect(() => { rememberQuote(quote); }, [quote]);
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
        <div className="mn-hello">
          <p className="ds-eyebrow">{dateLabel}</p>
          <h1 className="mn-h1">{user?.nickname ? `${user.nickname}님, 오늘은 뭘 공부해 볼까요?` : '개발자 공부, 여기 다 있어요'}</h1>
          <p className="mn-sub">AI, 웹 개발, 컴퓨터공학 모든 공부를 한곳에서</p>
          <div className="mn-chips">
            {membership && <Link to="/account" className="ds-chip"><TierBadge tier={membership.tier} division={membership.division} />{TIER_NAMES[membership.tier]}</Link>}
            {learning?.streak > 0 && <Link to="/stats" className="ds-chip">{learning.streak}일 연속 학습</Link>}
            {membership?.nextTier && <span className="ds-chip ds-chip--soft">승급까지 {membership.remaining.toLocaleString()}문제</span>}
          </div>
          {/* 풀다 만 문제집이 있으면 시작 버튼이 곧 이어서 풀기가 된다(따로 한 줄을 차지하지 않게) */}
          <div className="mn-cta">
            {resume
              ? <Link to={resume.to} className="ds-btn ds-btn--primary mn-cta-resume" title={`${resume.name} · ${resume.detail}`}>
                <span>이어서 풀기</span><b>{resume.name}</b>
              </Link>
              : <Link to="/cs" className="ds-btn ds-btn--primary">공부 시작하기</Link>}
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

      {/* 오늘의 학습: 쓰임새를 다시 정할 때까지 숨겨 둔다(SHOW_TODAY_STUDY) */}
      {SHOW_TODAY_STUDY && <Section id="mn-today" title="오늘의 학습">
        <div className="mn-cards">
          <Link to="/cs" className="ds-card mn-feature mn-feature--brand">
            <span className="mn-tag">오늘의 CS</span>
            <b className="mn-feature-title">{today.t}</b>
            <p className="ds-clamp-2">{today.s}</p>
            <span className="mn-more">오늘의 5문제 풀기 <LineIcon name="chevron" size={16} /></span>
          </Link>
          <Link to="/duel" className="ds-card mn-feature">
            <span className="mn-tag mn-tag--live">실시간 대결</span>
            <b className="mn-feature-title">같은 10문제로 지금 겨뤄요</b>
            <p>1:1 대결과 단체전. 점수는 서버가 직접 채점해요.</p>
            <span className="mn-more">대결 시작하기 <LineIcon name="chevron" size={16} /></span>
          </Link>
          <Link to={resume?.to || '/exam'} className="ds-card mn-feature">
            <span className="mn-tag">{resume ? '이어서 하기' : '처음이라면'}</span>
            <b className="mn-feature-title ds-clamp-2">{resume ? resume.name : '실전 문제부터 풀어 봐요'}</b>
            {resume?.pct != null
              ? <span className="ds-bar" aria-label={`진행 ${resume.pct}%`}><i style={{ width: `${Math.max(resume.pct, 4)}%` }} /></span>
              : <p>{resume ? resume.detail : '기업별, 주제별 문제집으로 바로 시작해요.'}</p>}
            <span className="mn-more">{resume ? '이어서 풀기' : '문제집 고르기'} <LineIcon name="chevron" size={16} /></span>
          </Link>
        </div>
      </Section>}

      <Section id="mn-cs" title="전공노트">
        <div className="mn-cards mn-cards--single">{CS_STUDY.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      <Section id="mn-ai" title="AI">
        <div className="mn-cards mn-cards--single">{AI_STUDY.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      <Section id="mn-web" title="웹">
        <div className="mn-cards mn-cards--2">{WEB_STUDY.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      <Section id="mn-practice" title="전공필기" note={<>개념은 <Link to="/notes">전공노트</Link>에서 먼저 보세요</>} more={{ to: '/exam', label: '전체 보기' }}>
        <div className="mn-cards">{PRACTICE.map(item => <Category key={item.to} {...item} />)}</div>
      </Section>

      <Section id="mn-coding" title="코딩테스트" note="외부 사이트로 새 탭에서 열려요">
        <div className="mn-cards mn-cards--4">
          {CODING_SITES.map(site => (
            <a key={site.name} href={site.href} target="_blank" rel="noopener noreferrer" className="ds-card mn-cat">
              <span className="mn-cat-icon"><LineIcon name="code" /></span>
              <span className="mn-cat-text"><b>{site.name}</b><small>{site.sub}</small></span>
              <LineIcon name="external" size={16} className="mn-chev" />
              <span className="sr-only">(새 탭에서 열림)</span>
            </a>
          ))}
        </div>
      </Section>

      <Section id="mn-interview" title="면접 연습">
        <div className="mn-cards mn-cards--single">
          <Category to="/interview" icon="video" name="면접 공통질문 연습" sub="카메라로 실전처럼" />
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
    <span className="mn-cat-icon"><LineIcon name={icon} /></span>
    <span className="mn-cat-text"><b>{name}</b><small>{sub}</small></span>
    <LineIcon name="chevron" size={18} className="mn-chev" />
  </Link>;
}
