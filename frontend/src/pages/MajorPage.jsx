import { Link } from 'react-router-dom';

export default function MajorPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>필기이론</h1>
        <p>자료 공개 범위를 확인하는 동안 요약노트 제공을 일시 중단합니다.</p>
      </div>

      <section className="notes-empty" role="status" aria-label="요약노트 제공 안내">
        <h2>요약노트 제공 일시 중단</h2>
        <p>현재 PDF 열람과 다운로드를 제공하지 않습니다. 이용 가능한 자료는 확인 후 다시 안내하겠습니다.</p>
      </section>

    </div>
  );
}
