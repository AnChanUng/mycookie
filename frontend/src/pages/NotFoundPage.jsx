import { Link } from 'react-router-dom';
import './NotFoundPage.css';

// 없는 주소로 들어왔을 때. 예전에는 경로가 없어 빈 화면만 보였다
export default function NotFoundPage() {
  return <div className="nf fade-in">
    <header className="page-header">
      <h1>페이지를 찾을 수 없어요</h1>
      <p>주소가 바뀌었거나 없어진 페이지예요. 주소를 다시 확인하거나 아래에서 이동해 주세요.</p>
    </header>
    <div className="nf-actions">
      <Link to="/" className="ds-btn ds-btn--primary">첫 화면으로</Link>
      <Link to="/search" className="ds-btn">문제 검색</Link>
    </div>
  </div>;
}
