import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api';
import { HubHeader } from '../components/Hub';
import { daysAgo, formatNewsDate, newsDateGroup, relativeNewsDate } from '../newsFormat';
import { addToShelf, clearShelf, loadShelf, SHELF_KEYS, toggleShelf } from '../techBlogShelf';
import './TechBlogs.css';

// 기술 블로그(/tech-blogs). 국내 IT 기업 기술 블로그의 새 글을 서버가 매일 모아 두면(RSS) 최신순으로 읽기 좋게 보여 준다.
// 제목 · 짧은 요약 · 날짜만 보여 주고 원문은 새 탭에서 연다. "나중에 읽기"와 "읽은 글"은 이 기기에 기억한다.
// 주소의 ?company= · ?q= · ?tab=으로 회사, 검색어, 탭을 바로 열 수 있다
const PAGE_SIZE = 20;
const TABS = [
  { key: 'new', label: '새 글' },
  { key: 'saved', label: '나중에 읽기' },
  { key: 'read', label: '읽은 글' },
];
const params = (page, company, q) => ({ kind: 'tech', page, size: PAGE_SIZE, ...(company ? { company } : {}), ...(q ? { q } : {}) });

// 회사마다 알아보기 쉬운 색. 목록에 없는 회사는 이름으로 정해진 색을 쓴다
const BRAND = {
  네이버: '#03c75a', 카카오: '#e0a800', 카카오페이: '#e0a800', 카카오뱅크: '#e0a800', LINE: '#06c755', 쿠팡: '#e52528',
  배민: '#2ac1bc', 무신사: '#5b5f66', 토스: '#3182f6', 당근: '#ff6f0f', 올리브영: '#9bce26', 요기요: '#fa0050',
  여기어때: '#e5097f', G마켓: '#00a650', 롯데ON: '#e60012', 인프랩: '#00c471', NHN: '#2f6fe4', 하이퍼커넥트: '#7b61ff', 왓챠: '#ff0558',
};
const PALETTE = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];
const brandColor = name => BRAND[name] || PALETTE[[...(name || '')].reduce((n, c) => n + c.codePointAt(0), 0) % PALETTE.length];

// 요약이 제목을 되풀이하거나 너무 짧으면(한두 글자) 보여 주지 않는다
const usefulSummary = item => {
  const s = (item.summary || '').trim();
  if (s.length < 20) return '';
  return s.startsWith(item.title) ? '' : s;
};

function CompanyMark({ company, size }) {
  return (
    <span className={`tb-mark${size === 'lg' ? ' tb-mark--lg' : ''}`} style={{ '--tb-brand': brandColor(company) }} aria-hidden="true">
      {[...(company || '?')][0]}
    </span>
  );
}

function BookmarkIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function SaveButton({ saved, onClick }) {
  return (
    <button type="button" className={`tb-save${saved ? ' on' : ''}`} aria-pressed={saved} onClick={onClick}
      aria-label={saved ? '나중에 읽기에서 빼기' : '나중에 읽기에 담기'} title={saved ? '나중에 읽기에서 빼기' : '나중에 읽기'}>
      <BookmarkIcon filled={saved} />
    </button>
  );
}

// 원문 링크. 누르면(가운데 버튼 포함) 읽은 글로 표시한다
function TitleLink({ item, onOpen, className }) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={className}
      onClick={() => onOpen(item)} onAuxClick={e => { if (e.button === 1) onOpen(item); }}>
      {item.title}<span className="sr-only"> (새 탭에서 열림)</span>
    </a>
  );
}

function FeaturedCard({ item, now, saved, read, onOpen, onToggleSave }) {
  const summary = usefulSummary(item);
  return (
    <li className={`tb-feature${read ? ' is-read' : ''}`} style={{ '--tb-brand': brandColor(item.company) }}>
      <div className="tb-feature-top">
        <CompanyMark company={item.company} size="lg" />
        <span className="tb-feature-company"><b>{item.company}</b><span>{item.source}</span></span>
        <SaveButton saved={saved} onClick={() => onToggleSave(item)} />
      </div>
      <TitleLink item={item} onOpen={onOpen} className="tb-feature-title" />
      {summary && <p className="tb-feature-summary">{summary}</p>}
      <div className="tb-foot">
        <time dateTime={item.publishedAt} title={formatNewsDate(item.publishedAt)}>{relativeNewsDate(item.publishedAt, now)}</time>
        {read ? <span className="tb-read-mark">읽음</span> : daysAgo(item.publishedAt, now) <= 2 && <span className="tb-new">NEW</span>}
      </div>
    </li>
  );
}

function ArticleRow({ item, now, saved, read, onOpen, onToggleSave }) {
  const summary = usefulSummary(item);
  return (
    <li className={`tb-row${read ? ' is-read' : ''}`}>
      <CompanyMark company={item.company} />
      <div className="tb-row-body">
        <div className="tb-meta">
          <b>{item.company}</b><span className="tb-source">{item.source}</span>
          {!read && daysAgo(item.publishedAt, now) <= 2 && <span className="tb-new">NEW</span>}
        </div>
        <TitleLink item={item} onOpen={onOpen} className="tb-title" />
        {summary && <p className="tb-summary">{summary}</p>}
        <div className="tb-foot">
          <time dateTime={item.publishedAt} title={formatNewsDate(item.publishedAt)}>{relativeNewsDate(item.publishedAt, now)}</time>
          {read && <span className="tb-read-mark">읽음</span>}
        </div>
      </div>
      <SaveButton saved={saved} onClick={() => onToggleSave(item)} />
    </li>
  );
}

// 날짜 묶음(오늘 · 어제 · 최근 7일 …)마다 제목을 달아 보여 준다
function GroupedList({ items, now, rowProps }) {
  const groups = [];
  for (const item of items) {
    const label = newsDateGroup(item.publishedAt, now);
    if (groups.at(-1)?.label === label) groups.at(-1).items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups.map(g => (
    <section key={g.label} className="tb-group" aria-label={g.label}>
      <h2 className="tb-group-title">{g.label}<span>{g.items.length}</span></h2>
      <ul className="tb-list">{g.items.map(item => <ArticleRow key={item.url} item={item} now={now} {...rowProps(item)} />)}</ul>
    </section>
  ));
}

export default function TechBlogsPage() {
  const [search, setSearch] = useSearchParams();
  const company = search.get('company') || '';
  const q = (search.get('q') || '').trim().slice(0, 50);
  const tab = TABS.some(t => t.key === search.get('tab')) ? search.get('tab') : 'new';
  const update = changes => setSearch(prev => {
    const next = new URLSearchParams(prev);
    for (const [k, v] of Object.entries(changes)) { if (v) next.set(k, v); else next.delete(k); }
    return next;
  }, { replace: true });

  // 검색창은 글자를 칠 때마다 요청하지 않고, 잠깐 멈추면 주소의 q를 바꾼다
  const [draft, setDraft] = useState(q);
  useEffect(() => {
    const value = draft.trim();
    if (value === q) return undefined;
    const timer = setTimeout(() => update({ q: value, tab: '' }), 350);
    return () => clearTimeout(timer);
    // update는 setSearch로만 만든 함수라 빼 둔다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, q]);

  // 이 기기에 기억한 나중에 읽기 · 읽은 글. 다른 탭에서 바꿔도 따라온다
  const [shelf, setShelf] = useState(() => ({ saved: loadShelf('saved'), read: loadShelf('read') }));
  useEffect(() => {
    const sync = e => { if (!e.key || Object.values(SHELF_KEYS).includes(e.key)) setShelf({ saved: loadShelf('saved'), read: loadShelf('read') }); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const savedUrls = useMemo(() => new Set(shelf.saved.map(a => a.url)), [shelf.saved]);
  const readUrls = useMemo(() => new Set(shelf.read.map(a => a.url)), [shelf.read]);
  // 저장은 상태 갱신 함수 밖에서 한 번만 한다(개발 모드는 갱신 함수를 두 번 불러 토글이 되돌아간다)
  const onOpen = item => { const read = addToShelf('read', item); setShelf(s => ({ ...s, read })); };
  const onToggleSave = item => { const saved = toggleShelf('saved', item); setShelf(s => ({ ...s, saved })); };
  const clearRead = () => { if (window.confirm('읽은 글 표시를 모두 지울까요?')) { const read = clearShelf('read'); setShelf(s => ({ ...s, read })); } };
  const rowProps = item => ({ saved: savedUrls.has(item.url), read: readUrls.has(item.url), onOpen, onToggleSave });

  // key는 지금 담긴 목록이 어느 회사 · 검색어의 것인지 나타낸다. 바뀌면 key가 달라져 "불러오는 중"이 된다
  const listKey = `${company}\n${q}`;
  const [state, setState] = useState({ key: null, items: [], page: 0, hasMore: false, total: 0, companies: [], error: false });
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState({ loading: false, error: false });
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let alive = true;
    api.get('/news', { params: params(0, company, q), timeout: 15000 })
      .then(({ data }) => {
        if (!alive) return;
        setState(s => ({
          key: listKey, items: data.items || [], page: data.page || 0, hasMore: !!data.hasMore, total: data.total || 0,
          companies: Array.isArray(data.companies) && data.companies.length ? data.companies : s.companies, error: false,
        }));
      })
      .catch(e => {
        if (!alive) return;
        // 목록에 없는 회사나 너무 긴 검색어가 주소에 들어왔으면 지우고 다시 불러온다
        if (e?.response?.status === 400 && (company || q)) { update({ company: '', q: '' }); setDraft(''); return; }
        setState(s => ({ ...s, key: listKey, items: [], error: true }));
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey, attempt]);

  const loading = state.key !== listKey;
  const items = loading ? [] : state.items;
  const { hasMore, total, companies, error } = state;

  const loadMore = async () => {
    setMore({ loading: true, error: false });
    try {
      const { data } = await api.get('/news', { params: params(state.page + 1, company, q), timeout: 15000 });
      setState(s => (s.key !== listKey ? s : { ...s, items: [...s.items, ...(data.items || [])], page: data.page, hasMore: !!data.hasMore, total: data.total || s.total }));
      setMore({ loading: false, error: false });
    } catch {
      setMore({ loading: false, error: true });
    }
  };
  const retry = () => { setState(s => ({ ...s, key: null, error: false })); setAttempt(n => n + 1); };

  // 처음 화면(회사 · 검색 없이 새 글)에서는 가장 새 글 셋을 크게 보여 준다
  const showFeatured = tab === 'new' && !company && !q && items.length > 3;
  const featured = showFeatured ? items.slice(0, 3) : [];
  const rest = showFeatured ? items.slice(3) : items;
  const counts = { new: null, saved: shelf.saved.length, read: shelf.read.length };

  return (
    <div className="tb fade-in">
      <HubHeader back={{ to: '/web', label: '웹 개발' }} eyebrow="웹 기본기" title="기업 기술블로그"
        desc="국내 IT 기업 기술블로그의 새 글을 매일 아침 모아 최신순으로 보여 드려요. 제목을 누르면 원문이 새 탭에서 열립니다."
        stats={[
          ...(companies.length ? [{ value: companies.length, label: '기업' }] : []),
          ...(total && !company && !q ? [{ value: total.toLocaleString(), label: '모인 글' }] : []),
          { value: shelf.read.length.toLocaleString(), label: '내가 읽은 글' },
        ]} />

      <div className="tb-toolbar">
        <div className="tb-tabs" role="tablist" aria-label="보기">
          {TABS.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''}
              onClick={() => update({ tab: t.key === 'new' ? '' : t.key })}>
              {t.label}{counts[t.key] ? <span className="tb-tab-count">{counts[t.key]}</span> : null}
            </button>
          ))}
        </div>
        <label className="tb-search">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          <span className="sr-only">제목으로 찾기</span>
          <input type="search" value={draft} maxLength={50} placeholder="제목으로 찾기 (예: Kafka, 테스트)" onChange={e => setDraft(e.target.value)} />
        </label>
      </div>

      {tab === 'new' && <>
        {companies.length > 0 && <div className="tb-chips" role="group" aria-label="회사별로 보기">
          <button type="button" className={!company ? 'on' : ''} aria-pressed={!company} onClick={() => update({ company: '' })}>전체</button>
          {companies.map(c => (
            <button key={c} type="button" className={company === c ? 'on' : ''} aria-pressed={company === c} onClick={() => update({ company: c })}
              style={{ '--tb-brand': brandColor(c) }} title={`${c} 글만 보기`}>
              <span className="tb-chip-dot" aria-hidden="true" />{c}
            </button>
          ))}
        </div>}

        {(company || q) && !loading && !error && <p className="tb-status" role="status">
          {company && <b>{company}</b>}{company && q && ' · '}{q && <>“{q}” 검색</>} 결과 {total.toLocaleString()}개
          <button type="button" className="tb-link" onClick={() => { update({ company: '', q: '' }); setDraft(''); }}>모두 보기</button>
        </p>}

        {featured.length > 0 && <section aria-label="가장 새 글">
          <h2 className="tb-group-title">따끈한 새 글</h2>
          <ul className="tb-features">{featured.map(item => <FeaturedCard key={item.url} item={item} now={now} {...rowProps(item)} />)}</ul>
        </section>}

        <GroupedList items={rest} now={now} rowProps={rowProps} />

        {loading && <ul className="tb-list tb-skeleton" aria-hidden="true">{[0, 1, 2, 3].map(i => <li key={i} className="tb-row"><span className="tb-mark" /><div className="tb-row-body"><span /><span /><span /></div></li>)}</ul>}
        {loading && <p className="sr-only" role="status">글을 불러오는 중…</p>}
        {!loading && error && <p className="tb-empty" role="alert">글을 불러오지 못했어요. <button type="button" className="tb-link" onClick={retry}>다시 시도</button></p>}
        {!loading && !error && items.length === 0 && <p className="tb-empty">{q || company ? '찾는 글이 없어요. 다른 말로 찾아보세요.' : '아직 모인 글이 없어요. 매일 아침에 새 글을 모아요.'}</p>}
        {more.error && <p className="tb-empty" role="alert">더 불러오지 못했어요. <button type="button" className="tb-link" onClick={loadMore}>다시 시도</button></p>}
        {!loading && !error && hasMore && !more.error && <div className="tb-more">
          <button type="button" className="ds-btn ds-btn--ghost" disabled={more.loading} onClick={loadMore}>{more.loading ? '불러오는 중…' : '더 보기'}</button>
        </div>}
      </>}

      {tab === 'saved' && (shelf.saved.length
        ? <ul className="tb-list tb-shelf">{shelf.saved.map(item => <ArticleRow key={item.url} item={item} now={now} {...rowProps(item)} />)}</ul>
        : <p className="tb-empty">담아 둔 글이 없어요. 글 오른쪽의 책갈피를 누르면 여기에 모여요.</p>)}

      {tab === 'read' && (shelf.read.length
        ? <>
          <div className="tb-shelf-head">
            <p>최근에 연 글부터 보여 드려요.</p>
            <button type="button" className="tb-link" onClick={clearRead}>읽은 표시 모두 지우기</button>
          </div>
          <ul className="tb-list tb-shelf">{shelf.read.map(item => (
            <ArticleRow key={item.url} item={item} now={now} {...rowProps(item)} read={false} />
          ))}</ul>
        </>
        : <p className="tb-empty">아직 읽은 글이 없어요. 새 글 탭에서 제목을 누르면 여기에 기록돼요.</p>)}

      <p className="tb-note">나중에 읽기와 읽은 글은 이 기기에만 기억해요. 글의 저작권은 각 회사에 있고, 나의쿠키는 제목과 짧은 요약만 보여 드려요. 각 회사와 제휴하거나 보증하는 관계가 아니며, 삭제를 원하시면 <Link to="/feedback">건의 · 제보</Link>로 알려 주세요.</p>
    </div>
  );
}
