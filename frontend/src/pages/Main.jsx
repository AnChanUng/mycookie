import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { account, onAccountChange } from '../sync';
import { useMembership, TIER_NAMES } from '../membership';
import { factForDay, koreanDay } from '../data/todayCs';
import TierBadge from '../components/TierBadge';
import './Main.css';

// 나의쿠키 메인. 로그인 여부와 상관없이 "오늘 무엇을 할지"가 바로 보이는 벤토 그리드 홈.
// 서비스 소개(스크롤 스토리)는 /intro로 옮겼다. 학습 기록 요약은 무거운 문제은행 데이터를 쓰므로 화면이 뜬 뒤에 불러온다

const CODING_SITES = [
  { name: '백준', tag: 'BOJ', href: 'https://www.acmicpc.net/' },
  { name: '프로그래머스', tag: 'PG', href: 'https://school.programmers.co.kr/learn/challenges' },
  { name: '코드트리', tag: 'CT', href: 'https://www.codetree.ai/' },
  { name: '리트코드', tag: 'LC', href: 'https://leetcode.com/problemset/' },
];

const PRACTICE = [
  { to: '/exam', icon: '🏢', name: '기업별 전공필기' },
  { to: '/topics', icon: '🧩', name: '주제별 통합 문제집' },
  { to: '/aptitude', icon: '🧠', name: 'NCS · 인적성' },
  { to: '/calc', icon: '🧮', name: '계산 문제 무한 연습' },
  { to: '/bug-hunt', icon: '🐞', name: '버그 찾기' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const tokenSnapshot = () => account()?.token || '';

// 마지막으로 풀다 만 문제(또는 최근 본 문제집)
function readContinue() {
  try {
    let best = null;
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('exam-resume:')) continue;
      try {
        const r = JSON.parse(localStorage.getItem(key));
        if (typeof r?.to === 'string' && !/^\/(ssafy|exam\/ssafy)/.test(r.to) && Array.isArray(r.ids) && (!best || (r.at || 0) > (best.at || 0))) best = r;
      } catch { /* 깨진 항목은 건너뛴다 */ }
    }
    if (best) return { to: `${best.to}?resume=1`, name: best.name, detail: `${Object.keys(best.answers || {}).length} / ${best.ids.length} 답변` };
    const last = JSON.parse(localStorage.getItem('exam:last'));
    if (typeof last?.to === 'string' && last.name && !/^\/(ssafy|exam\/ssafy)/.test(last.to)) return { to: last.to, name: last.name, detail: '최근에 본 문제집' };
  } catch { /* 저장소를 못 쓰면 없음으로 */ }
  return null;
}

export default function Main() {
  useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const user = account();
  const { membership } = useMembership();
  const [learning, setLearning] = useState(null);
  const [resume] = useState(readContinue);
  const today = factForDay(koreanDay());
  const now = new Date();
  const dateLabel = `${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;

  useEffect(() => {
    let alive = true;
    import('../learningStats').then(m => { if (alive) setLearning({ ...m.collectLearning(account()), notesTotal: m.NOTES_TOTAL }); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="mn">
      <header className="mn-hello">
        <div>
          <p className="mn-date">{dateLabel}</p>
          <h1>{user?.nickname ? <>{user.nickname}님,<br />오늘도 쿠키 하나 구워 볼까요?</> : <>오늘도<br />쿠키 하나 구워 볼까요?</>}</h1>
        </div>
        <div className="mn-chips">
          {membership && (
            <Link to="/account" className="mn-chip"><TierBadge tier={membership.tier} division={membership.division} /> {TIER_NAMES[membership.tier]}</Link>
          )}
          <Link to="/stats" className="mn-chip"><span aria-hidden="true">🔥</span> {learning ? `${learning.streak}일 연속` : '연속 학습'}</Link>
        </div>
      </header>

      <div className="mn-bento">
        <Link to="/cs" className="mn-card mn-today mn-span-7" style={{ '--d': 0 }}>
          <span className="mn-badge">오늘의 CS</span>
          <h2>{today.t}</h2>
          <p>{today.s}</p>
          <span className="mn-cta">오늘의 5문제 풀기 <span aria-hidden="true">→</span></span>
          <span className="mn-deco" aria-hidden="true">🍪</span>
        </Link>

        <Link to="/duel" className="mn-card mn-duel mn-span-5" style={{ '--d': 1 }}>
          <span className="mn-badge dark">실시간 대결</span>
          <h2>같은 10문제로<br />지금 겨뤄요</h2>
          <div className="mn-orbit" aria-hidden="true">
            <span>🍪</span><span>🥠</span><span>🧁</span><b>VS</b>
          </div>
          <span className="mn-cta">대결 시작하기 <span aria-hidden="true">→</span></span>
        </Link>

        <Link to={resume?.to || '/exam'} className="mn-card mn-span-4" style={{ '--d': 2 }}>
          <span className="mn-icon" aria-hidden="true">▶</span>
          <small>{resume ? '이어서 하기' : '처음이라면'}</small>
          <b className="mn-title">{resume ? resume.name : '실전 문제부터 풀어 봐요'}</b>
          <span className="mn-sub">{resume ? resume.detail : '기업별 · 주제별 문제집'}</span>
        </Link>

        <Link to="/stats" className="mn-card mn-span-4 mn-mine" style={{ '--d': 3 }}>
          <span className="mn-icon" aria-hidden="true">📊</span>
          <small>내 학습</small>
          <div className="mn-stats">
            <div><b>{learning ? learning.week : '–'}</b><span>이번 주</span></div>
            <div><b>{learning?.rate ?? '–'}{learning?.rate != null && <em>%</em>}</b><span>정답률</span></div>
            <div><b>{learning ? learning.solved.toLocaleString() : '–'}</b><span>누적</span></div>
          </div>
        </Link>

        <Link to="/weak" className="mn-card mn-span-4" style={{ '--d': 4 }}>
          <span className="mn-icon red" aria-hidden="true">↺</span>
          <small>다시 풀기</small>
          <b className="mn-title">{learning?.wrongOpen ? `틀린 문제 ${learning.wrongOpen}개` : '남은 오답이 없어요'}</b>
          <span className="mn-sub">{learning?.weak?.[0] ? `약한 주제 · ${learning.weak[0].name} ${learning.weak[0].rate}%` : '풀수록 약한 주제를 알려 드려요'}</span>
        </Link>

        <section className="mn-card mn-span-6 mn-static" style={{ '--d': 5 }} aria-labelledby="mn-coding">
          <div className="mn-head"><h2 id="mn-coding">코딩테스트</h2><small>새 탭에서 열려요</small></div>
          <div className="mn-sites">
            {CODING_SITES.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className="mn-site">
                <span className="mn-site-tag" aria-hidden="true">{s.tag}</span>
                <span>{s.name}</span>
                <span className="sr-only">(새 탭에서 열림)</span>
              </a>
            ))}
          </div>
        </section>

        <section className="mn-card mn-span-6 mn-static" style={{ '--d': 6 }} aria-labelledby="mn-cs">
          <div className="mn-head"><h2 id="mn-cs">CS · 면접</h2><Link to="/cs">전체 보기</Link></div>
          <ul className="mn-list">
            <li><Link to="/notes"><span aria-hidden="true">📚</span><b>전공노트</b><small>{learning ? `${learning.notesDone} / ${learning.notesTotal}` : '운영체제 · 네트워크 · DB'}</small></Link></li>
            <li><Link to="/web-essentials"><span aria-hidden="true">🌐</span><b>웹 필수지식</b><small>57문답</small></Link></li>
            <li><Link to="/interview"><span aria-hidden="true">🎥</span><b>면접 공통질문 연습</b><small>카메라로 실전처럼</small></Link></li>
          </ul>
        </section>

        <section className="mn-card mn-span-12 mn-static" style={{ '--d': 7 }} aria-labelledby="mn-practice">
          <div className="mn-head"><h2 id="mn-practice">실전 문제집</h2><Link to="/exam">전체 보기</Link></div>
          <div className="mn-pills">
            {PRACTICE.map(p => <Link key={p.to} to={p.to} className="mn-pill"><span aria-hidden="true">{p.icon}</span>{p.name}</Link>)}
          </div>
        </section>

        <Link to="/intro" className="mn-card mn-span-12 mn-intro" style={{ '--d': 8 }}>
          <span>
            <small>나의쿠키가 처음이라면</small>
            <b>나의쿠키를 소개할게요</b>
          </span>
          <span className="mn-cta">서비스 소개 보기 <span aria-hidden="true">→</span></span>
        </Link>
      </div>
    </div>
  );
}
