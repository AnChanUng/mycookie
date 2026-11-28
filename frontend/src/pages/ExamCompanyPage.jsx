import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { COMPANIES, CPP_GROUPS, EXAM_CATEGORIES, SOURCE_KINDS } from '../data/examQuestions';
import { track } from '../track';
import ReportButton from '../components/ReportButton';
import QuestionExplanation from '../components/QuestionExplanation';
import Code from '../components/Code';
import Simulator from '../components/Simulator';
import { simFor, tagBank } from '../questionSim';
import SimilarQuestion from '../components/SimilarQuestion';
import { useExamProgress, recordAnswer, isMarked, toggleMark } from '../hooks/useExamProgress';
import { account } from '../sync';
import { examFor } from '../schedule';

const CIRC = ['①', '②', '③', '④', '⑤'];

// 단답형·서술형(kind)은 보기 없이 답을 직접 써 보고 모범답안과 비교한다. 답은 'r'(맞음) / 'w'(틀림)으로 기록
const isRight = (q, a) => (q.kind ? a === 'r' : a === q.a);
const normAns = (s) => s.replace(/[\s()[\]{}.,·'"`_-]/g, '').toLowerCase();

// 인적성 어휘 문제처럼 "밑줄 친 말"을 묻는 문항은 본문에 <u>…</u>로 표시해 둔다. 그 부분만 밑줄로 그린다
const Rich = ({ text }) => {
  if (!text || !text.includes('<u>')) return text ?? null;
  return text.split(/<u>(.*?)<\/u>/g).map((part, i) => (i % 2 ? <u key={i}>{part}</u> : part));
};

// 따로 상단 메뉴를 가진 분류(hub)에서 풀이 화면을 열었을 때 돌아갈 메뉴 이름
const HUB_NAMES = { ssafy: 'SSAFY', aptitude: 'NCS/인적성', major: '필기이론', web: '웹', ai: 'AI', cs: 'CS · 면접' };

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const fmtDate = (ts) => {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const modeLabel = (sections, mode, sec, sets) =>
  mode === 'exam' ? '모의고사'
    : mode === 'set' ? sets?.find(s => s.key === sec)?.name || '회차별 모의고사'
    : mode === 'wrong' ? '오답 다시 풀기'
    : mode === 'marked' ? '북마크 다시 풀기'
    : mode === 'recall' ? '응시 후기 복원 문제'
    : mode === 'unit' ? `단원별 문제집 · ${sections[sec]?.name || ''}`
    : mode === 'cpp' ? `C++ 집중 문제집 · ${sec === 'all' ? '전체' : CPP_GROUPS[sec]?.name || ''}`
    : `영역별 연습 · ${sections[sec]?.name || ''}`;

// 한 회사 화면에 복기 기반 문제와 예상문제가 함께 있으면 시작 카드마다 어느 쪽인지 표시한다
const KINDS = {
  recall: '복기문제',
  predicted: '예상문제',
  mixed: '복기 + 예상 혼합',
};
const Kind = ({ kind }) => (KINDS[kind] ? <span className={`exam-kind ${kind}`}>{KINDS[kind]}</span> : null);

export default function ExamCompanyPage() {
  const { company: key } = useParams();
  const company = COMPANIES.find(c => c.key === key);
  if (!company || !company.ready) return <Navigate to="/exam" replace />;
  const category = EXAM_CATEGORIES.find(c => c.key === company.category);
  const back = category?.hub ? { to: `/${category.hub}`, label: `← ${HUB_NAMES[category.hub] || category.name}` }
    : category ? { to: `/exam/category/${category.key}`, label: `← ${category.name}` } : undefined;
  return <CompanyExam company={company} back={back} />;
}

// back: 목록으로 돌아가는 링크. 회사별 문제은행이 아닌 곳(컴퓨터일반)에서도 같은 풀이 화면을 쓴다
export function CompanyExam({ company, back = { to: '/exam', label: '← 기업별 기출문제' } }) {
  const progress = useExamProgress(company.key);
  return <CompanyExamWithProgress company={company} back={back} progress={progress} />;
}

export function CompanyExamWithProgress({ company, back, progress, initialIds }) {
  const Q = company.questions;
  const SECTIONS = company.sections;
  const secKeys = Object.keys(SECTIONS).filter(k => !SECTIONS[k].extra); // 모의고사 채점 영역
  const CPP = useMemo(() => company.extra || [], [company]); // C++ 집중 문제집 (모의고사 미포함)
  const RECALL = company.recall; // 응시 후기 복원 문제 (모의고사 미포함)
  const UNITS = company.units; // 단원별 문제집 (모의고사 미포함). 단원은 sections에 extra로 들어 있다
  const SETS = company.sets || []; // 실제 시험처럼 한 번에 치르는 고정 회차
  // 복기 회차와 예상 회차를 합친 은행은 모의고사·영역별 연습이 둘을 섞어 뽑고, 복원 문제가 따로 있는 은행은 나머지가 예상문제다
  const setKinds = [...new Set(SETS.map(s => s.kind).filter(Boolean))];
  const splitSets = setKinds.length > 1;
  const mainKind = splitSets ? 'mixed' : setKinds[0] || (RECALL ? 'predicted' : null);
  const label = (mode, sec) => (mode === 'recall' && RECALL ? RECALL.title : modeLabel(SECTIONS, mode, sec, SETS));
  const ALL = useMemo(() => [...Q, ...CPP, ...(RECALL?.questions || []), ...(UNITS?.questions || [])], [Q, CPP, RECALL, UNITS]); // 오답노트·오답 다시 풀기 범위
  const byId = useMemo(() => {
    tagBank(company.key, ALL); // 그림 해설을 찾을 때 쓸 문제은행 표시
    return Object.fromEntries(ALL.map(q => [q.id, q]));
  }, [ALL, company.key]);
  const { data, save } = progress;
  // 풀던 문제는 새로고침하거나 탭을 닫아도 이어서 풀 수 있게 문제은행마다 한 건씩 저장해 둔다
  const RESUME_KEY = `exam-resume:${company.key}`;
  // 이어서 풀 주소는 이 화면의 주소로 적는다. 다른 화면으로 넘어가며 마지막으로 저장할 때는 주소창이 이미 다음 화면이라
  // window.location을 쓰면 엉뚱한 화면(예: 마지막으로 본 자격증 페이지)이 적혔다(이슈 #299)
  const { pathname: pagePath } = useLocation();
  const [saved, setSaved] = useState(() => {
    try {
      const r = JSON.parse(localStorage.getItem(RESUME_KEY));
      return r && Array.isArray(r.ids) && r.ids.length && r.ids.every(id => byId[id]) ? r : null;
    } catch {
      return null;
    }
  });
  // 첫 화면의 "이어서 하기"로 들어오면(?resume=1) 안내를 거치지 않고 풀던 문제를 바로 연다
  const [view, setView] = useState(() => initialIds?.length
    ? { name: 'quiz', mode: 'practice', ids: initialIds }
    : (saved && new URLSearchParams(window.location.search).has('resume')
    ? { name: 'quiz', mode: saved.mode, sec: saved.sec, ids: saved.ids, resume: saved }
    : { name: 'home' }));
  // 첫 화면은 문제 데이터를 읽지 않으므로, 거기서 보여 줄 이름 · 주소 · 풀이 종류를 함께 적어 둔다
  const saveResume = (state) => {
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify({ ...state, name: company.name, to: pagePath, label: label(state.mode, state.sec), at: Date.now() }));
    } catch { /* 저장 공간이 없으면 이어풀기만 포기한다 */ }
  };
  // 마지막으로 연 문제집. 풀던 문제가 없을 때 첫 화면이 이쪽으로 이어 준다
  useEffect(() => {
    try { localStorage.setItem('exam:last', JSON.stringify({ name: company.name, to: window.location.pathname, at: Date.now() })); } catch { /* 무시 */ }
  }, [company]);
  const clearResume = () => { try { localStorage.removeItem(RESUME_KEY); } catch { /* 무시 */ } setSaved(null); };
  // 회차가 없는 은행은 문제은행 전체가 모의고사 한 회분이다
  const hasSets = SETS.length > 0;
  const examCount = company.draw ? Object.values(company.draw).reduce((n, c) => n + c, 0) : Q.length;
  const examSets = hasSets ? SETS : [{ name: '모의고사', sub: company.examSub || (company.draw ? `문제은행 ${Q.length}문항에서 실제 출제 비율대로 출제` : '실제 시험의 영역 순서 그대로 출제'), kind: mainKind }];

  const wrongIds = ALL.filter(q => data.stats[q.id]?.last === 'w').map(q => q.id);
  const everWrongIds = ALL.filter(q => (data.stats[q.id]?.w || 0) > 0).map(q => q.id);
  const markedIds = ALL.filter(q => isMarked(data, q.id)).map(q => q.id);
  const onMark = (qid) => save(prev => ({ ...prev, marks: toggleMark(prev.marks, qid) }));

  // draw가 있으면 영역별 출제 비율만큼 뽑는다. 안 푼 문제 → 마지막에 틀린 문제 → 맞힌 문제 순으로 우선한다
  const examIds = () => {
    if (!company.draw) return Q.map(q => q.id);
    const rank = (q) => { const s = data.stats[q.id]; return !s ? 0 : s.last === 'w' ? 1 : 2; };
    return Object.entries(company.draw).flatMap(([sec, n]) =>
      shuffle(Q.filter(q => q.sec === sec)).sort((x, y) => rank(x) - rank(y)).slice(0, n).map(q => q.id));
  };

  // 문제가 많은 은행(practiceSize)은 영역별 연습을 조금씩 끊어서 낸다. 안 푼 문제 → 틀린 문제 → 맞힌 문제 순
  const practiceIds = (qs) => {
    const ids = shuffle(qs.map(q => q.id));
    if (!company.practiceSize) return ids;
    const rank = (id) => { const s = data.stats[id]; return !s ? 0 : s.last === 'w' ? 1 : 2; };
    return ids.sort((x, y) => rank(x) - rank(y)).slice(0, company.practiceSize);
  };

  const start = (mode, ids, sec) => {
    if (!ids.length) return;
    setView({ name: 'quiz', mode, sec, ids });
    window.scrollTo({ top: 0 });
  };

  const finish = (quiz, answers, aborted) => {
    clearResume();
    const isExam = quiz.mode === 'exam' || quiz.mode === 'set'; // 회차 시험도 실전과 똑같이 기록·영역별 채점
    let score = 0;
    const secScore = Object.fromEntries(secKeys.map(k => [k, 0]));
    const items = [];
    let stats = data.stats;
    quiz.ids.forEach(id => {
      const q = byId[id];
      const a = answers[id];
      if (a === undefined && aborted) return;
      const ok = isRight(q, a);
      if (isExam) stats = recordAnswer(stats, id, ok);
      if (ok) { score++; if (q.sec in secScore) secScore[q.sec]++; }
      items.push({ q, a, ok });
    });
    if (items.length) {
      const entry = { at: Date.now(), mode: quiz.mode, sec: quiz.sec, score, total: items.length, sections: isExam ? secScore : undefined };
      save(prev => ({ ...prev, stats, history: [...prev.history, entry].slice(-200) }));
      track('exam', window.location.pathname, quiz.mode, { score, total: items.length });
    }
    setView({ name: 'result', result: { mode: quiz.mode, sec: quiz.sec, score, total: items.length, secScore, items } });
    window.scrollTo({ top: 0 });
  };

  const recordPractice = (qid, correct) => save(prev => ({ ...prev, stats: recordAnswer(prev.stats, qid, correct) }));

  const header = (title, links = true) => (
    <div className="page-header exam-page-header">
      <Link to={back.to} className="back-link">{back.label}</Link>
      {links && (
        <div className="exam-books">
          <button
            type="button"
            className={`exam-book wrong${view.name === 'wrongbook' ? ' on' : ''}${everWrongIds.length ? ' has' : ''}`}
            disabled={!everWrongIds.length}
            title={everWrongIds.length ? '틀리면 자동으로 쌓이는 기록 · 한 번이라도 틀린 문제 모아보기' : '아직 틀린 문제가 없습니다. 문제를 틀리면 자동으로 쌓입니다'}
            onClick={() => setView({ name: 'wrongbook' })}
          >
            <span className="n">{everWrongIds.length}</span>
            <span className="t"><i aria-hidden="true">✕</i>틀린문제</span>
          </button>
          <button
            type="button"
            className={`exam-book mark${view.name === 'markbook' ? ' on' : ''}${markedIds.length ? ' has' : ''}`}
            disabled={!markedIds.length}
            title={markedIds.length ? '내가 ★로 고른, 다시 풀고 싶은 문제 모아보기' : '아직 북마크한 문제가 없습니다. 다시 풀고 싶은 문제에 ☆를 눌러 두세요'}
            onClick={() => setView({ name: 'markbook' })}
          >
            <span className="n">{markedIds.length}</span>
            <span className="t"><i aria-hidden="true">★</i>북마크</span>
          </button>
        </div>
      )}
      <h1>{title}</h1>
      {account()
        ? <div className="exam-sync cloud"><i />{account().nickname} 계정에 동기화됨 · 다른 기기에서도 같은 기록을 봅니다</div>
        : <div className="exam-sync local"><i />이 브라우저에 저장됨 · 기업별 기출문제 목록에서 로그인하면 다른 기기와 동기화됩니다</div>}
    </div>
  );

  if (view.name === 'quiz') {
    return (
      <Quiz
        key={view.ids.join(',')}
        byId={byId}
        stats={data.stats}
        mode={view.mode}
        title={label(view.mode, view.sec)}
        sec={view.sec}
        sections={SECTIONS}
        ids={view.ids}
        onPractice={recordPractice}
        onFinish={finish}
        resume={view.resume}
        onSave={saveResume}
        header={(t) => header(t, false)}
        marks={data.marks}
        onMark={onMark}
      />
    );
  }

  if (view.name === 'result') {
    const r = view.result;
    const wrongs = r.items.filter(x => !x.ok);
    return (
      <div className="fade-in">
        {header('채점 결과')}
        <p className="exam-eyebrow">{label(r.mode, r.sec)}</p>
        <div className="exam-score"><span className="big">{r.score}</span><span className="of">/ {r.total}문제 · {r.total ? Math.round(r.score / r.total * 100) : 0}%</span></div>
        {(r.mode === 'exam' || r.mode === 'set') && (
          <div className="exam-stats">
            {secKeys.map(k => <StatTile key={k} k={SECTIONS[k].name} v={r.secScore[k]} of={r.items.filter(x => x.q.sec === k).length} />)}
          </div>
        )}
        <div className="exam-actions">
          {wrongs.length > 0 && <button className="exam-btn primary" onClick={() => start('wrong', shuffle(wrongs.map(x => x.q.id)))}>틀린 {wrongs.length}문제 바로 다시 풀기</button>}
          <button className="exam-btn" onClick={() => setView({ name: 'home' })}>{company.abbr} 메인으로</button>
        </div>
        <ReviewList items={r.items} sections={SECTIONS} defaultFilter={wrongs.length ? 'wrong' : 'all'} marks={data.marks} onMark={onMark} />
      </div>
    );
  }

  if (view.name === 'wrongbook') {
    return (
      <div className="fade-in">
        {header('틀린문제 모아보기')}
        <p className="exam-lede">틀리면 자동으로 쌓이는 기록입니다. 내가 직접 고르는 북마크와는 따로 관리됩니다. 한 번이라도 틀린 문제가 모두 나오며, 마지막 풀이에서 맞힌 문제는 "해결"로 표시되고, 아직 틀린 상태인 문제만 "오답 다시 풀기"에 나옵니다.</p>
        <div className="exam-actions">
          {wrongIds.length > 0 && <button className="exam-btn primary" onClick={() => start('wrong', shuffle(wrongIds))}>미해결 {wrongIds.length}문제 다시 풀기</button>}
          <button className="exam-btn" onClick={() => setView({ name: 'home' })}>{company.abbr} 메인으로</button>
        </div>
        <WrongBook Q={ALL} ids={everWrongIds} stats={data.stats} sections={SECTIONS} marks={data.marks} onMark={onMark} />
      </div>
    );
  }

  if (view.name === 'markbook') {
    return (
      <div className="fade-in">
        {header('북마크 모아보기')}
        <p className="exam-lede">내가 별표(★)로 직접 고른, 다시 풀고 싶은 문제입니다. 맞혔는지 틀렸는지와 상관없이 별표를 다시 눌러 해제할 때까지 남아 있고, 틀리면 자동으로 쌓이는 틀린문제와는 따로 저장됩니다.</p>
        <div className="exam-actions">
          {markedIds.length > 0 && <button className="exam-btn primary" onClick={() => start('marked', shuffle(markedIds))}>북마크 {markedIds.length}문제 다시 풀기</button>}
          <button className="exam-btn" onClick={() => setView({ name: 'home' })}>{company.abbr} 메인으로</button>
        </div>
        <MarkBook Q={ALL} ids={markedIds} stats={data.stats} sections={SECTIONS} marks={data.marks} onMark={onMark} />
      </div>
    );
  }

  // 첫 화면의 시험 일정에 이 문제집이 걸려 있으면 남은 날로 하루 목표를 계산해 보여 준다
  const goal = examFor(window.location.pathname);
  const unseen = ALL.filter(q => !data.stats[q.id]).length;
  const plan = goal && { ...goal, unseen, perDay: Math.ceil(unseen / Math.max(goal.left, 1)) };

  const exams = data.history.filter(h => h.mode === 'exam' || h.mode === 'set');
  const best = exams.reduce((b, h) => (!b || h.score > b.score ? h : b), null);
  const last = exams.at(-1);

  const lean = company.key === 'spring-practice'; // 소규모 문제집은 첫 화면을 단출하게 보여 준다
  const setsBlock = (
    <>
      {!lean && <div className="section-title">{hasSets ? '회차별 모의고사' : '모의고사'}</div>}
      {hasSets && <p className="exam-lede">{company.setsDescription || <>실제 시험과 같은 문항 수·영역 구성으로 묶은 고정 세트입니다. {splitSets && '복기 기반 회차는 응시 후기에 복원된 문항을 따라 만들었고, 예상문제 회차는 같은 경향으로 새로 만든 문제입니다. '}각 회차는 같은 문제를 같은 순서로 출제하므로 다시 풀었을 때 점수를 비교할 수 있습니다.</>}</p>}
      <div className={`exam-sections${lean || examSets.length === 1 ? ' wide' : ''}`}>
        {examSets.map(s => {
          const qs = hasSets ? Q.filter(q => q.set === s.key) : Q;
          const done = qs.filter(q => data.stats[q.id]).length;
          const right = qs.filter(q => data.stats[q.id]?.last === 'r').length;
          return (
            <button key={s.name} className="exam-section" onClick={() => (hasSets ? start('set', qs.map(q => q.id), s.key) : start('exam', examIds()))}>
              <span className="t">{s.name}<Kind kind={s.kind} /></span>
              <span className="d">{s.sub}</span>
              <span className="d">{hasSets ? qs.length : examCount}문제 · 시간 제한 없음 · 최근 정답 {right}/{done}</span>
              <span className="bar"><i style={{ width: `${qs.length ? Math.round(right / qs.length * 100) : 0}%` }} /></span>
            </button>
          );
        })}
      </div>
    </>
  );

  if (lean) {
    const areas = Object.values(SECTIONS).filter(sec => !sec.extra).map(sec => sec.name);
    return (
      <div className="fade-in sp-home">
        <Link to={back.to} className="back-link">{back.label}</Link>
        <header className="sp-head">
          <p className="sp-eyebrow">웹 개발 · 백엔드</p>
          <h1>{company.name}</h1>
          <ul className="sp-areas" aria-label="출제 영역">{areas.map(name => <li key={name}>{name}</li>)}</ul>
        </header>

        <section className="sp-hero" aria-label="모의고사">
          <dl className="sp-facts">
            <div><dt>문항</dt><dd>{examCount}</dd></div>
            <div><dt>형식</dt><dd>4지선다</dd></div>
            <div><dt>시간</dt><dd>제한 없음</dd></div>
          </dl>
          <button type="button" className="sp-cta" onClick={() => start('exam', examIds())}>모의고사 시작하기<span aria-hidden="true">→</span></button>
          <p className="sp-hint">다 풀고 나면 한 번에 채점하고, 문제마다 해설을 보여 줘요.</p>
        </section>

        <div className="sp-again">
          <button type="button" className="sp-chip" disabled={!wrongIds.length} onClick={() => start('wrong', shuffle(wrongIds))}>
            <span className="sp-chip-icon wrong" aria-hidden="true">↺</span>오답 다시 풀기<b>{wrongIds.length}</b>
          </button>
          <button type="button" className="sp-chip" disabled={!markedIds.length} onClick={() => start('marked', shuffle(markedIds))}>
            <span className="sp-chip-icon mark" aria-hidden="true">★</span>북마크 다시 풀기<b>{markedIds.length}</b>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in exam-home">
      {header(company.name)}
      <ul className="sp-areas exam-areas" aria-label="출제 영역">{Object.values(SECTIONS).filter(sec => !sec.extra && !sec.unit).map(sec => <li key={sec.name}>{sec.name}</li>)}</ul>
      {plan && (
        <div className="exam-plan">
          <b>{plan.name} {plan.left === 0 ? 'D-DAY' : `D-${plan.left}`}</b>
          <span>
            {plan.unseen > 0
              ? `아직 안 푼 문제 ${plan.unseen}개 · 시험 전까지 다 보려면 하루 ${plan.perDay}문제`
              : '이 문제집의 문제를 모두 한 번씩 풀었습니다'}
            {wrongIds.length > 0 && ` · 다시 풀 오답 ${wrongIds.length}개`}
          </span>
        </div>
      )}
      {saved && !lean && (
        <div className="exam-resume">
          <div className="exam-resume-text">
            <strong>풀던 문제가 있습니다</strong>
            <span>
              {label(saved.mode, saved.sec)} · {Object.keys(saved.answers || {}).length} / {saved.ids.length} 답변
            </span>
          </div>
          <button className="exam-btn primary" onClick={() => { setView({ name: 'quiz', mode: saved.mode, sec: saved.sec, ids: saved.ids, resume: saved }); window.scrollTo({ top: 0 }); }}>이어서 풀기</button>
          <button className="exam-btn ghost" onClick={() => { if (confirm('풀던 기록을 지울까요? 모의고사는 답한 내용이 채점되지 않고 사라집니다.')) clearResume(); }}>지우기</button>
        </div>
      )}
      {/* 모의고사 시작을 맨 위 큰 카드 하나로: 숫자 몇 개 + 시작 버튼(회차가 있으면 회차 목록) */}
      <section className="sp-hero exam-hero" aria-label="모의고사">
        <dl className="sp-facts">
          <div><dt>{hasSets ? '회차' : '문항'}</dt><dd>{hasSets ? `${examSets.length}회` : examCount}</dd></div>
          <div><dt>응시</dt><dd>{exams.length}회</dd></div>
          <div><dt>최고 점수</dt><dd>{best ? `${best.score} / ${best.total}` : '–'}</dd></div>
          <div><dt>최근 점수</dt><dd>{last ? `${last.score} / ${last.total}` : '–'}</dd></div>
        </dl>
        {hasSets ? setsBlock : <>
          <button type="button" className="sp-cta" onClick={() => start('exam', examIds())}>모의고사 시작하기<span aria-hidden="true">→</span></button>
          <p className="sp-hint">{examSets[0].sub} · 시간 제한 없음 · 다 풀면 한 번에 채점하고 해설을 보여 줘요.</p>
        </>}
      </section>
      <div className="sp-again exam-again">
        <button type="button" className="sp-chip" disabled={!wrongIds.length} onClick={() => start('wrong', shuffle(wrongIds))}>
          <span className="sp-chip-icon wrong" aria-hidden="true">↺</span>오답 다시 풀기<b>{wrongIds.length}</b>
        </button>
        <button type="button" className="sp-chip" disabled={!markedIds.length} onClick={() => start('marked', shuffle(markedIds))}>
          <span className="sp-chip-icon mark" aria-hidden="true">★</span>북마크 다시 풀기<b>{markedIds.length}</b>
        </button>
      </div>

      {/* 문제집 설명은 띄우지 않는다. 복기 문제처럼 꼭 알아야 할 것만 한 줄로 */}
      {SOURCE_KINDS[company.source?.kind]?.short && <p className="exam-source-note">{SOURCE_KINDS[company.source.kind].short}</p>}
      {company.references?.map(ref => <p key={ref.url}><a href={ref.url} target="_blank" rel="noreferrer">{ref.title} ↗</a></p>)}

      {/* 실제 시험을 복원한 문제는 예상문제보다 먼저 보이게 맨 위에 둔다 */}
      {RECALL && (
        <>
          <div className="section-title">{RECALL.title}<Kind kind="recall" /></div>
          <div className="exam-sections">
            <button className="exam-section" onClick={() => start('recall', RECALL.questions.map(q => q.id))}>
              <span className="t">순서대로 풀기</span>
              <span className="d">프로그래밍 → DB · 네트워크 → 전산학일반 순서 · 한 문제씩 즉시 채점</span>
              <span className="d">{RECALL.questions.length}문제 · 최근 정답 {RECALL.questions.filter(q => data.stats[q.id]?.last === 'r').length}/{RECALL.questions.filter(q => data.stats[q.id]).length}</span>
              <span className="bar"><i style={{ width: `${Math.round(RECALL.questions.filter(q => data.stats[q.id]?.last === 'r').length / RECALL.questions.length * 100)}%` }} /></span>
            </button>
            <button className="exam-section" onClick={() => start('recall', shuffle(RECALL.questions.map(q => q.id)))}>
              <span className="t">섞어서 풀기</span>
              <span className="d">같은 문제를 무작위 순서로 출제</span>
              <span className="d">틀린 문제는 오답노트에 함께 쌓입니다</span>
            </button>
          </div>
        </>
      )}

      {!lean && <div className="section-title">영역별 연습<Kind kind={mainKind} /></div>}
      {!lean && <div className="exam-sections">
        {Object.entries(SECTIONS).filter(([, s]) => !s.extra).map(([k, s]) => {
          const qs = Q.filter(q => q.sec === k);
          const done = qs.filter(q => data.stats[q.id]).length;
          const right = qs.filter(q => data.stats[q.id]?.last === 'r').length;
          return (
            <button key={k} className="exam-section" onClick={() => start('practice', practiceIds(qs), k)}>
              <span className="t">{s.name}</span>
              <span className="d">{s.sub}</span>
              <span className="d">{qs.length}문제{company.practiceSize ? ` 중 ${company.practiceSize}문제씩` : ''} · 최근 정답 {right}/{done}</span>
              <span className="bar"><i style={{ width: `${qs.length ? Math.round(right / qs.length * 100) : 0}%` }} /></span>
            </button>
          );
        })}
      </div>}

      {UNITS && (
        <>
          <div className="section-title">{UNITS.title}</div>
          <div className="exam-sections">
            {Object.entries(SECTIONS).filter(([, s]) => s.unit).map(([k, s]) => {
              const qs = UNITS.questions.filter(q => q.sec === k);
              const done = qs.filter(q => data.stats[q.id]).length;
              const right = qs.filter(q => data.stats[q.id]?.last === 'r').length;
              return (
                <button key={k} className="exam-section" onClick={() => start('unit', qs.map(q => q.id), k)}>
                  <span className="t">{s.name}</span>
                  <span className="d">{s.sub}</span>
                  <span className="d">{qs.length}문제 · 최근 정답 {right}/{done}</span>
                  <span className="bar"><i style={{ width: `${qs.length ? Math.round(right / qs.length * 100) : 0}%` }} /></span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {company.coding && <CodingEntry coding={company.coding} />}

      {CPP.length > 0 && (
        <>
          <div className="section-title">C++ 집중 문제집<Kind kind={mainKind} /></div>
          <p className="exam-lede">HF 프로그래밍 영역에서 자주 나오는 C++ 실행 결과·개념 문제 {CPP.length}문항. 모의고사 60문제와는 별도이며, 한 문제씩 즉시 채점되고 틀린 문제는 오답노트에 함께 쌓입니다.</p>
          <div className="exam-sections">
            <button className="exam-section cpp" onClick={() => start('cpp', shuffle(CPP.map(q => q.id)), 'all')}>
              <span className="t">전체 문제 풀기</span>
              <span className="d">세 분야를 섞어서 무작위 순서로 출제</span>
              <span className="d">{CPP.length}문제 · 최근 정답 {CPP.filter(q => data.stats[q.id]?.last === 'r').length}/{CPP.filter(q => data.stats[q.id]).length}</span>
              <span className="bar"><i style={{ width: `${Math.round(CPP.filter(q => data.stats[q.id]?.last === 'r').length / CPP.length * 100)}%` }} /></span>
            </button>
            {Object.entries(CPP_GROUPS).map(([k, g]) => {
              const qs = CPP.filter(q => q.grp === k);
              const done = qs.filter(q => data.stats[q.id]).length;
              const right = qs.filter(q => data.stats[q.id]?.last === 'r').length;
              return (
                <button key={k} className="exam-section cpp" onClick={() => start('cpp', shuffle(qs.map(q => q.id)), k)}>
                  <span className="t">{g.name}</span>
                  <span className="d">{g.sub}</span>
                  <span className="d">{qs.length}문제 · 최근 정답 {right}/{done}</span>
                  <span className="bar"><i style={{ width: `${qs.length ? Math.round(right / qs.length * 100) : 0}%` }} /></span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {!lean && data.history.length > 0 && (
        <>
          <div className="section-title">응시 기록</div>
          <div className="exam-table-wrap">
            <table className="exam-table">
              <thead><tr><th>일시</th><th>유형</th><th>점수</th><th>{secKeys.map(k => SECTIONS[k].short).join(' · ')}</th></tr></thead>
              <tbody>
                {data.history.slice().reverse().slice(0, 15).map((h, i) => (
                  <tr key={i}>
                    <td>{fmtDate(h.at)}</td>
                    <td>{label(h.mode, h.sec)}</td>
                    <td className="num">{h.score} / {h.total}</td>
                    <td className="num">{h.sections ? secKeys.map(k => h.sections[k] ?? 0).join('·') : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ k, v, of, unit }) {
  return (
    <div className="exam-stat">
      <div className="k">{k}</div>
      <div className="v">{v}<small>{of !== undefined ? ` / ${of}` : unit}</small></div>
    </div>
  );
}

function Quiz({ byId, stats, mode, sec, title, ids, sections, onPractice, onFinish: finishQuiz, resume, onSave, header, marks, onMark }) {
  const isExam = mode === 'exam' || mode === 'set'; // 제출 시 통계를 한꺼번에 기록한다
  // 저장해 둔 문제와 답변에서 이어 간다.
  const [idx, setIdx] = useState(resume?.idx || 0);
  const [answers, setAnswers] = useState(resume?.answers || {});
  const [revealed, setRevealed] = useState(resume?.revealed || {});
  const [texts, setTexts] = useState(resume?.texts || {}); // 단답형·서술형에 적은 답
  const [peeked, setPeeked] = useState(resume?.peeked || {}); // 모범답안을 펼쳐 자가채점을 기다리는 문제
  const quiz = { mode, sec, ids };

  // 답을 고르거나 문제를 넘길 때, 화면을 떠날 때마다 진행 상태를 저장한다. 끝낸 뒤에는 다시 저장하지 않는다
  const finished = useRef(false);
  const saveRef = useRef(() => {});
  useLayoutEffect(() => { saveRef.current = () => {
    if (finished.current) return;
    onSave({ mode, sec, ids, idx, answers, revealed, texts, peeked });
  }; });
  const onFinish = (...args) => { finished.current = true; finishQuiz(...args); };
  useEffect(() => { saveRef.current(); }, [idx, answers, revealed, texts, peeked]);
  useEffect(() => {
    const save = () => saveRef.current();
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
      save();
    };
  }, []);

  // 키보드로 풀기: 숫자로 보기를 고르고 방향키·Enter로 문제를 넘긴다. 답을 적는 칸에서는 끼어들지 않는다
  const keyRef = useRef(() => {});
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      keyRef.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const q = byId[ids[idx]];
  const total = ids.length;
  const answered = Object.keys(answers).length;
  const sel = answers[q.id];
  const shown = !!revealed[q.id];
  const wstat = stats[q.id];

  // 모든 모드에서 고르는 즉시 정답 여부와 해설을 보여준다.
  // 모의고사는 통계를 제출 시점에 한꺼번에 기록하고, 나머지는 바로 기록한다.
  const choose = (i) => {
    if (revealed[q.id]) return;
    setAnswers(a => ({ ...a, [q.id]: i }));
    setRevealed(r => ({ ...r, [q.id]: true }));
    if (!isExam) onPractice(q.id, isRight(q, i));
  };

  // 단답형은 허용 답안과 글자가 같으면 바로 정답 처리하고, 아니면 모범답안을 보여 주고 스스로 채점하게 한다.
  // strict 단답형(노트 문제)은 자동 채점만 한다: 허용 답안과 다르면 바로 오답
  const peek = () => {
    const t = texts[q.id] || '';
    if (q.kind === 'short' && t.trim() && q.acc?.some(x => normAns(x) === normAns(t))) choose('r');
    else if (q.strict) { if (t.trim()) choose('w'); }
    else setPeeked(p => ({ ...p, [q.id]: true }));
  };

  useLayoutEffect(() => { keyRef.current = (e) => {
    if (!q.kind && /^[1-5]$/.test(e.key) && Number(e.key) <= q.o.length) { e.preventDefault(); choose(Number(e.key) - 1); }
    else if (e.key === 'ArrowRight' || (e.key === 'Enter' && e.target.tagName !== 'BUTTON')) { if (idx < total - 1) setIdx(idx + 1); }
    else if (e.key === 'ArrowLeft') { if (idx > 0) setIdx(idx - 1); }
  }; });

  return (
    <div className="fade-in exam-quiz">
      {header(title)}
      <div className="exam-quiz-body">
      <div className="exam-quiz-main">
      <div className="exam-qhead">
        <span className="prog">{idx + 1} / {total}</span>
        <span className="prog">답변 {answered}</span>
      </div>
      <div className="exam-pbar"><i style={{ width: `${Math.round(answered / total * 100)}%` }} /></div>

      <div className="exam-qcard">
        <div className="exam-qtop">
          <span className="qnum">Q{String(idx + 1).padStart(2, '0')}</span>
          <span className="exam-chip sec">{sections[q.sec].name}</span>
          <span className="exam-chip">{q.topic}</span>
          {wstat?.w > 0 && <span className="exam-chip wrong">누적 오답 {wstat.w}회</span>}
          <MarkButton on={!!marks?.[q.id]?.on} onClick={() => onMark(q.id)} />
        </div>
        <QuestionBody q={q} />
        {q.kind ? (
          <div className="exam-written">
            {q.kind === 'essay'
              ? <textarea rows={6} value={texts[q.id] || ''} disabled={shown} placeholder="답안을 적어 보세요. 적지 않고 바로 모범답안을 확인해도 됩니다." onChange={e => setTexts(t => ({ ...t, [q.id]: e.target.value }))} />
              : <input type="text" value={texts[q.id] || ''} disabled={shown} placeholder="답을 입력하세요" onChange={e => setTexts(t => ({ ...t, [q.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter' && !shown && !peeked[q.id]) peek(); }} />}
            {!shown && !peeked[q.id] && (
              <div className="exam-actions">
                <button className="exam-btn primary" disabled={q.strict && !(texts[q.id] || '').trim()} onClick={peek}>{q.strict ? '채점하기' : '답안 확인'}</button>
                {q.strict && <button className="exam-btn ghost" onClick={() => choose('w')}>모르겠어요</button>}
              </div>
            )}
            {q.strict && !shown && <p className="exam-written-hint">띄어쓰기·대소문자는 상관없어요. 우리말과 영문 표기 모두 정답으로 인정해요.</p>}
            {!shown && peeked[q.id] && (
              <div className="exam-expl">
                <ModelAnswer q={q} />
                <div className="exam-written-ask">모범답안과 비교해 스스로 채점하세요.</div>
                <div className="exam-actions">
                  <button className="exam-btn primary" onClick={() => choose('r')}>맞았어요</button>
                  <button className="exam-btn" onClick={() => choose('w')}>틀렸어요</button>
                </div>
              </div>
            )}
          </div>
        ) : (
        <ul className="exam-opts">
          {q.o.map((opt, i) => {
            let cls = 'exam-opt';
            if (shown) { if (i === q.a) cls += ' right'; else if (i === sel) cls += ' wrong'; }
            else if (sel === i) cls += ' sel';
            return (
              <li key={i}>
                <button className={cls} disabled={shown} onClick={() => choose(i)}>
                  <span className="no">{i + 1}</span><span className="tx"><Rich text={opt} /></span>
                </button>
              </li>
            );
          })}
        </ul>
        )}
        {shown && (
          <div className={`exam-expl ${isRight(q, sel) ? 'ok' : 'bad'}`}>
            <div className="lab">{q.kind ? (isRight(q, sel) ? '정답' : '오답') : sel === q.a ? '정답' : `오답 · 정답은 ${CIRC[q.a]}`}</div>
            {q.strict && (texts[q.id] || '').trim() && <div className="exam-my-answer">내 답 <b>{texts[q.id]}</b></div>}
            {q.kind && <ModelAnswer q={q} />}
            <div>{q.e}</div>
            {q.ref && <a className="exam-note-link" href={q.ref.url} target="_blank" rel="noopener noreferrer">근거: {q.ref.label} ↗</a>}
            {q.link &&<Link className="exam-note-link" to={q.link}>노트 다시 읽기 →</Link>}
            <QuestionSim key={`g${q.id}`} q={q} />
            <QuestionExplanation key={q.id} q={q} />
            {!q.kind && !isRight(q, sel) && <SimilarQuestion key={`s${q.id}`} q={q} />}
          </div>
        )}
        <div className="exam-actions">
          <button className="exam-btn" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>이전</button>
          {idx < total - 1
            ? <button className="exam-btn primary" onClick={() => setIdx(idx + 1)}>다음</button>
            : <button className="exam-btn primary" onClick={() => onFinish(quiz, answers, false)}>{isExam ? '제출하고 채점' : '결과 보기'}</button>}
          <span className="spacer" />
          <button className="exam-btn ghost" onClick={() => { if (confirm('진행 중인 풀이를 종료할까요? 답변한 문제만 기록됩니다.')) onFinish(quiz, answers, true); }}>그만두기</button>
        </div>
      </div>
      </div>

      {/* 넓은 화면에서는 문제 옆에 붙어 따라오고, 좁은 화면에서는 문제 아래로 내려간다 */}
      <aside className="exam-quiz-side">
        <div className="exam-quiz-side-title">문제 번호 <span>{answered} / {total} 답변</span></div>
        <div className="exam-gridnav">
          {ids.map((id, i) => {
            let cls = 'gn';
            if (i === idx) cls += ' cur';
            if (answers[id] !== undefined) cls += isRight(byId[id], answers[id]) ? ' r' : ' w';
            return <button key={id} className={cls} onClick={() => setIdx(i)}>{i + 1}</button>;
          })}
        </div>
        <div className="exam-keyhint">{q.kind ? '키보드: 답을 적고 Enter로 채점 · ← → 문제 이동(입력칸 밖에서)' : `키보드: 숫자 1~${q.o?.length || 4} 보기 선택 · ← → 문제 이동`}</div>
      </aside>
      </div>
    </div>
  );
}

// 인적성 화면 아래에 붙는 코딩 문제(COS Pro 등) 입구. 문제 데이터는 코딩 화면에서만 불러오고, 여기서는 푼 개수만 센다
function CodingEntry({ coding }) {
  let solved = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(`${coding.store}:solved:`) && localStorage.getItem(k) === 'pass') solved++;
    }
  } catch { /* 저장소를 못 쓰면 0으로 둔다 */ }
  return (
    <>
      <div className="section-title">{coding.name}</div>
      <p className="exam-lede">{coding.desc}</p>
      <div className="exam-sections">
        {coding.parts.map(p => (
          <Link key={p.name} to={coding.to} className="exam-section coding">
            <span className="t">{p.name}</span>
            <span className="d">{p.sub}</span>
          </Link>
        ))}
        <Link to={coding.to} className="exam-section coding go">
          <span className="t">문제 목록 열기 →</span>
          <span className="d">{coding.count}문제 · 통과 {solved}/{coding.count}</span>
          <span className="bar"><i style={{ width: `${Math.round(solved / coding.count * 100)}%` }} /></span>
        </Link>
      </div>
    </>
  );
}

// 스케줄링 · 페이지 교체 · 디스크 문제 가운데 숫자를 옮겨 둔 것은 해설을 그림으로도 보여 준다
function QuestionSim({ q }) {
  const sim = simFor(q);
  return sim ? <Simulator sim={sim} /> : null;
}

function QuestionBody({ q, className = 'exam-qtext' }) {
  return (
    <>
      {q.ctx && <div className="exam-ctx"><Rich text={q.ctx} /></div>}
      {q.code && <Code code={q.code} />}
      <p className={className}><Rich text={q.q} /></p>
    </>
  );
}

function ModelAnswer({ q }) {
  return (
    <div className="exam-model">
      <div className="lab">모범답안</div>
      <div className="ans">{q.ans}</div>
      {q.pts && (
        <>
          <div className="lab">채점 포인트</div>
          <ul>{q.pts.map(p => <li key={p}>{p}</li>)}</ul>
        </>
      )}
    </div>
  );
}

function MarkButton({ on, onClick }) {
  return (
    <button type="button" className={`exam-mark ${on ? 'on' : ''}`} onClick={onClick} title={on ? '북마크 해제' : '북마크 (나중에 다시 보기)'} aria-pressed={on}>
      {on ? '★' : '☆'}<span>{on ? '북마크됨' : '북마크'}</span>
    </button>
  );
}

export function ReviewCard({ q, a, extra, sections, marked, onMark }) {
  const ok = isRight(q, a);
  return (
    <div className="exam-rv">
      <div className="h">
        <span className="qnum">{q.id.toUpperCase()}</span>
        <span className="exam-chip sec">{sections[q.sec].name}</span>
        <span className="exam-chip">{q.topic}</span>
        {extra ?? <span className={`exam-chip ${ok ? '' : 'wrong'}`}>{ok ? '정답' : '오답'}</span>}
        {onMark && <MarkButton on={!!marked} onClick={() => onMark(q.id)} />}
      </div>
      <QuestionBody q={q} className="q" />
      {q.kind ? (
        <div className="a">
          {a === undefined
            ? (extra ? null : <span className="w">미답변</span>)
            : <>채점 <b className={ok ? 'r' : 'w'}>{ok ? '맞음' : '틀림'}</b></>}
          <ModelAnswer q={q} />
        </div>
      ) : (
        <div className="a">
          {a === undefined
            ? (extra ? null : <span className="w">미답변</span>)
            : <>내 답 <b className={ok ? 'r' : 'w'}>{CIRC[a]} <Rich text={q.o[a]} /></b></>}
          {(!ok || a === undefined) && <div>정답 <b className="r">{CIRC[q.a]} <Rich text={q.o[q.a]} /></b></div>}
        </div>
      )}
      <div className="ex">{q.e}</div>
      {q.ref && <a className="exam-note-link" href={q.ref.url} target="_blank" rel="noopener noreferrer">근거: {q.ref.label} ↗</a>}
      <QuestionSim q={q} />
      <QuestionExplanation q={q} />
      <ReportButton q={q} />
    </div>
  );
}

function ReviewList({ items, sections, defaultFilter, marks, onMark }) {
  const [filter, setFilter] = useState(defaultFilter);
  const wrongs = items.filter(x => !x.ok);
  const list = filter === 'wrong' ? wrongs : items;
  return (
    <>
      <div className="exam-filters">
        <button className={`exam-btn sm ${filter === 'wrong' ? 'on' : ''}`} onClick={() => setFilter('wrong')}>오답 {wrongs.length}</button>
        <button className={`exam-btn sm ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>전체 {items.length}</button>
      </div>
      {list.length === 0
        ? <div className="empty"><div className="empty-icon">🎉</div>틀린 문제가 없습니다. 전부 정답입니다.</div>
        : <div className="exam-review">{list.map(it => <ReviewCard key={it.q.id} q={it.q} a={it.a} sections={sections} marked={marks?.[it.q.id]?.on} onMark={onMark} />)}</div>}
    </>
  );
}

function WrongBook({ Q, ids, stats, sections, marks, onMark }) {
  const [filter, setFilter] = useState('all');
  if (!ids.length) return <div className="empty"><div className="empty-icon">📋</div>아직 틀린 문제가 없습니다. 모의고사나 영역별 연습을 먼저 풀어보세요.</div>;
  const has = new Set(Q.filter(q => ids.includes(q.id)).map(q => q.sec)); // 문제가 있는 영역만 탭으로 낸다
  const tabs = [['all', '전체'], ...Object.entries(sections).filter(([k]) => has.has(k)).map(([k, v]) => [k, v.name])];
  const qs = Q.filter(q => ids.includes(q.id) && (filter === 'all' || q.sec === filter))
    .sort((x, y) => stats[y.id].w - stats[x.id].w);
  return (
    <>
      <div className="exam-filters">
        {tabs.map(([k, t]) => {
          const cnt = k === 'all' ? ids.length : ids.filter(id => Q.find(q => q.id === id).sec === k).length;
          return <button key={k} className={`exam-btn sm ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{t} {cnt}</button>;
        })}
      </div>
      <div className="exam-review">
        {qs.map(q => (
          <ReviewCard
            key={q.id}
            q={q}
            sections={sections}
            marked={marks?.[q.id]?.on}
            onMark={onMark}
            extra={<><span className="exam-chip wrong">오답 {stats[q.id].w}회</span><span className="exam-chip">{stats[q.id].last === 'r' ? '해결' : '미해결'}</span></>}
          />
        ))}
      </div>
    </>
  );
}

function MarkBook({ Q, ids, stats, sections, marks, onMark }) {
  const [filter, setFilter] = useState('all');
  if (!ids.length) return <div className="empty"><div className="empty-icon">☆</div>아직 북마크한 문제가 없습니다. 문제를 풀다가 ☆ 버튼을 눌러 표시해 두세요.</div>;
  const has = new Set(Q.filter(q => ids.includes(q.id)).map(q => q.sec)); // 문제가 있는 영역만 탭으로 낸다
  const tabs = [['all', '전체'], ...Object.entries(sections).filter(([k]) => has.has(k)).map(([k, v]) => [k, v.name])];
  const qs = Q.filter(q => ids.includes(q.id) && (filter === 'all' || q.sec === filter))
    .sort((x, y) => (marks[y.id]?.at || 0) - (marks[x.id]?.at || 0));
  return (
    <>
      <div className="exam-filters">
        {tabs.map(([k, t]) => {
          const cnt = k === 'all' ? ids.length : ids.filter(id => Q.find(q => q.id === id).sec === k).length;
          if (k !== 'all' && !cnt) return null;
          return <button key={k} className={`exam-btn sm ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>{t} {cnt}</button>;
        })}
      </div>
      <div className="exam-review">
        {qs.map(q => {
          const s = stats[q.id];
          return (
            <ReviewCard
              key={q.id}
              q={q}
              sections={sections}
              marked
              onMark={onMark}
              extra={s ? <span className={`exam-chip ${s.last === 'w' ? 'wrong' : ''}`}>{s.last === 'w' ? `최근 오답 · 누적 ${s.w}회` : '최근 정답'}</span> : <span className="exam-chip">아직 안 푼 문제</span>}
            />
          );
        })}
      </div>
    </>
  );
}
