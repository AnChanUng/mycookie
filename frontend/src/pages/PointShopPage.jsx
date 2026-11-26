import { Children, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account, onAccountChange } from '../sync';
import { membershipHeaders } from '../membership';
import { PROFILE_FRAMES, PROFILE_THEMES, SHOP_AVATAR_NAMES, SHOP_AVATAR_RARITY, rarityClass } from '../data/profileOptions';
import '../styles/profile-frames.css';
import './PointShopPage.css';

// 포인트 상점. 출석 · 문제 풀이 · 승급으로 모은 포인트로 프로필 꾸미기 아이템을 산다.
// 지급 기준은 서버 PointService와 같은 값이다. 새 풀이는 하루 100문제까지 인정하고, 넘는 몫(예전 기록 포함)은 다음 날 이어서 들어온다
const RULES = [
  { icon: '📅', title: '출석', text: '접속하면 하루 10P 자동', sub: '7일 연속마다 50P 더' },
  { icon: '✏️', title: '문제 풀이', text: '새로 푼 문제 1개당 1P', sub: '같은 문제는 한 번만 · 하루 100문제까지' },
  { icon: '🏅', title: '승급', text: '단계마다 20 · 50 · 100 · 150 · 300P', sub: '새 등급에 오르면 200~1,500P 더' },
];
const REASONS = { ATTEND: '출석', SOLVED: '문제 풀이', TIER_UP: '승급', QUEST: '퀘스트', PURCHASE: '구매' };
const KINDS = [
  { kind: 'avatar', title: '대표 아이콘', note: '프로필 · 채팅 · 순위에 보이는 아이콘', rows: 3 },
  { kind: 'theme', title: '카드 테마', note: '프로필 카드의 강조 색' },
  { kind: 'frame', title: '아이콘 테두리', note: '아이콘을 감싸는 움직이는 고리' },
];
const snapshot = () => account()?.token || '';

function describe(key) {
  const [kind, value] = key.split(':');
  if (kind === 'avatar') return { kind, value, label: SHOP_AVATAR_NAMES[value] ? `${SHOP_AVATAR_NAMES[value]} 아이콘` : `아이콘 ${value}`, rarity: SHOP_AVATAR_RARITY[value] };
  if (kind === 'theme') { const t = PROFILE_THEMES.find(o => o.key === value); return { kind, value, label: `${t?.label || value} 테마`, color: t?.color, gradient: t?.gradient, rarity: t?.rarity }; }
  const f = PROFILE_FRAMES.find(o => o.key === value);
  return { kind, value, label: f?.label || value, rarity: f?.rarity };
}

// 상점 칸을 좌우 버튼(또는 옆으로 밀기)으로 넘긴다. 줄이 길어져 화면이 아래로 늘어나지 않게 한다.
// rows가 있으면 한 쪽에 그 줄 수만큼 채우고, 넘치는 칸은 오른쪽 다음 쪽으로 보낸다. 한 줄 칸 수는 화면 폭을 따른다(CSS와 같은 기준)
const perRow = () => (window.innerWidth > 1100 ? 7 : window.innerWidth > 720 ? 5 : 3);
function Shelf({ label, rows, children }) {
  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const [cols, setCols] = useState(perRow);
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    setCols(perRow());
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, children]);
  const move = dir => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.9, behavior: 'smooth' });
  return <div className={`ps-shelf${edge.start ? '' : ' can-prev'}${edge.end ? '' : ' can-next'}`}>
    {rows ? <ul ref={track} className="ps-grid ps-pages" onScroll={measure} aria-label={label}>
      {pagesOf(Children.toArray(children), rows * cols).map((page, i) => <li key={i} className="ps-page"><ul className="ps-page-grid" aria-label={`${i + 1}쪽`}>{page}</ul></li>)}
    </ul>
      : <ul ref={track} className="ps-grid" onScroll={measure} aria-label={label}>{children}</ul>}
    {!edge.start && <button type="button" className="ps-shelf-btn prev" onClick={() => move(-1)} aria-label={`${label} 이전 칸`}>‹</button>}
    {!edge.end && <button type="button" className="ps-shelf-btn next" onClick={() => move(1)} aria-label={`${label} 다음 칸`}>›</button>}
  </div>;
}

const pagesOf = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

export default function PointShopPage() {
  const token = useSyncExternalStore(onAccountChange, snapshot, () => '');
  const [data, setData] = useState({ loading: true, error: '', summary: null });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!token) { setData({ loading: false, error: '', summary: null }); return undefined; }
    const controller = new AbortController();
    setData(d => ({ ...d, loading: true, error: '' }));
    // 출석은 접속하면 자동으로 받는다(AutoAttend). 여기서도 먼저 불러 두면 잔액과 출석 표시가 바로 맞는다. 하루 한 번만 들어간다
    api.post('/points/attend', null, { headers: membershipHeaders(), signal: controller.signal, timeout: 30000 }).catch(() => null)
      .then(() => api.get('/points', { headers: membershipHeaders(), signal: controller.signal, timeout: 30000 }))
      .then(({ data: summary }) => setData({ loading: false, error: '', summary }))
      .catch(() => { if (!controller.signal.aborted) setData({ loading: false, error: '포인트를 불러오지 못했어요. 새로고침해 주세요.', summary: null }); });
    return () => controller.abort();
  }, [token]);

  const buy = async (item) => {
    const { label } = describe(item.key);
    if (!window.confirm(`${label}을(를) ${item.price.toLocaleString()}P에 살까요?`)) return;
    setBusy(item.key); setMessage(null);
    try {
      const { data: summary } = await api.post('/points/shop', { item: item.key }, { headers: membershipHeaders(), timeout: 15000 });
      setData({ loading: false, error: '', summary });
      setMessage({ ok: true, text: `${label}을(를) 샀어요. 내 계정의 "프로필 꾸미기"에서 바로 쓸 수 있어요.` });
    } catch (error) {
      setMessage({ ok: false, text: error?.response?.data?.error || '사지 못했어요. 잠시 후 다시 시도해 주세요.' });
    } finally { setBusy(''); }
  };

  const s = data.summary;
  const owned = s?.owned || [];

  return <div className="ps fade-in">
    <header className="page-header">
      <h1>포인트 상점</h1>
      <p>출석하고 문제를 풀고 승급하면 포인트가 쌓여요. 모은 포인트로 프로필을 꾸며 보세요.</p>
    </header>

    {!token ? <div className="ps-card ps-empty">
      <p>포인트는 로그인한 계정에 쌓여요. 지금까지 푼 문제와 승급한 몫도 로그인하면 하루 100문제씩 이어서 받아요.</p>
      <Link to="/account#settings" className="ds-btn ds-btn--primary ds-btn--sm">로그인하기</Link>
    </div> : <>
      <section className="ps-hero" aria-label="내 포인트">
        <div className="ps-balance">
          <span>내 포인트</span>
          <strong>{s ? s.balance.toLocaleString() : data.loading ? '…' : '–'}<small>P</small></strong>
        </div>
        <div className="ps-attend">
          <span>{s?.streak ? `${s.streak}일 연속 출석 중` : '출석은 접속하면 자동이에요'}</span>
          <b className={s?.attendedToday ? 'on' : ''}>{!s ? '…' : s.attendedToday ? '✓ 오늘 출석 완료' : '오늘 출석을 확인하는 중'}</b>
        </div>
      </section>
      {s?.pendingSolved > 0 && <p className="ps-message" role="status">하루에 {s.dailySolvedCap.toLocaleString()}문제까지 포인트로 쌓여요. 남은 {s.pendingSolved.toLocaleString()}문제 몫은 내일부터 이어서 들어와요.</p>}
      {data.error && <p className="ps-message bad" role="alert">{data.error}</p>}
      {message && <p className={`ps-message${message.ok ? '' : ' bad'}`} role={message.ok ? 'status' : 'alert'}>{message.text}</p>}
    </>}

    {s?.quests?.length > 0 && <section className="ps-quests" aria-label="오늘의 퀘스트">
      <div className="ps-section-head"><h2>오늘의 퀘스트</h2><span>오늘 새로 푼 문제 {s.todaySolved.toLocaleString()}개 · 다 채우면 자동으로 받아요</span></div>
      <ul>
        {s.quests.map(q => {
          const percent = Math.min(100, Math.round(s.todaySolved / q.count * 100));
          return <li key={q.count} className={q.done ? 'done' : ''}>
            <div><b>{q.count}문제 풀기</b><span>{q.done ? '✓ 받음' : `+${q.point}P`}</span></div>
            <span className="ps-quest-bar" role="progressbar" aria-valuemin={0} aria-valuemax={q.count} aria-valuenow={Math.min(q.count, s.todaySolved)} aria-label={`${q.count}문제 퀘스트 진행`}><i style={{ width: `${percent}%` }} /></span>
            <small>{Math.min(q.count, s.todaySolved)} / {q.count}</small>
          </li>;
        })}
      </ul>
      <Link to="/exam" className="ps-quest-go">문제 풀러 가기 →</Link>
    </section>}

    <section className="ps-rules" aria-label="포인트 받는 법">
      {RULES.map(r => <div key={r.title}><span className="ps-rule-icon" aria-hidden="true">{r.icon}</span><b>{r.title}</b><p>{r.text}</p><small>{r.sub}</small></div>)}
    </section>

    {KINDS.map(({ kind, title, note, rows }) => {
      const list = (s?.shop || []).filter(i => i.key.startsWith(`${kind}:`));
      if (!list.length) return null;
      return <section key={kind} className="ps-section">
        <div className="ps-section-head"><h2>{title}</h2><span>{note}</span></div>
        <Shelf label={title} rows={rows}>
          {list.map(item => {
            const d = describe(item.key);
            const has = owned.includes(item.key);
            const short = s.balance < item.price;
            return <li key={item.key} className={`ps-item${has ? ' owned' : ''}${d.rarity ? ` ${rarityClass(d.rarity)}` : ''}`}>
              {d.rarity && <span className="ps-rarity">{d.rarity}</span>}
              <div className="ps-preview" style={d.color ? { '--swatch': d.color, ...(d.gradient && { '--swatch-bg': d.gradient }) } : undefined} aria-hidden="true">
                {kind === 'avatar' && <span className={`ps-emoji${d.rarity ? ` avatar-${rarityClass(d.rarity)}` : ''}`}>{d.value}</span>}
                {kind === 'theme' && <span className="ps-swatch" />}
                {kind === 'frame' && <span className={`pf-avatar frame-${d.value}`} style={{ '--pf-size': '44px' }}>🍪</span>}
              </div>
              <b>{d.label}</b>
              <span className="ps-price">{item.price.toLocaleString()}P</span>
              <button type="button" className={`ds-btn ds-btn--sm ${has ? 'ds-btn--ghost' : 'ds-btn--secondary'}`} disabled={has || short || !!busy} onClick={() => buy(item)}>
                {has ? '보유 중' : busy === item.key ? '사는 중…' : short ? `${(item.price - s.balance).toLocaleString()}P 부족` : '사기'}
              </button>
            </li>;
          })}
        </Shelf>
      </section>;
    })}

    {s && <section className="ps-section">
      <div className="ps-section-head"><h2>포인트 내역</h2><span>최근 30건</span></div>
      {s.history.length ? <ul className="ps-history">
        {s.history.map((h, i) => <li key={`${h.at}-${i}`}>
          <span className="ps-history-reason">{REASONS[h.reason] || h.reason}</span>
          <span className="ps-history-memo">{h.memo}</span>
          <time dateTime={h.at}>{new Date(h.at).toLocaleDateString('ko-KR')}</time>
          <b className={h.amount < 0 ? 'minus' : ''}>{h.amount > 0 ? '+' : ''}{h.amount.toLocaleString()}P</b>
        </li>)}
      </ul> : <p className="ps-none">아직 포인트 내역이 없어요.</p>}
    </section>}
  </div>;
}
