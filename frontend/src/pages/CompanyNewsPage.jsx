import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import './CompanyNews.css';

// 기업 소식(/news). 대기업 기술 블로그와 뉴스룸의 새 글을 일주일에 한 번 모아 최신순으로 20개씩 보여 준다.
// "더 보기"를 누르면 더 오래된 글이 이어진다. 제목과 짧은 요약만 보여 주고, 원문은 새 탭에서 연다
const PAGE_SIZE = 20;

export const formatNewsDate = iso => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const kst = new Date(date.getTime() + 9 * 3600000);
  return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')}`;
};

export default function CompanyNewsPage() {
  // 주소의 ?company=네이버처럼 회사를 지정해 그 회사 소식만 바로 열 수 있다
  const [params, setParams] = useSearchParams();
  const company = params.get('company') || '';
  const setCompany = name => setParams(name ? { company: name } : {}, { replace: true });
  const [state, setState] = useState({ items: [], page: 0, hasMore: false, total: 0, companies: [], loading: true, error: false });
  // 회사를 빠르게 바꿀 때 늦게 도착한 이전 응답이 화면을 덮지 않게 한다
  const request = useRef(0);

  const load = useCallback(async (nextCompany, page) => {
    const id = ++request.current;
    setState(s => ({ ...s, loading: true, error: false }));
    try {
      const { data } = await api.get('/news', { params: { page, size: PAGE_SIZE, ...(nextCompany ? { company: nextCompany } : {}) }, timeout: 15000 });
      if (id !== request.current) return;
      setState(s => ({
        items: page === 0 ? data.items : [...s.items, ...data.items],
        page: data.page, hasMore: !!data.hasMore, total: data.total || 0,
        companies: Array.isArray(data.companies) ? data.companies : s.companies,
        loading: false, error: false,
      }));
    } catch (e) {
      if (id !== request.current) return;
      // 목록에 없는 회사 이름이 주소에 들어왔으면 전체 목록으로 돌아간다
      if (e?.response?.status === 400 && nextCompany) { setParams({}, { replace: true }); return; }
      setState(s => ({ ...s, loading: false, error: true }));
    }
  }, [setParams]);

  useEffect(() => { load(company, 0); }, [company, load]);

  const { items, hasMore, total, companies, loading, error } = state;
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
      {error && <p className="cn-state" role="alert">소식을 불러오지 못했어요. <button type="button" className="cn-retry" onClick={() => load(company, items.length ? state.page + 1 : 0)}>다시 시도</button></p>}
      {!loading && !error && items.length === 0 && <p className="cn-state">아직 모인 소식이 없어요. 매주 월요일 아침에 새 글을 모아요.</p>}
      {!loading && !error && hasMore && <div className="cn-more"><button type="button" className="exam-btn" onClick={() => load(company, state.page + 1)}>더 보기</button></div>}

      <p className="cn-note">글의 저작권은 각 회사에 있고, 나의쿠키는 제목과 짧은 요약만 보여 드려요.</p>
    </div>
  );
}
