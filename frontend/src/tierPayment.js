// 등급 구매(토스페이먼츠) 공용 함수. 결제창 SDK는 결제 버튼을 누를 때만 불러온다.
// 토스 키는 두 종류다: 결제위젯 키(test_gck_ · live_gck_)면 화면 안에 결제 수단 · 약관을 그리고,
// API 개별 연동 키(test_ck_ · live_ck_)면 토스 결제창을 바로 연다
import api from './api';
import { account } from './sync';

const SDK = 'https://js.tosspayments.com/v2/standard';
const TIER_ORDER = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'RUBY'];

const auth = () => ({ headers: { Authorization: `Bearer ${account()?.token}` }, timeout: 90000 });
const urls = () => ({ successUrl: `${window.location.origin}/payments/success`, failUrl: `${window.location.origin}/payments/fail` });

export const tierLevel = (tier, division = 5) => TIER_ORDER.indexOf(tier) * 5 + 5 - division;
export const isWidgetKey = (clientKey) => /_gck_/.test(clientKey || '');

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

export async function createTierOrder(tier) {
  const { data } = await api.post('/payments/tier/order', { tier }, auth());
  return data;
}

/** API 개별 연동 키: 토스 결제창을 바로 연다. */
export async function openPaymentWindow(order, clientKey) {
  const TossPayments = await loadSdk();
  const payment = TossPayments(clientKey).payment({ customerKey: order.customerKey });
  await payment.requestPayment({
    method: 'CARD',
    amount: { currency: 'KRW', value: order.amount },
    orderId: order.orderId,
    orderName: order.orderName,
    ...urls(),
  });
}

/** 결제위젯 키: 화면의 두 칸(결제 수단 · 약관)에 위젯을 그리고, pay()로 결제를 요청한다. */
export async function mountWidgets(order, clientKey, methodSelector, agreementSelector) {
  const TossPayments = await loadSdk();
  const widgets = TossPayments(clientKey).widgets({ customerKey: order.customerKey });
  await widgets.setAmount({ currency: 'KRW', value: order.amount });
  await Promise.all([
    widgets.renderPaymentMethods({ selector: methodSelector, variantKey: 'DEFAULT' }),
    widgets.renderAgreement({ selector: agreementSelector, variantKey: 'AGREEMENT' }),
  ]);
  return {
    pay: () => widgets.requestPayment({ orderId: order.orderId, orderName: order.orderName, ...urls() }),
  };
}

export async function confirmTierPayment({ paymentKey, orderId, amount }) {
  const { data } = await api.post('/payments/tier/confirm', { paymentKey, orderId, amount: Number(amount) }, auth());
  return data;
}
