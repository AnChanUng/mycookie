// 리뉴얼 기간 동안 운영 사이트를 안내 화면(Renewal.jsx)으로 바꾼다.
// 운영 배포(Vercel production · Render)에서만 켜고, 그중에서도 새 주소(mycookie.dev · www · dev)로 들어오면 전체 화면을 보여 준다.
//   예전 주소(cs-study-platform.vercel.app 등) → 안내 화면
//   mycookie.dev                            → 새 사이트 전체(운영자 확인용, 주소는 공개하지 않음)
// 스테이징(Vercel 미리보기)과 로컬은 항상 전체 화면. 리뉴얼이 끝나면 false로 바꾼다.
const NEW_HOST = /(^|\.)mycookie\.dev$/;
const host = typeof window === 'undefined' ? '' : window.location.hostname;

export const MAINTENANCE = import.meta.env.VITE_DEPLOY_ENV === 'production' && !NEW_HOST.test(host);
