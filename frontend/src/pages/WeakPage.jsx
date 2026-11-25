import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BANKS, allQuestions, companyPath } from '../data/examQuestions';
import { dailyWrongRows } from '../dailyPracticeRecords';
import './DailyPracticePage.css';

// 문제은행마다 따로 쌓이는 풀이 기록을 한자리에 모아, 어느 영역이 약한지 보여 준다.
// 기록은 이 브라우저의 로컬 저장소에만 있으므로 서버를 부르지 않는다
function readStats(key) {
  try {
    const raw = localStorage.getItem(`exam-progress:${key}`);
    return raw ? (JSON.parse(raw) || {}) : {};
  } catch {
    return {};
  }
}

const rate = (c, w) => (c + w ? Math.round(c / (c + w) * 100) : null);

// 은행이 달라도 영역 이름이 같으면 한 줄로 합친다 (예: 여러 은행의 "데이터베이스")
function collect() {
  const areas = new Map();
  const topics = new Map();
  const banks = [];
  let seen = 0, correct = 0, wrong = 0, total = 0, marks = 0, lastAt = 0;

  for (const bank of BANKS) {
    const saved = readStats(bank.key);
    const stats = saved.stats || {};
    const questions = allQuestions(bank);
    let bankSeen = 0, bankC = 0, bankW = 0, bankOpen = 0;

    for (const q of questions) {
      total++;
      const s = stats[q.id];
      if (!s || !(s.c || s.w)) continue;
      seen++;
      bankSeen++;
      correct += s.c;
      wrong += s.w;
      bankC += s.c;
      bankW += s.w;
      if (s.last === 'w') bankOpen++;
      if ((s.at || 0) > lastAt) lastAt = s.at || 0;

      const areaName = bank.sections?.[q.sec]?.name || q.sec || '기타';
      const area = areas.get(areaName) || { name: areaName, c: 0, w: 0, open: 0, banks: new Set() };
      area.c += s.c;
      area.w += s.w;
      if (s.last === 'w') area.open++;
      area.banks.add(bank.key);
      areas.set(areaName, area);

      if (q.topic) {
        const topic = topics.get(q.topic) || { name: q.topic, area: areaName, c: 0, w: 0 };
        topic.c += s.c;
        topic.w += s.w;
        topics.set(q.topic, topic);
      }
    }

    marks += Object.values(saved.marks || {}).filter(m => m?.on).length;
    // 아직 손대지 않은 문제은행도 넣어서 전체 진도를 한눈에 보게 한다
    if (bank.ready !== false) {
      banks.push({
        key: bank.key, name: bank.name, seen: bankSeen, total: questions.length,
        percent: rate(bankC, bankW), open: bankOpen,
        to: bank.key === 'ncs' ? '/ncs' : companyPath(bank),
      });
    }
  }

  const byWeakest = (a, b) => rate(a.c, a.w) - rate(b.c, b.w) || (b.c + b.w) - (a.c + a.w);
  return {
    seen, total, correct, wrong, marks, lastAt,
    percent: rate(correct, wrong),
    areas: [...areas.values()].sort(byWeakest),
    // 한 번만 푼 주제는 정답률이 0% 아니면 100%라 판단에 쓸 수 없어 2회 이상만 본다
    topics: [...topics.values()].filter(t => t.c + t.w >= 2).sort(byWeakest).slice(0, 15),
    banks: banks.sort((a, b) => b.open - a.open || b.seen - a.seen),
  };
}

const fmtDay = (ts) => {
  if (!ts) return '–';
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export default function WeakPage() {
  const s = useMemo(() => collect(), []);
  const daily = useMemo(() => dailyWrongRows(), []);

  if (!s.seen && !daily.length) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Link to="/" className="back-link">← 홈으로</Link>
          <h1>약점 분석</h1>
          <p>문제를 풀면 영역별 정답률을 모아서 보여 드립니다.</p>
        </div>
        <div className="empty">
          <div className="empty-icon">📊</div>
          아직 풀이 기록이 없습니다. 문제은행에서 몇 문제만 풀고 오면 약한 영역이 바로 보입니다.
        </div>
        <div className="exam-filters">
          <Link className="exam-btn primary" to="/exam">기업별 기출문제</Link>
          <Link className="exam-btn" to="/ncs">NCS</Link>
        </div>
      </div>
    );
  }

  const worst = s.areas[0];
  const hasExam = s.seen > 0;

  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>약점 분석</h1>
        <p>
          모든 문제은행의 풀이 기록을 영역별로 합쳐서 봅니다. 기록은 이 브라우저에만 저장됩니다
          {s.lastAt ? ` · 마지막 풀이 ${fmtDay(s.lastAt)}` : ''}
        </p>
      </div>

      {daily.length > 0 && <DailyWrongSection rows={daily} />}

      {hasExam && <>
      <div className="exam-stats">
        <Tile k="푼 문제" v={s.seen} unit=" 문제" sub={`전체 ${s.total}문제 중 ${Math.round(s.seen / s.total * 100)}%`} />
        <Tile k="전체 정답률" v={s.percent} unit=" %" sub={`맞힘 ${s.correct} · 틀림 ${s.wrong}`} />
        <Tile k="다시 풀 문제" v={s.banks.reduce((n, b) => n + b.open, 0)} unit=" 문제" sub="마지막 풀이에서 틀린 문제" />
        <Tile k="북마크" v={s.marks} unit=" 문제" sub="별표로 표시해 둔 문제" />
      </div>

      {worst && worst.c + worst.w >= 3 && (
        <p className="exam-lede">
          지금 가장 약한 영역은 <b>{worst.name}</b>입니다. {worst.c + worst.w}번 풀어서 정답률 {rate(worst.c, worst.w)}%,
          아직 {worst.open}문제가 틀린 상태입니다.
        </p>
      )}

      <div className="section-title">영역별 정답률 (낮은 순)</div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>영역</th><th>정답률</th><th>푼 횟수</th><th>틀린 상태</th><th>문제은행</th><th className="admin-barcol">정답률</th></tr></thead>
          <tbody>
            {s.areas.map(a => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td className="num">{rate(a.c, a.w)}%</td>
                <td className="num">{a.c + a.w}</td>
                <td className="num">{a.open}</td>
                <td className="num">{a.banks.size}</td>
                <td className="admin-barcol"><span className="admin-bar"><i style={{ width: `${rate(a.c, a.w)}%` }} /></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="exam-note">푼 횟수가 적은 영역은 정답률이 크게 흔들립니다. 5회 이상 푼 영역부터 믿을 만합니다.</p>

      {s.topics.length > 0 && (
        <>
          <div className="section-title">약한 세부 주제</div>
          <div className="exam-table-wrap">
            <table className="exam-table admin-table">
              <thead><tr><th>주제</th><th>영역</th><th>정답률</th><th>푼 횟수</th></tr></thead>
              <tbody>
                {s.topics.map(t => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td>{t.area}</td>
                    <td className="num">{rate(t.c, t.w)}%</td>
                    <td className="num">{t.c + t.w}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="exam-note">두 번 이상 푼 주제만 모았습니다. 정답률이 낮은 순서입니다.</p>
        </>
      )}

      <div className="section-title">문제은행별 진도</div>
      <p className="exam-lede">전체 {s.banks.length}개 문제은행 중 {s.banks.filter(b => b.seen).length}개를 풀기 시작했습니다. 아직 시작하지 않은 문제은행도 함께 보여 줍니다.</p>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>문제은행</th><th>푼 문제</th><th className="admin-barcol">진도</th><th>정답률</th><th>틀린 상태</th><th>바로 가기</th></tr></thead>
          <tbody>
            {s.banks.map(b => (
              <tr key={b.key}>
                <td>{b.name}</td>
                <td className="num">{b.seen} / {b.total}</td>
                <td className="admin-barcol"><span className="admin-bar"><i style={{ width: `${Math.round(b.seen / b.total * 100)}%` }} /></span></td>
                <td className="num">{b.seen ? `${b.percent}%` : '–'}</td>
                <td className="num">{b.seen ? b.open : '–'}</td>
                <td><Link className="exam-btn sm" to={b.to}>{!b.seen ? '시작하기' : b.open ? '오답 다시 풀기' : '이어서 풀기'}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}
    </div>
  );
}

const MARKS = ['①', '②', '③', '④'];

// 학습 메일 "오늘 주제 5문제"에서 마지막에 틀린 문제. 같은 문제를 다시 맞히면 목록에서 빠진다
function DailyWrongSection({ rows }) {
  return (
    <>
      <div className="section-title">학습 메일 연습 오답 ({rows.length}문제)</div>
      <p className="exam-lede">메일의 "오늘 주제 5문제"에서 틀린 문제입니다. 다시 풀어 맞히면 이 목록에서 빠집니다.</p>
      <div className="weak-daily">
        {rows.map(r => (
          <details key={r.id} className="weak-daily-item">
            <summary>{r.question.title} <small>· {r.theme}</small></summary>
            <p>{r.question.prompt}</p>
            <p><b>정답 {MARKS[r.question.answer]}</b> {r.question.options[r.question.answer]}</p>
            {r.question.explanation.map((line, i) => <p key={i}>{line}</p>)}
            <Link className="exam-btn sm" to={`/daily/${r.day}`}>이 주제 다시 풀기</Link>
          </details>
        ))}
      </div>
    </>
  );
}

function Tile({ k, v, sub, unit }) {
  return (
    <div className="exam-stat">
      <div className="k">{k}</div>
      <div className="v">{v}<small>{unit}</small></div>
      <div className="admin-sub">{sub}</div>
    </div>
  );
}
