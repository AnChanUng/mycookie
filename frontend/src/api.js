import axios from 'axios';

const BACKEND = 'https://cs-study-backend-i0ln.onrender.com/api/v1';
// 스테이징 백엔드(dev 브랜치). Render에서 정해진 주소는 Vercel 미리보기 환경변수 VITE_STAGING_API_URL로 넣는다
const STAGING = import.meta.env.VITE_STAGING_API_URL || 'https://cs-study-backend-staging.onrender.com/api/v1';

export const DEPLOY_ENV = import.meta.env.VITE_DEPLOY_ENV || 'local';

// 운영 빌드는 항상 운영 주소를 쓴다(배포판에 옛 VITE_API_URL이 남아 있어도 영향받지 않게).
// Vercel 미리보기는 스테이징 백엔드를 써서 운영 DB에 기록이 남지 않게 한다.
// VITE_API_URL은 로컬 개발에서만 백엔드를 바꿔 끼우는 용도다
function baseURL() {
  if (import.meta.env.DEV && import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (DEPLOY_ENV === 'preview') return STAGING;
  return BACKEND;
}

const api = axios.create({
  baseURL: baseURL(),
  timeout: 5000,
});

// 잠들어 있는 Render 무료 서버를 미리 깨운다. 결과는 쓰지 않는다.
export function warmUpBackend() {
  api.get('/categories', { timeout: 180000 }).catch(() => {});
}

export default api;
