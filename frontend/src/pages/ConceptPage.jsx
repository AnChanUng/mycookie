import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api';
import { SITE_NAME } from '../seo';
import './ConceptPage.css';

// 학습 메일의 개념 링크(/concepts/:slug)로 들어오는 화면. 메일에는 한 줄 정리만 넣고,
// 자세한 설명 · 심화 학습 질문 · 근거가 되는 공식 문서는 여기서 보여 준다(내용은 서버 DB에서 내려온다)
export default function ConceptPage() {
  const { slug } = useParams();
  return <Concept key={slug} slug={slug} />;
}

function Concept({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    api.get(`/concepts/${encodeURIComponent(slug)}`)
      .then(({ data: body }) => { if (!stale) setData(body); })
      .catch(e => {
        if (stale) return;
        setError(e?.response?.status === 404
          ? (e.response.data?.error || '찾는 개념 설명이 없어요.')
          : '개념 설명을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.');
      });
    return () => { stale = true; };
  }, [slug]);

  useEffect(() => {
    if (data?.term) document.title = `${data.term} | 개념 정리 | ${SITE_NAME}`;
  }, [data]);

  if (error) return <div className="concept-page fade-in"><p role="alert">{error}</p><Link className="exam-btn sm" to="/">첫 화면으로</Link></div>;
  if (!data) return <div className="concept-page fade-in"><p role="status">개념 설명을 불러오는 중…</p></div>;

  return <article className="concept-page fade-in">
    <header className="page-header">
      <p className="concept-kicker">학습 메일 개념 정리</p>
      <h1>{data.term}</h1>
    </header>

    <section className="concept-card concept-summary" aria-labelledby="concept-summary">
      <h2 id="concept-summary">한 줄 정리</h2>
      <p>{data.summary}</p>
    </section>

    <section className="concept-card" aria-labelledby="concept-body">
      <h2 id="concept-body">자세히 알아보기</h2>
      {data.body.map((paragraph, i) => <p key={i}>{paragraph}</p>)}
    </section>

    <section className="concept-card" aria-labelledby="concept-deeper">
      <h2 id="concept-deeper">심화 학습 질문</h2>
      <p className="concept-hint">답을 바로 찾기 전에 먼저 내 말로 설명해 보고, 아래 공식 문서로 확인해 보세요.</p>
      <ol className="concept-list">
        {data.deeper.map((question, i) => <li key={i}>{question}</li>)}
      </ol>
    </section>

    <section className="concept-card" aria-labelledby="concept-sources">
      <h2 id="concept-sources">근거가 되는 공식 문서</h2>
      <ul className="concept-list">
        {data.sources.map(source => <li key={source.url}>
          <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
        </li>)}
      </ul>
    </section>

    {data.sets?.length > 0 && <section className="concept-card" aria-labelledby="concept-sets">
      <h2 id="concept-sets">이 개념이 나온 문제</h2>
      <ul className="concept-list">
        {data.sets.map(set => <li key={set.day}>
          <Link to={`/daily/${set.day}`}>#{set.day} {set.theme} · {set.title}</Link>
          <span className="concept-muted"> (같은 주제 5문제 풀기)</span>
        </li>)}
      </ul>
    </section>}

    {data.related?.length > 0 && <section className="concept-card" aria-labelledby="concept-related">
      <h2 id="concept-related">함께 보면 좋은 개념</h2>
      <div className="concept-chips">
        {data.related.map(item => <Link key={item.slug} className="concept-chip" to={`/concepts/${item.slug}`}>{item.term}</Link>)}
      </div>
    </section>}
  </article>;
}
