import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account, onAccountChange } from '../sync';
import { membershipHeaders } from '../membership';
import { PROFILE_FRAMES, PROFILE_THEMES, SHOP_AVATAR_NAMES, SHOP_AVATAR_RARITY, rarityClass } from '../data/profileOptions';
import '../styles/profile-frames.css';
import './PointShopPage.css';

// 포인트 상점. 출석 · 문제 풀이 · 승급으로 모은 포인트로 프로필 꾸미기 아이템을 산다.
// 지급 기준은 서버 PointService와 같은 값이다. 새 풀이는 하루 100문제까지 인정하고, 넘는 몫(예전 기록 포함)은 다음 날 이어서 들어온다
const REASONS = { ATTEND: '출석', SOLVED: '문제 풀이', TIER_UP: '승급', QUEST: '퀘스트', PURCHASE: '구매' };
const KINDS = [
  { kind: 'avatar', title: '대표 아이콘', note: '프로필 · 채팅 · 순위에 보이는 아이콘' },
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

// 상점 칸을 한 줄로 늘어놓고 좌우 버튼(또는 옆으로 밀기)으로 넘긴다. 줄이 길어져 화면이 아래로 늘어나지 않게 한다
function Shelf({ label, children }) {
  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, children]);
  const move = dir => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.9, behavior: 'smooth' });
  return <div className={`ps-shelf${edge.start ? '' : ' can-prev'}${edge.end ? '' : ' can-next'}`}>
    <ul ref={track} className="ps-grid" onScroll={measure} onPointerMove={tilt} onPointerOut={untilt} aria-label={label}>{children}</ul>
    {!edge.start && <button type="button" className="ps-shelf-btn prev" onClick={() => move(-1)} aria-label={`${label} 이전 칸`}>‹</button>}
    {!edge.end && <button type="button" className="ps-shelf-btn next" onClick={() => move(1)} aria-label={`${label} 다음 칸`}>›</button>}
  </div>;
}

// 마우스를 올린 상점 칸을 커서 쪽으로 살짝 기울이고 빛을 비춘다. 터치 · 펜은 기울이지 않는다(CSS가 움직임 줄이기 설정도 끈다)
const MAX_TILT = 7;
function tilt(event) {
  if (event.pointerType !== 'mouse') return;
  const card = event.target.closest?.('.ps-item');
  if (!card) return;
  const box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width, y = (event.clientY - box.top) / box.height;
  card.style.setProperty('--rx', `${((0.5 - y) * MAX_TILT * 2).toFixed(2)}deg`);
  card.style.setProperty('--ry', `${((x - 0.5) * MAX_TILT * 2).toFixed(2)}deg`);
  card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
  card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
}
function untilt(event) {
  const card = event.target.closest?.('.ps-item');
  if (card && !card.contains(event.relatedTarget)) for (const p of ['--rx', '--ry', '--mx', '--my']) card.style.removeProperty(p);
}


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
      <p>모은 포인트로 프로필을 꾸며 보세요. 포인트 모으는 법은 <Link to="/quests">오늘의 퀘스트</Link>에서 봐요.</p>
    </header>

    {!token ? <div className="ps-card ps-empty">
      <p>포인트는 로그인한 계정에 쌓여요. 지금까지 푼 문제와 승급한 몫도 로그인하면 하루 100문제씩 이어서 받아요.</p>
      <Link to="/account#settings" className="ds-btn ds-btn--primary ds-btn--sm">로그인하기</Link>
    </div> : <>
      <section className="ps-hero" aria-label="내 포인트">
        <span className="ps-coin" aria-hidden="true"><i>P</i></span>
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

    {/* 상점에는 포인트와 아이템만 둔다. 오늘의 퀘스트와 포인트 받는 법은 /quests 화면에서 본다 */}
    {KINDS.map(({ kind, title, note }) => {
      const list = (s?.shop || []).filter(i => i.key.startsWith(`${kind}:`));
      if (!list.length) return null;
      return <section key={kind} className="ps-section">
        <div className="ps-section-head"><h2>{title}</h2><span>{note}</span></div>
        <Shelf label={title}>
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
