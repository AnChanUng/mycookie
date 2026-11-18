// 검색 엔진(구글 · 네이버 · 다음)과 링크 미리보기에 쓰는 화면별 제목과 설명.
// 공개 화면만 적는다. 새 공개 화면을 만들면 여기와 public/sitemap.xml에 함께 추가한다
export const SITE_NAME = '나의쿠키';
export const SITE_URL = 'https://mycookie.dev';
export const DEFAULT = {
  title: '나의쿠키 - 컴퓨터공학 전공 공부, 웹개발, 백엔드 공부 사이트',
  description: '컴퓨터공학(컴공) 전공 공부부터 웹개발 공부, 백엔드 공부, CS 기술면접, 코딩테스트까지 무료로 공부하는 개발자 학습 사이트. 운영체제, 네트워크, 데이터베이스, 자료구조, Java, Spring을 문제와 모범답안으로 익히세요.',
  keywords: '컴퓨터공학 공부, 컴공 전공 공부, 전공 공부 사이트, 웹개발 공부, 백엔드 공부, 백엔드 개발자, CS 공부, 기술면접, 개발자 면접 질문, 운영체제, 네트워크, 데이터베이스, 자료구조, 알고리즘, Java, Spring, 코딩테스트, 전공필기, 개발자 취업',
};
export const PAGES = [
  ['/intro', '서비스 소개: 컴퓨터공학 · 웹개발 · 백엔드 공부 사이트', '나의쿠키는 개발자 취업 준비생을 위한 무료 학습 플랫폼입니다. 오늘의 CS, 전공노트, 실시간 대결, 실전 문제집을 소개합니다.'],
  ['/cs', '컴퓨터공학 전공 공부 · CS 기술면접', '컴공 전공 공부를 매일 조금씩. 오늘의 CS 5문제와 운영체제, 네트워크, 데이터베이스, 자료구조 기술면접 질문으로 CS를 공부하세요.'],
  ['/notes', '전공노트: 컴퓨터공학 · 백엔드 면접 정리', '운영체제, 네트워크, 데이터베이스, 자료구조, Java, Spring, JPA, 디자인 패턴까지 컴퓨터공학과 백엔드 공부 핵심 개념을 면접 답변으로 정리한 전공노트.'],
  ['/web-essentials', '웹개발 · 백엔드 공부: 웹 필수지식 57문답', 'HTTP, REST, 쿠키와 세션, JWT, 트랜잭션, 인덱스, Spring까지 백엔드 개발자 면접에 나오는 웹 필수지식 57문답과 모범답안.'],
  ['/interview', '면접 공통질문 연습', '자기소개부터 마지막 한마디까지, 카메라로 실전처럼 연습하는 개발자 면접 공통질문.'],
  ['/exam', '기업별 전공필기', '기업별 전공필기 유형의 컴퓨터공학 객관식 문제를 실전처럼 풀고 해설을 확인하세요.'],
  ['/topics', '주제별 통합 문제집', '운영체제, 네트워크, 데이터베이스 등 과목별로 모아 푸는 컴퓨터공학 통합 문제집.'],
  ['/aptitude', 'NCS · 인적성', 'IT 기업 인적성과 NCS 언어, 수리, 추리 유형 연습 문제.'],
  ['/calc', '계산 문제 무한 연습', '서브넷, 페이지 교체, 진법 변환 같은 전공 계산 문제를 무한히 연습하세요.'],
  ['/bug-hunt', '버그 찾기', '코드를 읽고 버그의 원인을 찾는 개발자 실전 연습.'],
  ['/duel', '실시간 CS 대결', '같은 10문제로 겨루는 1:1 대결과 단체전. 친구와 함께 CS를 공부하세요.'],
  ['/algo', '알고리즘', '코딩테스트 대비 알고리즘 유형과 풀이를 정리했습니다.'],
  ['/ncs', 'NCS', 'NCS 직업기초능력 유형 연습.'],
  ['/major', '전공 시험', '기업별 전공 시험 대비 문제.'],
  ['/web', 'IT 기업 필기', 'IT 기업별 필기 대비 문제.'],
  ['/tech-blogs', '기업 기술 블로그', '국내 IT 기업 기술 블로그 모음.'],
  ['/ssafy', 'SSAFY', 'SSAFY 입과 대비 문제.'],
  ['/changelog', '패치노트', '나의쿠키의 새 기능과 변경 사항.'],
  ['/terms', '서비스 이용약관', '나의쿠키 서비스 이용약관.'],
  ['/privacy', '개인정보 처리방침', '나의쿠키 개인정보 처리방침.'],
];
// 검색에 나오지 않아야 하는 화면(계정, 개인 페이지, 메일 링크 등)
// 비밀번호로 보호하는 개인 페이지와 1회용 메일 링크만 막는다(주소가 노출되면 안 되는 곳)
const PRIVATE = /^\/(auth|newsletter|private|p|admin|chanung)(\/|$)/;

export function seoFor(pathname) {
  if (pathname === '/') return { ...DEFAULT, index: true };
  const hit = PAGES.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return {
    title: hit ? `${hit[1]} | ${SITE_NAME}` : DEFAULT.title,
    description: hit ? hit[2] : DEFAULT.description,
    index: !PRIVATE.test(pathname),
  };
}

function setMeta(selector, attr, key, value) {
  let el = document.head.querySelector(selector);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
}

// 화면을 옮길 때마다 제목, 설명, 정규 주소, 공유 미리보기를 바꾼다(검색 로봇은 자바스크립트를 실행한 뒤 읽는다)
export function applySeo(pathname) {
  if (typeof document === 'undefined') return;
  const { title, description, index } = seoFor(pathname);
  document.title = title;
  setMeta('meta[name="description"]', 'name', 'description', description);
  setMeta('meta[name="keywords"]', 'name', 'keywords', DEFAULT.keywords);
  setMeta('meta[property="og:title"]', 'property', 'og:title', title);
  setMeta('meta[property="og:description"]', 'property', 'og:description', description);
  setMeta('meta[property="og:url"]', 'property', 'og:url', SITE_URL + pathname);
  setMeta('meta[name="robots"]', 'name', 'robots', index ? 'index, follow' : 'noindex, nofollow');
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
  canonical.href = SITE_URL + pathname;
}
