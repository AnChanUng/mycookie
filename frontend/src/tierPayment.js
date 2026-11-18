// 등급 구매(토스페이먼츠) 공용 함수. 결제창 SDK는 결제 버튼을 누를 때만 불러온다
import api from './api';
import { account } from './sync';

const SDK = 'https://js.tosspayments.com/v2/standard';
const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'RUBY'];

const auth = () => ({ headers: { Authorization: `Bearer ${account()?.token}` }, timeout: 90000 });

export const tierLevel = (tier, division = 5) => TIER_ORDER.indexOf(tier) * 5 + 5 - division;

export async function tierProducts() {
  const headers = account() ? auth().headers : {};
  const { data } = await api.get('/payments/tier/products', { headers, timeout: 90000 });
  return data;
}

let sdk;
function loadSdk() {
  if (window.TossPayments) return Promise.resolve(window.TossPayments);
  sdk ||= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SDK;
    script.onload = () => window.TossPayments ? resolve(window.TossPayments) : reject(new Error('결제창을 불러오지 못했습니다.'));
    script.onerror = () => { sdk = null; reject(new Error('결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')); };
    document.head.appendChild(script);
  });
  return sdk;
}

/** 주문을 만들고 토스 결제창을 연다. 결제가 끝나면 /payments/success 로 돌아온다. */
export async function buyTier(tier, clientKey) {
  const { data: order } = await api.post('/payments/tier/order', { tier }, auth());
  const TossPayments = await loadSdk();
  const payment = TossPayments(clientKey).payment({ customerKey: order.customerKey });
  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: order.amount },
    orderId: order.orderId,
    orderName: order.orderName,
    successUrl: `${window.location.origin}/payments/success`,
    failUrl: `${window.location.origin}/payments/fail`,
  });
}

export async function confirmTierPayment({ paymentKey, orderId, amount }) {
  const { data } = await api.post('/payments/tier/confirm', { paymentKey, orderId, amount: Number(amount) }, auth());
  return data;
}
