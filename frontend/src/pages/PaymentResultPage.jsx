import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import TierBadge from '../components/TierBadge';
import { refreshMembership } from '../membership';
import { confirmTierPayment } from '../tierPayment';
import './TierShopPage.css';

// 토스 결제창에서 돌아오는 화면. 성공이면 서버에 최종 승인을 요청하고, 실패면 이유를 보여 준다
export default function PaymentResultPage({ ok }) {
  const [params] = useSearchParams();
  const paymentKey = params.get('paymentKey'), orderId = params.get('orderId'), amount = params.get('amount');
  const valid = ok && paymentKey && orderId && amount;
  const [state, setState] = useState(valid ? { status: 'confirming' }
    : { status: 'failed', message: ok ? '결제 정보가 올바르지 않아요.' : params.get('message') || '결제가 취소되었거나 실패했어요.' });
  const sent = useRef(false);

  useEffect(() => {
    if (!valid || sent.current) return;
    sent.current = true; // 개발 모드에서 두 번 실행돼도 승인은 한 번만 요청한다
    confirmTierPayment({ paymentKey, orderId, amount })
      .then(data => { refreshMembership(); setState({ status: 'done', data }); })
      .catch(error => setState({ status: 'failed', message: error?.response?.data?.error || '결제를 승인하지 못했어요. 잠시 후 다시 시도해 주세요.' }));
  }, [valid, paymentKey, orderId, amount]);

  return <div className="ts fade-in">
    <div className="ts-result">
      {state.status === 'confirming' && <><b>결제를 확인하고 있어요…</b><p>창을 닫지 말고 잠시만 기다려 주세요.</p></>}
      {state.status === 'done' && <>
        <TierBadge tier={state.data.membership.tier} division={state.data.membership.division} />
        <b>{state.data.tierName} 등급이 적용됐어요!</b>
        <p>지금 내 등급은 {state.data.membership.tierName}이에요.</p>
        <div className="ts-result-actions"><Link to="/" className="ts-buy">홈으로</Link><Link to="/account" className="ts-link">내 계정 보기</Link></div>
      </>}
      {state.status === 'failed' && <>
        <b>결제가 완료되지 않았어요</b>
        <p>{state.message}</p>
        <p className="ts-sub">돈이 빠져나갔는데 등급이 바뀌지 않았다면 <Link to="/feedback">건의 · 제보</Link>로 알려 주세요.</p>
        <div className="ts-result-actions"><Link to="/tiers" className="ts-buy">다시 시도하기</Link></div>
      </>}
    </div>
  </div>;
}
