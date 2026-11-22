import api from './api';

// 학습 메일 구독을 받을 수 있는지(메일 서버 준비 여부). 상단 버튼과 아래 구독 칸이 같이 쓰므로 한 번만 묻는다
let pending = null;

export function loadNewsletterEnabled() {
  if (!pending) {
    pending = api.get('/newsletter/status')
      .then(({ data }) => !!data?.enabled)
      .catch(() => { pending = null; return false; });
  }
  return pending;
}

export async function subscribeNewsletter(email) {
  await api.post('/newsletter/subscribe', { email: email.trim() }, { timeout: 90000 });
}
