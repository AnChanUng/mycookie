import { Link, useLocation } from 'react-router-dom';
import useRoles from '../useRoles';

// 권한이 있는 계정에게만 children을 보여 준다(ADMIN: 관리자, OWNER: 찬웅 전용, TEAM: 신입 온보딩).
// 화면만 가리는 것이고, 서버 API도 같은 권한으로 막는다
export default function RoleGate({ role, title, children }) {
  const { signedIn, loading, roles, error } = useRoles();
  const { pathname } = useLocation();
  if (signedIn && !loading && roles.includes(role)) return children;
  return <div className="fade-in role-gate">
    <div className="page-header">
      <Link to="/" className="back-link">← 홈으로</Link>
      <h1>{title}</h1>
      {!signedIn && <><p>권한이 있는 계정으로 로그인해야 볼 수 있어요.</p><Link to="/account" state={{ from: pathname }} className="exam-btn primary">로그인하러 가기</Link></>}
      {signedIn && loading && <p role="status">권한을 확인하는 중…</p>}
      {signedIn && !loading && error && <p role="alert">권한을 확인하지 못했어요. 잠시 후 새로고침해 주세요.</p>}
      {signedIn && !loading && !error && <p role="alert">이 계정에는 볼 권한이 없어요.</p>}
    </div>
  </div>;
}
