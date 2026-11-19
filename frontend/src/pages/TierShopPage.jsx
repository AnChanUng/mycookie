import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import TierBadge from '../components/TierBadge';
import { account, onAccountChange } from '../sync';
import { createTierOrder, isWidgetKey, mountWidgets, openPaymentWindow, tierLevel, tierProducts } from '../tierPayment';
import './TierShopPage.css';

// 등급 구매. 풀이 수로 오르는 기준은 그대로이고, 산 등급 아래로는 내려가지 않는다
const PERKS = {
  SILVER: '은 쿠키 배지와 은 쿠키 전용 기능',
  GOLD: '금 쿠키 배지와 금 쿠키 전용 기능',
  DIAMOND: '다이아 쿠키 배지와 다이아 전용 기능',
  RUBY: '최고 등급 루비 쿠키 배지와 모든 등급 기능',
};
const snapshot = () => account()?.token || '';

export default function TierShopPage() {
  const token = useSyncExternalStore(onAccountChange, snapshot, () => '');
  const [data, setData] = useState({ loading: true, error: '', enabled: false, products: [], membership: null, clientKey: '' });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    tierProducts()
      .then(d => { if (alive) setData({ loading: false, error: '', ...d }); })
      .catch(() => { if (alive) setData(v => ({ ...v, loading: false, error: '등급 정보를 불러오지 못했습니다. 새로고침해 주세요.' })); });
    return () => { alive = false; };
  }, [token]);

  const m = data.membership;
  const current = m ? tierLevel(m.tier, m.division) : -1;

  // 결제위젯 키일 때 화면에 펼치는 결제 칸. 주문이 생기면 위젯을 그린다
  const [checkout, setCheckout] = useState(null);
  const handle = useRef(null);
  useEffect(() => {
    if (!checkout?.order) return;
    let alive = true;
    handle.current = null;
    mountWidgets(checkout.order, data.clientKey, '#ts-methods', '#ts-agreement')
      .then(h => { if (alive) { handle.current = h; setCheckout(c => c && { ...c, ready: true }); } })
      .catch(error => { if (alive) { setCheckout(null); setMessage(error?.message || '결제 화면을 불러오지 못했습니다.'); } });
    return () => { alive = false; };
  }, [checkout?.order, data.clientKey]);

  const fail = error => {
    // 결제창을 닫으면 토스가 USER_CANCEL 오류를 낸다. 그때는 조용히 넘어간다
    if (error?.code !== 'USER_CANCEL') setMessage(error?.response?.data?.error || error?.message || '결제를 시작하지 못했습니다.');
  };

  async function buy(product) {
    setBusy(product.tier); setMessage('');
    try {
      const order = await createTierOrder(product.tier);
      if (isWidgetKey(data.clientKey)) setCheckout({ order, product, ready: false });
      else await openPaymentWindow(order, data.clientKey);
    } catch (error) { fail(error); }
    finally { setBusy(''); }
  }

  async function pay() {
    setBusy('pay'); setMessage('');
    try { await handle.current?.pay(); } catch (error) { fail(error); } finally { setBusy(''); }
  }

  return <div className="ts fade-in">
    <header className="page-header">
      <Link to="/account" className="back-link">← 내 계정</Link>
      <h1>등급 올리기</h1>
      <p>문제를 풀어 오르는 등급 기준은 그대로예요. 구매한 등급은 그 아래로 내려가지 않는 최소 등급이 되고, 순위는 지금처럼 푼 문제 수로 정해져요.</p>
    </header>

    {m && <div className="ts-now"><TierBadge tier={m.tier} division={m.division} /><span>지금 내 등급 <b>{m.tierName}</b> · 누적 {m.solvedCount.toLocaleString()}문제</span></div>}
    {!token && <p className="ts-banner">등급은 계정에 저장돼요. <Link to="/account#settings">로그인</Link>한 뒤 구매할 수 있어요.</p>}
    {!data.loading && !data.error && !data.enabled && <p className="ts-banner">결제를 준비하고 있어요. 곧 열릴 예정이에요.</p>}
    {data.error && <p className="ts-banner" role="alert">{data.error}</p>}

    <div className="ts-grid">
      {data.products.map(p => {
        const owned = current >= tierLevel(p.tier);
        return <div key={p.tier} className={`ts-card${owned ? ' owned' : ''}`}>
          <TierBadge tier={p.tier} />
          <b className="ts-name">{p.name}</b>
          <p className="ts-perk">{PERKS[p.tier]}</p>
          <span className="ts-price">{p.price.toLocaleString()}원</span>
          <button type="button" className="ts-buy" disabled={owned || !token || !data.enabled || !!busy || !!checkout} onClick={() => buy(p)}>
            {owned ? '보유 중' : busy === p.tier ? '결제 준비 중…' : checkout?.product.tier === p.tier ? '아래에서 결제' : '구매하기'}
          </button>
        </div>;
      })}
      {data.loading && <p role="status">등급 정보를 불러오는 중…</p>}
    </div>
    {message && <p className="ts-banner" role="alert">{message}</p>}

    {checkout && <section className="ts-checkout" aria-label="결제">
      <div className="ts-checkout-head">
        <TierBadge tier={checkout.product.tier} />
        <b>{checkout.order.orderName}</b>
        <span className="ts-price">{checkout.order.amount.toLocaleString()}원</span>
      </div>
      <div id="ts-methods" />
      <div id="ts-agreement" />
      {!checkout.ready && <p className="ts-banner" role="status">결제 수단을 불러오는 중…</p>}
      <div className="ts-checkout-actions">
        <button type="button" className="ts-link" disabled={busy === 'pay'} onClick={() => setCheckout(null)}>취소</button>
        <button type="button" className="ts-buy" disabled={!checkout.ready || busy === 'pay'} onClick={pay}>
          {busy === 'pay' ? '결제 진행 중…' : `${checkout.order.amount.toLocaleString()}원 결제하기`}
        </button>
      </div>
    </section>}

    <ul className="ts-notes">
      <li>한 번 결제하면 기간 제한 없이 유지돼요. 문제를 더 풀어 더 높은 등급에 오르면 그 등급이 보여요.</li>
      <li>결제 즉시 등급이 적용되는 디지털 상품이라, 적용된 뒤에는 청약철회(환불)가 제한될 수 있어요. 결제 오류는 <Link to="/feedback">건의 · 제보</Link>로 알려 주세요.</li>
      <li>결제는 토스페이먼츠가 처리하며, 나의쿠키는 카드 번호를 저장하지 않아요.</li>
    </ul>
  </div>;
}
