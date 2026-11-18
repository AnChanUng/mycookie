import { Link } from 'react-router-dom';
import './SiteFooter.css';

const GITHUB = 'https://github.com/AnChanUng/mycookie';

// 사이트 맨 아래 푸터. 필수 안내(패치노트 · 이용약관 · 개인정보 처리방침)만 둔다
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-top">
          <p className="site-footer-tagline">개발자 취업 준비,<br />이제 쿠키 하나로.</p>
          <nav className="site-footer-links" aria-label="사이트 안내">
            <div>
              <h2>소식</h2>
              <ul>
                <li><Link to="/changelog">패치노트</Link></li>
                <li><a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a></li>
              </ul>
            </div>
            <div>
              <h2>서비스 이용 안내</h2>
              <ul>
                <li><Link to="/terms">서비스 이용약관</Link></li>
                <li><Link to="/privacy"><strong>개인정보 처리방침</strong></Link></li>
                <li><a href={`${GITHUB}/issues`} target="_blank" rel="noreferrer">문의 · 오류 제보</a></li>
              </ul>
            </div>
          </nav>
        </div>
        <p className="site-footer-legal">
          나의쿠키는 개인이 운영하는 비영리 학습 서비스입니다. 문제와 해설은 학습용으로 새로 작성한 것이며 실제 시험이나 기업의 공식 자료가 아닙니다.
        </p>
        <p className="site-footer-brand" aria-hidden="true">나의쿠키</p>
        <p className="site-footer-copy">© 2026 나의쿠키 (mycookie.dev). All rights reserved.</p>
      </div>
    </footer>
  );
}
