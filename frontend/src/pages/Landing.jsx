import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { account } from '../sync';
import { STUDY_PATH } from '../data/trackIntros';
import './Landing.css';

// 리뉴얼 홈. 큰 문구로 시작해 스크롤하면 기능을 하나씩 소개한다(토스 스타일).
// 화면에 들어온 구역에 is-visible을 붙여 떠오르게 하고, 움직임 줄이기 설정이면 바로 보여 준다

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const items = root.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(el => el.classList.add('is-visible'));
      return undefined;
    }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

// 화면에 들어오면 0부터 목표 숫자까지 올라간다
function CountUp({ to, suffix = '' }) {
  const ref = useRef(null);
  // 움직임 줄이기 설정이거나 관찰 기능이 없으면 처음부터 목표 숫자를 보여 준다
  const [still] = useState(() => typeof window === 'undefined' || !('IntersectionObserver' in window) || !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [value, setValue] = useState(still ? to : 0);
  useEffect(() => {
    const el = ref.current;
    if (!el || still) return undefined;
    let frame;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / 1200);
        setValue(Math.round(to * (1 - Math.pow(1 - t, 3))));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(frame); };
  }, [to, still]);
  return <span ref={ref}>{value.toLocaleString('ko-KR')}{suffix}</span>;
}

const FEATURES = [
  {
    key: 'interview',
    eyebrow: 'CS · 면접',
    title: ['면접 질문, 먼저 말해 보고', '답을 펼쳐 보세요'],
    body: '전공노트와 웹 필수지식을 주제별로 정리했어요. 직접 설명해 본 뒤 정리된 답으로 빈틈을 채워요.',
    to: '/cs',
    cta: 'CS · 면접 준비하기',
    visual: 'interview',
  },
  {
    key: 'duel',
    eyebrow: '실전',
    title: ['같은 10문제로', '실시간으로 겨뤄요'],
    body: '친구와 1:1로, 또는 여럿이 단체전으로. 점수는 서버가 채점해서 공정하고, 끝나면 문제별로 서로의 답을 비교해요.',
    to: '/duel',
    cta: '대결 시작하기',
    visual: 'duel',
  },
  {
    key: 'coding',
    eyebrow: '코딩테스트',
    title: ['코딩테스트는', '유형별로 차근차근'],
    body: '정렬 · 탐색 · DP · 그래프처럼 자주 나오는 유형을 모아 풀이를 정리했어요.',
    to: '/algo',
    cta: '코테 둘러보기',
    visual: 'coding',
  },
  {
    key: 'me',
    eyebrow: '내 학습',
    title: ['오늘 할 일과 약점을', '한눈에 확인해요'],
    body: '푼 문제와 오답이 계정에 쌓이고, 여러 기기에서 이어져요. 풀수록 티어가 오르고 약한 주제를 다시 풀 수 있어요.',
    to: '/stats',
    cta: '내 학습 보기',
    visual: 'me',
  },
];

function Visual({ kind }) {
  if (kind === 'interview') return (
    <div className="lv-stack" aria-hidden="true">
      <div className="lv-card lv-card-back">TCP 연결을 끊을 때 TIME_WAIT은 왜 필요할까요?</div>
      <div className="lv-card lv-card-mid">JPA에서 save 없이 값만 바꿔도 업데이트되는 이유는?</div>
      <div className="lv-card lv-card-front">
        <span className="lv-chip">운영체제</span>
        <strong>프로세스와 스레드는 메모리 측면에서 무엇이 다른가요?</strong>
        <span className="lv-line" /><span className="lv-line short" />
        <span className="lv-btn">답변 펼치기</span>
      </div>
    </div>
  );
  if (kind === 'duel') return (
    <div className="lv-panel" aria-hidden="true">
      <div className="lv-panel-head"><span>단체전 · 데이터베이스</span><span className="lv-live">LIVE</span></div>
      {[['쿠키러버', 9, '1:42'], ['나', 8, '1:35'], ['알고왕', 8, '2:10']].map(([name, score, time], i) => (
        <div key={name} className={`lv-row${name === '나' ? ' me' : ''}`}>
          <span className="lv-rank">{i + 1}</span><span className="lv-name">{name}</span>
          <span className="lv-bar"><i style={{ width: `${score * 10}%` }} /></span>
          <span className="lv-score">{score}/10</span><span className="lv-time">{time}</span>
        </div>
      ))}
    </div>
  );
  if (kind === 'coding') return (
    <div className="lv-chips" aria-hidden="true">
      {['정렬', '이분 탐색', 'DFS · BFS', '다익스트라', 'DP', '투 포인터', '비트마스크', '구현'].map((t, i) => (
        <span key={t} className="lv-pill" style={{ '--i': i }}>{t}</span>
      ))}
    </div>
  );
  return (
    <div className="lv-panel lv-dash" aria-hidden="true">
      <div className="lv-dash-top">
        <div><small>연속 학습</small><b>12일</b></div>
        <div><small>이번 주 풀이</small><b>86문제</b></div>
        <div><small>티어</small><b>골드 Ⅲ</b></div>
      </div>
      <small className="lv-dash-label">약한 주제</small>
      {[['네트워크', 58], ['운영체제', 71], ['데이터베이스', 83]].map(([t, v]) => (
        <div key={t} className="lv-meter"><span>{t}</span><span className="lv-bar"><i style={{ width: `${v}%` }} /></span><b>{v}%</b></div>
      ))}
    </div>
  );
}

export default function Landing() {
  const ref = useReveal();
  // 메뉴의 "만든 이야기"(#story), "만든 사람들"(#team), "공부하는 법"(#how)으로 오면 그 구역으로 바로 내려간다
  const { hash, key } = useLocation();
  useEffect(() => {
    if (!["#story", "#team", "#how"].includes(hash)) return;
    const id = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(id);
  }, [hash, key]);
  const signedIn = !!account()?.token;
  return (
    <div className="landing" ref={ref}>
      <section className="l-hero">
        <div className="l-hero-glow" aria-hidden="true" />
        <div className="l-wrap">
          <p className="l-eyebrow" data-reveal>나의쿠키</p>
          <h1 className="l-hero-title" data-reveal>개발자 취업 준비,<br />이제 쿠키 하나로.</h1>
          <p className="l-hero-sub" data-reveal>CS · 기술면접부터 코딩테스트, 실전 대결까지.<br />매일 조금씩 쌓아서 합격까지 이어지게.</p>
          <div className="l-cta" data-reveal>
            {signedIn
              ? <Link to="/stats" className="l-btn primary">내 학습 이어가기</Link>
              : <Link to="/cs" className="l-btn primary">지금 시작하기</Link>}
            <Link to="/duel" className="l-btn ghost">실전 대결 해보기</Link>
          </div>
        </div>
        <a href="#l-features" className="l-scroll" aria-label="기능 소개로 내려가기"><span /></a>
      </section>

      {/* 만든 이야기: 어디까지 공부해야 할지 고민하던 취업 준비생이 이 사이트를 만든 이유 */}
      <section id="story" className="l-story" aria-labelledby="l-story-title">
        <div className="l-wrap l-story-wrap">
          <p className="l-eyebrow" data-reveal>나의쿠키를 만든 이유</p>
          <h2 id="l-story-title" data-reveal>어디까지 공부해야 할까,<br />매일 고민했어요</h2>
          <div className="l-story-body">
            <p data-reveal>
              개발자로 취업을 준비하면서 가장 많이 한 고민은 <b>"어디까지 깊게 알아야 할까"</b>였어요.
              자료구조를 다시 봐야 할지, 스프링을 더 파야 할지, 요즘 다들 한다는 AI는 어디서부터 시작해야 할지요.
              개발자 로드맵을 찾아볼수록 해야 할 것만 끝없이 늘어나더라고요.
            </p>
            <p data-reveal>
              예전에는 백엔드나 프론트엔드 하나만 잘 알아도 괜찮았어요. 그런데 지금은 조금 달라요.
              당장 쓰지 않더라도 <b>AI, 인프라, 백엔드를 고루 이해하고, 그중 한 분야는 깊게 아는 사람</b>이 필요하다고 생각해요.
            </p>
            <p data-reveal>
              돌아보면 이 흐름은 예전에도 변한 적이 없었어요. 기술 이름만 바뀌었을 뿐,
              넓게 이해하고 하나를 깊게 판 사람이 언제나 좋은 개발자였거든요.
            </p>
            <p data-reveal>
              그래서 <b>컴퓨터공학 기초부터 웹 개발, AI까지 한곳에서 넓게 훑어보고, 내가 깊게 파고 싶은 분야를 찾을 수 있는</b> 나의쿠키를 만들었어요.
              쿠키를 하나씩 모으듯, 하루에 한 문제씩 쌓아 가면 돼요.
            </p>
          </div>
          <ul className="l-story-points">
            <li data-reveal><b>넓게 이해하기</b><span>컴퓨터공학 · 웹 개발 · AI · 인프라를 고루</span></li>
            <li data-reveal><b>하나는 깊게</b><span>내가 고른 분야는 면접에서 막히지 않을 만큼</span></li>
            <li data-reveal><b>매일 조금씩</b><span>하루 한 문제라도 꾸준히 쌓기</span></li>
          </ul>
        </div>
      </section>

      {/* 만든 사람들: SSAFY에서 시작해 개인 사이트에서 팀으로 */}
      <section id="team" className="l-story l-team" aria-labelledby="l-team-title">
        <div className="l-wrap l-story-wrap">
          <p className="l-eyebrow" data-reveal>만든 사람들</p>
          <h2 id="l-team-title" data-reveal>SSAFY에서<br />시작한 팀이에요</h2>
          <div className="l-story-body">
            <p data-reveal>
              나의쿠키는 <b>삼성 청년 SW·AI 아카데미(SSAFY)</b>에서 시작했어요.
              처음에는 전공시험을 준비하면서 <b>친한 형과 같이 공부하려고 만든 개인 사이트</b>였어요.
            </p>
            <p data-reveal>
              그러다 반 친구들에게도 공유하게 되었고, 우리 서비스를 더 잘 만들어 줄 <b>멋진 팀원</b>을 만나
              지금은 <b>2명이 함께 개발</b>하고 있어요.
            </p>
          </div>
          <ul className="l-story-points">
            <li data-reveal><b>둘이 공부하던 사이트</b><span>전공시험 준비를 친한 형과 함께</span></li>
            <li data-reveal><b>우리 반에 공유</b><span>SSAFY 16기 대전 4반 친구들이 첫 사용자로</span></li>
            <li data-reveal><b>2인 개발팀</b><span>서비스를 더 잘 만들어 줄 팀원과 함께</span></li>
          </ul>
        </div>
      </section>

      {/* 공부하는 법: 사이트 전체를 어떤 순서로 쓰면 좋은지(메뉴마다의 본질은 각 메뉴 첫 화면의 TrackIntro) */}
      <section id="how" className="l-story l-how" aria-labelledby="l-how-title">
        <div className="l-wrap l-story-wrap">
          <p className="l-eyebrow" data-reveal>공부하는 법</p>
          <h2 id="l-how-title" data-reveal>나의쿠키,<br />이렇게 공부하세요</h2>
          <p className="l-how-lead" data-reveal>처음이라 어디서부터 할지 모르겠다면 이 순서를 따라 해 보세요. 메뉴마다 첫 화면에 그 분야를 왜, 어떻게 공부하면 좋은지도 적어 두었어요.</p>
          <ol className="l-how-steps">
            {STUDY_PATH.map((step, i) => <li key={step.title} data-reveal>
              <span className="l-how-no" aria-hidden="true">{i + 1}</span>
              <div><b>{step.title}</b><p>{step.body}</p><Link to={step.to} className="l-link">바로 가기 <span aria-hidden="true">→</span></Link></div>
            </li>)}
          </ol>
        </div>
      </section>

      <div id="l-features">
        {FEATURES.map((f, i) => (
          <section key={f.key} className={`l-feature${i % 2 ? ' flip' : ''}`}>
            <div className="l-wrap l-feature-grid">
              <div className="l-feature-text" data-reveal>
                <p className="l-eyebrow">{f.eyebrow}</p>
                <h2>{f.title[0]}<br />{f.title[1]}</h2>
                <p>{f.body}</p>
                <Link to={f.to} className="l-link">{f.cta} <span aria-hidden="true">→</span></Link>
              </div>
              <div className="l-feature-visual" data-reveal><Visual kind={f.visual} /></div>
            </div>
          </section>
        ))}

        <section className="l-feature l-ai">
          <div className="l-wrap l-feature-grid">
            <div className="l-feature-text" data-reveal>
              <p className="l-eyebrow">AI 학습 도우미 <span className="l-soon">준비 중</span></p>
              <h2>근거 있는 답만 하는<br />AI 학습 도우미</h2>
              <p>전공 학습 자료에서 근거를 찾아 답하고, 자료에 없는 질문에는 지어내지 않고 답하지 않아요. 답변 문장마다 근거가 있는지 다시 확인해요.</p>
            </div>
            <div className="l-feature-visual" data-reveal>
              <div className="lv-chat" aria-hidden="true">
                <p className="lv-q">교착 상태가 생기는 조건은?</p>
                <p className="lv-a">상호 배제, 점유와 대기, 비선점, 순환 대기 네 조건이 모두 성립할 때 생겨요.<span className="lv-ok">근거 있음</span></p>
                <p className="lv-src">근거 · 운영체제 › 데드락</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="l-numbers">
        <div className="l-wrap">
          <h2 data-reveal>지금 준비할 수 있는 것들</h2>
          <div className="l-number-grid">
            {[[169, '개', '전공 개념 정리'], [57, '개', '웹 필수지식 문답'], [109, '개', '전공 학습 문서'], [1393, '문제', '대결 문제']].map(([n, unit, label]) => (
              <div key={label} className="l-number" data-reveal>
                <b><CountUp to={n} /></b><span>{unit}</span>
                <p>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="l-final">
        <div className="l-wrap" data-reveal>
          <h2>오늘의 한 문제부터<br />시작해 볼까요?</h2>
          <Link to={signedIn ? '/stats' : '/cs'} className="l-btn light">{signedIn ? '내 학습 이어가기' : '무료로 시작하기'}</Link>
          <p className="l-all"><Link to="/all">모든 학습 메뉴 보기 →</Link></p>
        </div>
      </section>
    </div>
  );
}
