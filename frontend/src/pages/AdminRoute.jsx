import RoleGate from '../components/RoleGate';
import AdminPage from './AdminPage';

// /admin: ADMIN 권한 계정(admin1, admin2)으로 로그인했을 때만 관리자 모니터링을 연다
export default function AdminRoute() {
  return <RoleGate role="ADMIN" title="관리자 모니터링"><AdminPage viaLogin /></RoleGate>;
}
