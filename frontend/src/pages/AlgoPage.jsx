import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CodeTokens } from '../components/Code';
import { tokenLines } from '../codeTokens';

// 반에서 같이 푼 알고리즘 문제의 풀이를 문제별로 모아 본다.
// 풀이 묶음은 크기가 커서 번들에 넣지 않고 public/algo/algo100.json 을 화면을 열 때 받아 온다.
// 형식: [{ title, url, date, solutions: [{ by, memo, code }] }] — by는 성만 남긴 표시 이름
const lineCount = (code) => code.split('\n').length;

export default function AlgoPage() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [pi, setPi] = useState(0);
  const [mode, setMode] = useState('one'); // one | two | all
  const [picked, setPicked] = useState([0]);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    fetch('/algo/algo100.json')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('load'))))
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data || []).map((p, i) => ({ p, i })).filter(({ p }) => !q || p.title.toLowerCase().includes(q));
  }, [data, query]);

  if (failed) return <div className="empty"><div className="empty-icon">📭</div>풀이를 불러오지 못했습니다. 잠시 뒤에 다시 열어 주세요.</div>;
  if (!data) return <div className="loading"><div className="loading-spinner" />불러오는 중...</div>;

  const problem = data[pi];
  const total = data.reduce((n, p) => n + p.solutions.length, 0);
  const shown = mode === 'all' ? problem.solutions : picked.map(i => problem.solutions[i]).filter(Boolean);

  const openProblem = (i) => { setPi(i); setPicked(mode === 'two' ? [0, 1] : [0]); };
  const pick = (i) => {
    if (mode === 'all') { setMode('one'); setPicked([i]); return; }
    // 둘 나란히에서는 방금 고른 것과 그 전에 고른 것 두 개를 남긴다
    setPicked(mode === 'two' ? [...picked.filter(x => x !== i), i].slice(-2) : [i]);
  };
  const changeMode = (next) => {
    setMode(next);
    const last = picked[picked.length - 1] ?? 0;
    if (next === 'two' && picked.length < 2) setPicked([last, last === 0 ? 1 : 0]);
    if (next === 'one') setPicked([last]);
  };
  const copy = async (s) => {
    try { await navigator.clipboard.writeText(s.code); setCopied(s.by); } catch { setCopied(null); }
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="fade-in algo">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>코테 풀이 모아보기</h1>
        <p>같은 문제를 여러 사람이 어떻게 풀었는지 한 화면에서 비교합니다 · {data.length}문제 · 풀이 {total}개 · Java</p>
      </div>


      <div className="algo-body">
        <aside className="algo-side">
          <input type="text" placeholder="문제 번호·이름 검색" value={query} onChange={e => setQuery(e.target.value)} />
          <ul>
            {list.map(({ p, i }) => (
              <li key={i}>
                <button type="button" className={i === pi ? 'on' : ''} onClick={() => openProblem(i)}>
                  <span className="t">{p.title}</span>
                  <span className="d">{p.date} · 풀이 {p.solutions.length}개</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="algo-none">맞는 문제가 없습니다.</li>}
          </ul>
        </aside>

        <div className="algo-main">
          <div className="algo-title">
            <h2>{problem.title}</h2>
            {problem.url && <a href={problem.url} target="_blank" rel="noopener noreferrer">문제 보기 ↗</a>}
          </div>
          <div className="algo-bar">
            {problem.solutions.map((s, i) => (
              <button key={i} type="button" className={`algo-chip${mode !== 'all' && picked.includes(i) ? ' on' : ''}`} onClick={() => pick(i)}>
                {s.by}<small>{lineCount(s.code)}줄</small>
              </button>
            ))}
          </div>
          <div className="exam-filters">
            <button type="button" className={`exam-btn sm ${mode === 'one' ? 'on' : ''}`} onClick={() => changeMode('one')}>하나씩</button>
            <button type="button" className={`exam-btn sm ${mode === 'two' ? 'on' : ''}`} onClick={() => changeMode('two')}>둘 나란히</button>
            <button type="button" className={`exam-btn sm ${mode === 'all' ? 'on' : ''}`} onClick={() => changeMode('all')}>전부</button>
          </div>

          <div className={`algo-view ${mode}`}>
            {shown.map(s => (
              <section key={s.by} className="algo-sol">
                <div className="algo-sol-head">
                  <b>{s.by}</b>
                  <span>{lineCount(s.code)}줄</span>
                  <button type="button" className="exam-btn sm" onClick={() => copy(s)}>{copied === s.by ? '복사됨' : '복사'}</button>
                </div>
                {s.memo && <p className="algo-memo">{s.memo}</p>}
                <pre className="algo-code">{tokenLines(s.code).map((line, n) => <span key={n}>{line.length ? <CodeTokens tokens={line} /> : ' '}</span>)}</pre>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
