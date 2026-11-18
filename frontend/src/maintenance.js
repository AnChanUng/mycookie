// 리뉴얼 기간 동안 운영 사이트 전체를 안내 화면(Renewal.jsx)으로 바꾼다.
// 운영 배포(Vercel production · Render)에서만 켜지고, 스테이징(Vercel 미리보기)과 로컬에서는 꺼져 전체 화면으로 확인한다.
// 리뉴얼이 끝나면 false로 바꾸면 운영 사이트도 원래 화면으로 돌아온다.
export const MAINTENANCE = import.meta.env.VITE_DEPLOY_ENV === 'production';
