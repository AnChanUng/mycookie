import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import LineIcon from './LineIcon';
import { formatNewsDate } from '../newsFormat';
import '../pages/CompanyNews.css';

// 첫 화면의 "기업 소식": 가장 최근 글 5개만 보여 주고, 더 보려면 전체 보기(/news)로 간다.
// 불러오지 못했거나 아직 모인 글이 없으면 구역 자체를 보이지 않는다(첫 화면이 비어 보이지 않게)
export default function CompanyNewsPreview() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/news', { params: { size: 5 }, signal: controller.signal, timeout: 15000 })
      .then(({ data }) => { if (Array.isArray(data?.items)) setItems(data.items); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  if (!items.length) return null;
  return <section className="mn-section" aria-labelledby="mn-news">
    <div className="mn-section-head">
      <h2 id="mn-news">기업 소식</h2>
      <span className="mn-note">대기업 기술 블로그 · 뉴스룸 새 글</span>
      <Link to="/news" className="mn-section-more">전체 보기 <LineIcon name="chevron" size={14} /></Link>
    </div>
    <ul className="cn-home">
      {items.map(item => <li key={item.id}>
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <span className="cn-company">{item.company}</span>
          <span className="cn-home-title">{item.title}<span className="sr-only"> (새 탭에서 열림)</span></span>
          <time dateTime={item.publishedAt}>{formatNewsDate(item.publishedAt)}</time>
        </a>
      </li>)}
    </ul>
  </section>;
}
