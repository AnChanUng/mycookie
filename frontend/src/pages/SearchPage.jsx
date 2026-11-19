import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { COMPANIES, NCS, allQuestions, companyPath } from '../data/examQuestions';
import { ReviewCard } from './ExamCompanyPage';

const LIMIT = 50;

// 모든 문제은행을 한 목록으로 펴고, 검색용으로 문제 · 보기 · 해설 · 토픽을 한 줄로 합쳐 둔다
const BANKS = [
  ...COMPANIES.filter(c => c.ready).map(c => ({ bank: c, to: companyPath(c) })),
  { bank: NCS, to: '/ncs' },
];
const INDEX = BANKS.flatMap(({ bank, to }) =>
  allQuestions(bank).map(q => ({
    q, bank, to,
    text: [q.topic, q.ctx, q.code, q.q, ...(q.o || []), q.ans, ...(q.pts || []), q.e].filter(Boolean).join('\n').toLowerCase(),
  })));

export default function SearchPage() {
  const [input, setInput] = useState('');
  // 띄어 쓴 단어가 모두 들어 있는 문제만 남긴다
  const words = useMemo(() => input.toLowerCase().split(/\s+/).filter(Boolean), [input]);
  const hits = useMemo(
    () => (words.length ? INDEX.filter(x => words.every(w => x.text.includes(w))) : []),
    [words],
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>문제 검색</h1>
        <p>모든 문제은행 {INDEX.length}문항의 문제 · 보기 · 해설에서 찾습니다. 단어를 띄어 쓰면 모두 들어 있는 문제만 나옵니다.</p>
      </div>

      <input
        className="exam-search"
        type="search"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="예: 교착상태, 정규화, TCP 흐름제어"
        autoFocus
      />

      {words.length === 0 ? (
        <p className="exam-note">시험 직전에 헷갈리는 개념을 검색해서 관련 문제와 해설만 빠르게 훑어볼 수 있습니다.</p>
      ) : hits.length === 0 ? (
        <div className="empty"><div className="empty-icon">🔎</div>"{input.trim()}"에 맞는 문제가 없습니다.</div>
      ) : (
        <>
          <p className="exam-note exam-search-count">
            {hits.length}문제{hits.length > LIMIT ? ` 중 앞의 ${LIMIT}문제만 보여줍니다. 단어를 더 넣어 좁혀 보세요.` : ''}
          </p>
          <div className="exam-review">
            {hits.slice(0, LIMIT).map(({ q, bank, to }) => (
              <ReviewCard
                key={`${bank.key}:${q.id}`}
                q={q}
                sections={bank.sections}
                extra={<Link to={to} className="exam-chip exam-search-bank">{bank.name} →</Link>}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
