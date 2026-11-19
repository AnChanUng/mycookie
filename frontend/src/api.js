import axios from 'axios';

const BACKEND = 'https://cs-study-backend-i0ln.onrender.com/api/v1';
// 스테이징 백엔드(dev 브랜치). Render에서 정해진 주소는 Vercel 미리보기 환경변수 VITE_STAGING_API_URL로 넣는다
const STAGING = import.meta.env.VITE_STAGING_API_URL || 'https://cs-study-backend-staging-zq0t.onrender.com/api/v1';

export const DEPLOY_ENV = import.meta.env.VITE_DEPLOY_ENV || 'local';

// 운영 빌드는 항상 운영 주소를 쓴다(배포판에 옛 VITE_API_URL이 남아 있어도 영향받지 않게).
// Vercel 미리보기는 스테이징 백엔드를 써서 운영 DB에 기록이 남지 않게 한다.
// VITE_API_URL은 로컬 개발에서만 백엔드를 바꿔 끼우는 용도다
function baseURL() {
  if (import.meta.env.DEV && import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // 온프레미스(그램 서버): 화면과 API를 같은 주소에서 내보내므로 상대 경로(/api/v1)를 쓴다
  if (import.meta.env.VITE_API_BASE) return import.meta.env.VITE_API_BASE;
  if (DEPLOY_ENV === 'preview') return STAGING;
  return BACKEND;
}

const api = axios.create({
  baseURL: baseURL(),
  timeout: 5000,
});

// 버그 제보에 붙이려고 이 기기에서 최근 실패한 요청을 몇 개만 기억한다(메모리에만, 새로고침하면 사라짐).
// 개인정보가 섞이지 않게 쿼리와 본문은 버리고, 경로에서 영문 소문자와 - 가 아닌 조각(번호, 닉네임 등)은 :id로 바꾼다
const FAILURES = [];
const FAILURE_LIMIT = 5;
const FAILURE_WINDOW_MS = 30 * 60 * 1000;
export function safePath(url = '') {
  return String(url).split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '')
    .split('/').map(part => !part || /^[a-z][a-z-]*$/.test(part) ? part : ':id').join('/') || '/';
}
export function recordFailure(config, status, now = Date.now()) {
  const path = safePath(config?.url);
  if (path === '/track' || path === '/feedback') return;
  FAILURES.push({ method: String(config?.method || 'get').toUpperCase(), path, status: status || '응답 없음', at: now });
  while (FAILURES.length > FAILURE_LIMIT) FAILURES.shift();
}
export function recentFailures(now = Date.now()) {
  return FAILURES.filter(f => now - f.at <= FAILURE_WINDOW_MS);
}
api.interceptors.response.use(undefined, error => {
  if (!axios.isCancel(error)) recordFailure(error?.config, error?.response?.status);
  return Promise.reject(error);
});

// 잠들어 있는 Render 무료 서버를 미리 깨운다. 결과는 쓰지 않는다.
export function warmUpBackend() {
  api.get('/categories', { timeout: 180000 }).catch(() => {});
}

export default api;
