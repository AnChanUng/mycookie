import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { formatNewsDate } from '../newsFormat';
import './CompanyNews.css';

// 기업 소식(/news). 대기업 기술 블로그와 뉴스룸의 새 글을 일주일에 한 번 모아 최신순으로 20개씩 보여 준다.
// "더 보기"를 누르면 더 오래된 글이 이어진다. 제목과 짧은 요약만 보여 주고, 원문은 새 탭에서 연다
const PAGE_SIZE = 20;
const params = (page, company) => ({ page, size: PAGE_SIZE, ...(company ? { company } : {}) });

export default function CompanyNewsPage() {
  // 주소의 ?company=네이버처럼 회사를 지정해 그 회사 소식만 바로 열 수 있다
  const [search, setSearch] = useSearchParams();
  const company = search.get('company') || '';
  const setCompany = name => setSearch(name ? { company: name } : {}, { replace: true });

  // key는 지금 담긴 목록이 어느 회사의 것인지 나타낸다. 회사가 바뀌면 key가 달라져 "불러오는 중"이 된다
  const [state, setState] = useState({ key: null, items: [], page: 0, hasMore: false, total: 0, companies: [], error: false });
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState({ loading: false, error: false });

  useEffect(() => {
    let alive = true;
    api.get('/news', { params: params(0, company), timeout: 15000 })
      .then(({ data }) => {
        if (!alive) return;
        setState({
          key: company, items: data.items || [], page: data.page || 0, hasMore: !!data.hasMore, total: data.total || 0,
          companies: Array.isArray(data.companies) ? data.companies : [], error: false,
        });
      })
      .catch(e => {
        if (!alive) return;
        // 목록에 없는 회사 이름이 주소에 들어왔으면 전체 목록으로 돌아간다
        if (e?.response?.status === 400 && company) { setSearch({}, { replace: true }); return; }
        setState(s => ({ ...s, key: company, items: [], error: true }));
      });
    return () => { alive = false; };
  }, [company, attempt, setSearch]);

  const loading = state.key !== company;
  const items = loading ? [] : state.items;
  const { hasMore, total, companies, error } = state;

  const loadMore = async () => {
    setMore({ loading: true, error: false });
    try {
      const { data } = await api.get('/news', { params: params(state.page + 1, company), timeout: 15000 });
      setState(s => (s.key !== company ? s : { ...s, items: [...s.items, ...(data.items || [])], page: data.page, hasMore: !!data.hasMore, total: data.total || s.total }));
      setMore({ loading: false, error: false });
    } catch {
      setMore({ loading: false, error: true });
    }
  };
  const retry = () => { setState(s => ({ ...s, key: null, error: false })); setAttempt(n => n + 1); };

  return (
    <div className="cn fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>기업 소식</h1>
        <p>대기업 기술 블로그와 뉴스룸의 새 글을 일주일에 한 번 모아 최신순으로 보여 드려요. 제목을 누르면 원문으로 이동합니다.</p>
      </div>

      {companies.length > 0 && <div className="cn-filter" role="group" aria-label="회사별로 보기">
        <button type="button" className={!company ? 'on' : ''} aria-pressed={!company} onClick={() => setCompany('')}>전체</button>
        {companies.map(c => <button key={c} type="button" className={company === c ? 'on' : ''} aria-pressed={company === c} title={`${c} 소식만 보기`} onClick={() => setCompany(c)}>{c}</button>)}
      </div>}

      {items.length > 0 && <p className="cn-count" role="status">{company ? `${company} 소식만 보는 중` : '전체'} · 모인 글 {total.toLocaleString()}개 중 {items.length.toLocaleString()}개를 보고 있어요</p>}

      <ul className="cn-list">
        {items.map(item => <li key={item.id} className="cn-item">
          <div className="cn-meta"><span className="cn-company">{item.company}</span><span>{item.source}</span><time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time></div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="cn-title">{item.title}<span className="sr-only"> (새 탭에서 열림)</span></a>
          {item.summary && <p className="cn-summary">{item.summary}</p>}
        </li>)}
      </ul>

      {loading && <p className="cn-state" role="status">소식을 불러오는 중…</p>}
      {!loading && error && <p className="cn-state" role="alert">소식을 불러오지 못했어요. <button type="button" className="cn-retry" onClick={retry}>다시 시도</button></p>}
      {!loading && !error && items.length === 0 && <p className="cn-state">아직 모인 소식이 없어요. 매주 월요일 아침에 새 글을 모아요.</p>}
      {more.error && <p className="cn-state" role="alert">더 불러오지 못했어요. <button type="button" className="cn-retry" onClick={loadMore}>다시 시도</button></p>}
      {!loading && !error && hasMore && !more.error && <div className="cn-more"><button type="button" className="exam-btn" disabled={more.loading} onClick={loadMore}>{more.loading ? '불러오는 중…' : '더 보기'}</button></div>}

      <p className="cn-note">글의 저작권은 각 회사에 있고, 나의쿠키는 제목과 짧은 요약만 보여 드려요.</p>
    </div>
  );
}
