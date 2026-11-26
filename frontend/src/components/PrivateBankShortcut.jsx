import { Link, useLocation } from 'react-router-dom';
import useRoles, { canOpenPrivateBanks } from '../useRoles';
import { PRIVATE_BANKS_PATH, privateBanksPath } from '../privatePath';
import './PrivateBankShortcut.css';

// 오른쪽 아래 바로가기: 비공개 문제집을 받은 지정 계정에게만 보인다(소유자는 메뉴로 들어간다).
// 볼 수 있는지는 서버가 /auth/me 의 privateBank 로 정하고, 실제 데이터도 서버가 권한으로 막는다
export default function PrivateBankShortcut() {
  const access = useRoles();
  const { pathname } = useLocation();
  if (!access.signedIn || access.loading || !canOpenPrivateBanks(access)) return null;
  if (access.roles.includes('OWNER')) return null;
  if (pathname.startsWith(PRIVATE_BANKS_PATH)) return null;
  return (
    <Link to={privateBanksPath()} className="bank-shortcut" aria-label="전공필기 문제집으로 이동" title="전공필기 문제집">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
        <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
        <path d="M9 8h7M9 12h5" />
      </svg>
    </Link>
  );
}
