import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { applySeo } from '../seo';
import SiteFooter from './SiteFooter';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { warmUpBackend } from '../api';
import { track } from '../track';
import ChaosChat from './ChaosChat';
import StudyAmbience from './StudyAmbience';
import StudyCount from './StudyCount';
import RankWelcome from './RankWelcome';
import MemberMenu from './MemberMenu';
import { account, onAccountChange } from '../sync';
import PromotionAnnouncements from './PromotionAnnouncements';

// 카오스 고양이 챗봇은 잠시 숨겨 둔다. true로 바꾸면 다시 나온다
const SHOW_CHAOS_CHAT = false;

// 화면 모드. swatch는 고르는 창에 보여 줄 견본 색(바탕 절반 + 강조색 절반), dark는 어두운 계열 여부
const THEMES = [
  { key: 'warm-gray', name: '웜 그레이', icon: '📖', swatch: 'linear-gradient(135deg, #E8E6E1 50%, #326B65 50%)' },
  { key: 'soft-charcoal', name: '소프트 차콜', icon: '🌘', swatch: 'linear-gradient(135deg, #252827 50%, #9BCAC0 50%)', dark: true },
  { key: 'light', name: '화이트', icon: '☀️', swatch: 'linear-gradient(135deg, #FFFFFF 50%, #6366F1 50%)' },
  { key: 'sepia', name: '크림', icon: '📜', swatch: 'linear-gradient(135deg, #F6EFE0 50%, #B4662A 50%)' },
  { key: 'mint', name: '민트', icon: '🌿', swatch: 'linear-gradient(135deg, #EFF8F4 50%, #0E9F77 50%)' },
  { key: 'dim', name: '딤', icon: '🌆', swatch: 'linear-gradient(135deg, #2C313C 50%, #8188F7 50%)', dark: true },
  { key: 'dark', name: '다크', icon: '🌙', swatch: 'linear-gradient(135deg, #0F1626 50%, #8188F7 50%)', dark: true },
  { key: 'black', name: '블랙', icon: '⚫', swatch: 'linear-gradient(135deg, #000000 50%, #8188F7 50%)', dark: true },
];

// 고른 모드를 문서에 반영한다. 색은 index.css가 이 속성들을 보고 바꾼다
function applyTheme(t) {
  const root = document.documentElement;
  if (t.key === 'light') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', t.key);
  if (t.dark) root.setAttribute('data-mode', 'dark'); else root.removeAttribute('data-mode');
  try { localStorage.setItem('theme', t.key); } catch { /* storage unavailable */ }
}

// 주 메뉴. 하위 화면에 있어도 해당 메뉴가 켜져 보이게 경로 묶음으로 판단한다
const startsWithAny = (p, list) => list.some(x => p === x || p.startsWith(x + '/'));
const NAV = [
  { to: '/cs', label: '컴퓨터공학', match: p => startsWithAny(p, ['/cs', '/notes', '/category', '/question', '/search', '/interview', '/technical-interview']) },
  { to: '/web', label: '웹 개발', match: p => startsWithAny(p, ['/web', '/web-essentials', '/tech-blogs']) },
  { to: '/ai', label: 'AI', match: p => startsWithAny(p, ['/ai']) },
  { to: '/aptitude', label: '인적성', menu: 'aptitude', match: p => startsWithAny(p, ['/aptitude', '/ncs']) },
  { to: '/exam', label: '전공필기', match: p => startsWithAny(p, ['/exam', '/duel', '/topics', '/calc', '/major', '/major-exam', '/ssafy', '/promotion-exam']) },
  { to: '/algo', label: '코테', menu: 'coding', match: p => startsWithAny(p, ['/algo', '/bug-hunt']) },
  { to: '/stats', label: '내 학습', match: p => startsWithAny(p, ['/stats', '/weak', '/account', '/all', '/rank']) },
  { to: '/intro', label: '소개', menu: 'about', match: p => startsWithAny(p, ['/intro', '/feedback', '/changelog']) },
];

// "인적성"을 누르면 펼쳐지는 대기업 인적성 모의고사(링커리어 CBT, 새 탭) + 사이트 안 NCS
const APTITUDE_SITES = [
  { name: 'SKCT', desc: 'SK 종합역량검사 · 링커리어 CBT', href: 'https://cbt.linkareer.com/exam/detail/1231' },
  { name: '삼성 GSAT', desc: '삼성 직무적성검사 · 링커리어 CBT', href: 'https://cbt.linkareer.com/exam/detail/1230' },
  { name: 'LG 인적성', desc: 'LG Way Fit Test · 링커리어 CBT', href: 'https://cbt.linkareer.com/exam/detail/1232' },
  { name: 'NCS 직업기초', desc: '나의쿠키에서 바로 풀기', to: '/ncs' },
];

// "소개"를 누르면 펼쳐지는 사이트 안내
const ABOUT_LINKS = [
  { to: '/intro#story', name: '만든 이야기', desc: '어디까지 공부해야 할지 고민하다 만든 이유' },
  { to: '/intro#team', name: '만든 사람들', desc: 'SSAFY에서 시작해 팀이 되기까지' },
  { to: '/intro', name: '서비스 소개', desc: '나의쿠키로 무엇을 공부할 수 있는지' },
  { to: '/feedback', name: '건의 · 제보', desc: '원하는 기능이나 버그를 바로 알려 주세요' },
  { to: '/changelog', name: '패치노트', desc: '언제 무엇이 바뀌었는지' },
];

// "코테"를 누르면 헤더 아래에 펼쳐지는 코딩테스트 사이트 바로가기(새 탭)
const CODING_SITES = [
  { name: '백준', desc: '단계별 · 알고리즘 분류별 문제', href: 'https://www.acmicpc.net/' },
  { name: '프로그래머스', desc: '기업 코딩테스트 기출 · 연습 문제', href: 'https://school.programmers.co.kr/learn/challenges' },
  { name: '코드트리', desc: '커리큘럼 따라 차근차근', href: 'https://www.codetree.ai/' },
  { name: '리트코드', desc: '해외 기업 인터뷰 문제', href: 'https://leetcode.com/problemset/' },
];

const tokenSnapshot = () => account()?.token || '';

export default function Layout() {
  // 로그인하지 않았을 때만 머리말에 로그인 버튼을 보여 준다
  const signedIn = !!useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const location = useLocation();
  // 화면 모드는 index.html에서 먼저 적용해 두고, 여기서는 바꿀 때만 반영하고 기억한다
  const [theme, setThemeState] = useState(() => (THEMES.some(t => t.key === document.documentElement.dataset.theme) ? document.documentElement.dataset.theme : 'light'));
  const [picking, setPicking] = useState(false);
  // 펼친 메뉴: null | 'coding'(코테) | 'about'(소개). 한 번에 하나만 연다
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  // 다른 곳을 누르거나 Esc를 누르면 펼친 메뉴를 닫는다
  useEffect(() => {
    if (!openMenu) return undefined;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target) && !e.target.closest?.('.ct-toggle')) setOpenMenu(null); };
    const onKey = (e) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [openMenu]);
  const current = THEMES.find(t => t.key === theme);
  const setTheme = (next) => {
    setThemeState(next.key);
    setPicking(false);
    applyTheme(next);
  };

  // 첫 화면이 뜨는 동안 잠들어 있던 서버를 깨워 두면 이후 요청이 바로 온다
  useEffect(() => { warmUpBackend(); }, []);

  useEffect(() => { track('view', location.pathname); applySeo(location.pathname); }, [location.pathname]);

  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <Link to="/" className="logo">
            <span className="logo-dot" />
            <span className="logo-title">나의쿠키</span>
          </Link>
          <div className="header-right">
            <nav className="nav-links" aria-label="주 메뉴">
              {NAV.map(n => n.menu ? (
                <button key={n.to} type="button" className={`ct-toggle${openMenu === n.menu || n.match(location.pathname) ? ' active' : ''}`}
                  aria-expanded={openMenu === n.menu} aria-controls="ct-panel" onClick={() => setOpenMenu(o => (o === n.menu ? null : n.menu))}>
                  {n.label} <span aria-hidden="true" className="ct-caret">▾</span>
                </button>
              ) : (
                <Link key={n.to} to={n.to} className={n.match(location.pathname) ? 'active' : ''}
                  aria-current={n.match(location.pathname) ? 'page' : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
            {!signedIn && <Link to="/account#settings" className="header-login">로그인</Link>}
            {/* 지금 모드의 아이콘을 보여 주고, 누르면 색 견본이 펼쳐진다 */}
            <div className="theme-pick">
              <button type="button" className="theme-toggle" onClick={() => setPicking(!picking)} title="화면 모드 고르기" aria-label="화면 모드 고르기" aria-expanded={picking}>
                {current.icon}
              </button>
              {picking && (
                <div className="theme-menu" role="menu">
                  {THEMES.map(t => (
                    <button key={t.key} type="button" role="menuitem" className={t.key === theme ? 'on' : ''} onClick={() => setTheme(t)}>
                      <i style={{ background: t.swatch }} />{t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <StudyCount />
            <MemberMenu />
          </div>
        </div>
        {openMenu && (
          <div id="ct-panel" className="ct-panel" ref={menuRef}>
            <div className="container ct-inner">
              {openMenu === 'aptitude' ? <>
                <p className="ct-title">대기업 인적성 모의고사</p>
                <div className="ct-grid">
                  {APTITUDE_SITES.map(site => site.to
                    ? <Link key={site.name} to={site.to} className="ct-site" onClick={() => setOpenMenu(null)}>
                      <b>{site.name}</b>
                      <small>{site.desc}</small>
                    </Link>
                    : <a key={site.name} href={site.href} target="_blank" rel="noopener noreferrer" className="ct-site" onClick={() => setOpenMenu(null)}>
                      <b>{site.name} <span aria-hidden="true">↗</span></b>
                      <small>{site.desc}</small>
                      <span className="sr-only">(새 탭에서 열림)</span>
                    </a>)}
                </div>
              </> : openMenu === 'about' ? <>
                <p className="ct-title">나의쿠키 소개</p>
                <div className="ct-grid">
                  {ABOUT_LINKS.map(item => (
                    <Link key={item.name} to={item.to} className="ct-site" onClick={() => setOpenMenu(null)}>
                      <b>{item.name}</b>
                      <small>{item.desc}</small>
                    </Link>
                  ))}
                </div>
              </> : <>
                <p className="ct-title">코딩테스트 연습 사이트</p>
                <div className="ct-grid">
                  {CODING_SITES.map(site => (
                    <a key={site.name} href={site.href} target="_blank" rel="noopener noreferrer" className="ct-site" onClick={() => setOpenMenu(null)}>
                      <b>{site.name} <span aria-hidden="true">↗</span></b>
                      <small>{site.desc}</small>
                      <span className="sr-only">(새 탭에서 열림)</span>
                    </a>
                  ))}
                </div>
              </>}
            </div>
          </div>
        )}
      </header>

      <main className="container">
        <Suspense fallback={<div className="loading"><div className="loading-spinner" />불러오는 중...</div>}>
          <Outlet />
        </Suspense>
      </main>
      <SiteFooter />

      <PromotionAnnouncements />
      {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/private') && <RankWelcome />}
      <StudyAmbience />
      {SHOW_CHAOS_CHAT && <ChaosChat />}
    </>
  );
}
