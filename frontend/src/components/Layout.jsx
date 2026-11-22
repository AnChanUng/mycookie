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
import HeaderSubscribe from './HeaderSubscribe';
import { account, onAccountChange } from '../sync';
import PromotionAnnouncements from './PromotionAnnouncements';

// 카오스 고양이 챗봇은 잠시 숨겨 둔다. true로 바꾸면 다시 나온다
const SHOW_CHAOS_CHAT = false;

// 문제 푸는 화면: 문제집(/web/spring 등, 목록인 /exam/category/... 제외), 문제 한 개, 오답 다시 풀기, 대결, 승급 시험 등
const SOLVING_PATHS = [
  /^\/(web|ai|major|exam|ssafy|aptitude)\/(?!category\/)[^/]+/,
  /^\/(question|private\/banks)\/[^/]+/,
  /^\/(account\/retry|topics|calc|promotion-exam|bug-hunt|duel|ncs|weak|major-exam)(\/|$)/,
];

// 주 메뉴. 하위 화면에 있어도 해당 메뉴가 켜져 보이게 경로 묶음으로 판단한다
const startsWithAny = (p, list) => list.some(x => p === x || p.startsWith(x + '/'));
const NAV = [
  { to: '/study-coach', label: 'AI 학습 코치', match: p => startsWithAny(p, ['/study-coach']) },
  { to: '/ai', label: 'AI', match: p => startsWithAny(p, ['/ai']) },
  { to: '/web', label: '웹 개발', match: p => startsWithAny(p, ['/web', '/web-essentials', '/tech-blogs']) },
  { to: '/cs', label: '컴퓨터공학', match: p => startsWithAny(p, ['/cs', '/notes', '/category', '/question', '/search', '/interview', '/technical-interview']) },
  { to: '/exam', label: '전공필기', match: p => startsWithAny(p, ['/exam', '/duel', '/topics', '/calc', '/major', '/major-exam', '/ssafy', '/promotion-exam']) },
  { to: '/aptitude', label: '인적성', menu: 'aptitude', match: p => startsWithAny(p, ['/aptitude', '/ncs']) },
  { to: '/certifications', label: '자격증', match: p => startsWithAny(p, ['/certifications']) },
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
  { to: '/intro', name: '서비스 소개' },
  { to: '/feedback', name: '건의 · 제보' },
  { to: '/changelog', name: '패치노트' },
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
  const loginOnly = !signedIn && location.pathname === "/account";
  // 문제를 푸는 화면에서는 아래 큰 푸터를 띄우지 않는다(문제집 목록 화면에는 그대로 둔다)
  const solving = SOLVING_PATHS.some(re => re.test(location.pathname));
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
            <HeaderSubscribe />
            {!signedIn && <Link to="/account#settings" className="header-login">로그인</Link>}
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
      {!loginOnly && !solving && <SiteFooter />}

      {!loginOnly && <PromotionAnnouncements />}
      {!loginOnly && !location.pathname.startsWith('/admin') && !location.pathname.startsWith('/private') && <RankWelcome />}
      {!loginOnly && <StudyAmbience />}
      {SHOW_CHAOS_CHAT && <ChaosChat />}
    </>
  );
}
