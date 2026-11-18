import { DEPLOY_ENV } from '../api';

// 스테이징(Vercel 미리보기)에서만 보이는 표시. 운영 사이트와 헷갈리지 않게 한다
export default function StagingBadge() {
  if (DEPLOY_ENV !== 'preview') return null;
  return (
    <div role="status" aria-label="스테이징 환경"
      style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 1000, padding: '6px 12px', borderRadius: 999,
        background: '#f59e0b', color: '#1f1300', fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
      스테이징 · 운영 데이터 아님
    </div>
  );
}
