# 검색 노출 (구글, 네이버, 다음)

## 사이트에 들어 있는 것
- `frontend/index.html`: 기본 제목, 설명, 공유 미리보기(Open Graph), 구조화 데이터(WebSite)
- `frontend/src/seo.js`: 화면을 옮길 때마다 제목, 설명, 정규 주소(canonical), robots를 바꾼다. 공개 화면 목록도 여기 있다
- `frontend/public/robots.txt`, `frontend/public/sitemap.xml`, `frontend/public/og-image.png`
- `frontend/scripts/prerender-seo.mjs`: `npm run build` 마지막에 공개 화면마다 `dist/<경로>.html`을 만든다.
  제목, 설명과 함께 본문 글(웹 필수지식 전체 문답, 전공노트 전체)을 미리 넣어 자바스크립트를 실행하지 않는 검색 로봇도 읽게 한다.
  사람이 열면 React가 같은 자리를 다시 그린다
- `frontend/vercel.json`: `cleanUrls`로 `/notes` 요청에 `notes.html`을 준다. `mycookie.dev`가 아닌 주소와 개인 페이지, 메일 링크에는 `X-Robots-Tag: noindex`
- 검색어 목표: 컴퓨터공학(컴공) 전공 공부, 웹개발 공부, 백엔드 공부, CS 기술면접. 제목, 설명, 메인 소개 문장에 넣어 두었다

새 공개 화면을 만들면 `seo.js`의 PAGES와 `sitemap.xml`에 같이 추가한다.

## 검색 엔진 등록 (운영자가 한 번 하는 일)
1. 구글 서치 콘솔: 속성 추가(URL 접두어 `https://mycookie.dev`) → HTML 태그 방식의 값을 `index.html`의 `google-site-verification`에 넣고 배포 → 확인 → Sitemaps에 `sitemap.xml` 제출
2. 네이버 서치어드바이저: 사이트 등록 → HTML 태그 값을 `naver-site-verification`에 넣고 배포 → 확인 → 요청 메뉴에서 사이트맵 제출, robots.txt 수집 요청
3. 다음 검색등록(웹마스터도구): 사이트 등록 후 안내하는 인증 줄을 `robots.txt` 맨 위에 넣고 배포
4. (선택) Bing 웹마스터 도구: 구글 서치 콘솔에서 가져오기

반영까지 보통 며칠에서 몇 주 걸린다.

## 온프레미스로 옮길 때
Vercel 대신 nginx 등으로 프론트를 서빙하면 `vercel.json`의 헤더(보안 헤더, X-Robots-Tag)를 같은 내용으로 옮긴다.
robots.txt, sitemap.xml, og-image.png와 검색용 HTML은 빌드 결과(`dist`)에 그대로 들어 있다.
nginx 예: `location / { try_files $uri $uri.html /index.html; }` (`/notes` → `notes.html`, 나머지는 앱)
