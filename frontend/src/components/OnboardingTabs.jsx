import { NavLink } from 'react-router-dom';

// 신입 개발자 페이지 위쪽 탭: 온보딩 | 개발 일지
export default function OnboardingTabs() {
  return <nav className="ob-tabs" aria-label="신입 개발자 페이지">
    <NavLink to="/x/f9aa1502c8" end>온보딩</NavLink>
    <NavLink to="/x/f9aa1502c8/log">개발 일지</NavLink>
  </nav>;
}
