import { Suspense } from 'react';
import SplashReady from './components/SplashReady';
import { Link, Outlet } from 'react-router-dom';
import SiteFooter from './components/SiteFooter';

// 안내 기간에도 열어 두는 화면(/private/chanung)의 바깥 틀. 다른 메뉴로 가는 링크를 두지 않는다
// footer를 주면 공개 안내 페이지(패치노트 · 약관)처럼 사이트 푸터를 함께 보여 준다
export function RenewalShell({ footer = false }) {
  return (
    <>
      <main className="container" style={{ paddingTop: 24, paddingBottom: 48 }}>
        <Suspense fallback={<div className="loading"><div className="loading-spinner" />불러오는 중...</div>}>
          <Outlet />
          <SplashReady />
        </Suspense>
      </main>
      {footer && <SiteFooter />}
    </>
  );
}

// 검은 화면 가운데에 편지 형식으로 띄우는 공지. 사이트 배경과 상관없이 화면 전체를 덮는다
const NOTICE = {
  position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 10,
  background: '#000', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '48px 16px', textAlign: 'center',
};
const TITLE = { fontSize: 'clamp(30px, 7vw, 60px)', fontWeight: 300, lineHeight: 1.2, margin: '0 0 30px', color: '#fff', wordBreak: 'keep-all' };
const NAV = { color: 'rgba(255,255,255,0.7)', textDecoration: 'underline', textUnderlineOffset: 3 };
const PARA = { fontSize: 'clamp(16px, 2.4vw, 21px)', lineHeight: 1.6, margin: '0 0 14px', color: '#fff', wordBreak: 'keep-all' };

export function RenewalNotice() {
  return (
    <main style={NOTICE}>
      <div style={{ maxWidth: 960, width: '100%' }}>
        <h1 style={TITLE}>[공지] 사이트 리뉴얼 안내</h1>
        <p style={PARA}>안녕하세요.</p>
        <p style={PARA}>
          전산학 전공필기 준비 사이트입니다.<br />그동안 사이트를 이용해 주신 모든 분께 감사드립니다.
        </p>
        <p style={PARA}>
          전산학 전공필기 사이트는 개발자 취업 준비 사이트 <strong>나의쿠키</strong>로 새롭게 리뉴얼할 예정입니다.<br />
          전공필기를 넘어 개발자 취업 준비 전반을 도울 수 있도록 준비하고 있습니다.
        </p>
        <p style={PARA}>
          리뉴얼 기간에는 사이트 이용이 잠시 중단됩니다.<br />
          예상 오픈 시기는 <strong>11월 말</strong>이며, 일정이 확정되는 대로 이 페이지를 통해 안내드리겠습니다.
        </p>
        <p style={PARA}>
          이용에 불편을 드려 죄송합니다.<br />더 나은 모습으로 찾아뵙겠습니다.
        </p>
        <p style={{ ...PARA, marginTop: 28 }}>
          2026년 11월 18일<br />나의쿠키 운영진
        </p>
        <nav aria-label="안내" style={{ marginTop: 40, display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap', fontSize: 14 }}>
          <Link to="/changelog" style={NAV}>패치노트</Link>
          <Link to="/terms" style={NAV}>서비스 이용약관</Link>
          <Link to="/privacy" style={NAV}>개인정보 처리방침</Link>
        </nav>
      </div>
    </main>
  );
}
