import { Navigate, useParams } from 'react-router-dom';
import { privatePath } from '../privatePath';

// 예전 관리자 주소(/private/chanung, /private/chanung/admin …)로 들어오면
// 메뉴 이름이 드러나지 않는 주소로 바꿔서 연다(주소창 기록도 바꿔치기)
export default function PrivateRedirect() {
  const { id } = useParams();
  return <Navigate to={privatePath(id)} replace />;
}
