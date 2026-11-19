import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import './OnboardingPage.css';

// 신규 개발자 안내 페이지. 들어오는 주소는 /private/bomin, 화면에서는 알아보기 어려운 주소(ONBOARDING_PATH)로 바꿔 보여 준다.
// 주소를 숨기는 것일 뿐 보안 장치는 아니다. 비밀번호, 키, 연결 주소 같은 비밀값은 이 페이지에 적지 않는다.
export const ONBOARDING_PATH = '/x/f9aa1502c8';
const REPO = 'https://github.com/AnChanUng/mycookie';
const doc = path => `${REPO}/blob/master/${path}`;

export default function OnboardingPage() {
  return (
    <div className="ob">
      <header className="ob-hero">
        <p className="ob-eyebrow">신규 개발자 안내</p>
        <h1>나의쿠키에 오신 걸 환영합니다</h1>
        <p className="ob-lead">
          이 페이지 하나로 나의쿠키가 무엇이고, 어떻게 생겼고, 어디서부터 손대면 되는지 알 수 있게 정리했습니다.
          위에서부터 순서대로 읽고, 마지막의 첫 주 체크리스트를 따라가 보세요.
        </p>
        <nav className="ob-toc" aria-label="목차">
          {[['about', '한눈에 보기'], ['arch', '아키텍처'], ['flow', '요청 흐름'], ['stack', '기술 스택'], ['repo', '저장소 구조'],
            ['local', '로컬 실행'], ['env', '환경과 브랜치'], ['github', 'GitHub 작업 순서'], ['release', '버전과 릴리스'], ['ai', 'AI와 함께 일하기'],
            ['rules', '작업 규칙'], ['blog', '기술 블로그'], ['first', '첫 주 체크리스트'], ['faq', '자주 막히는 곳']]
            .map(([id, label], i) => <a key={id} href={`#${id}`}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a>)}
        </nav>
      </header>

      <Section id="about" no="01" title="나의쿠키 한눈에 보기">
        <p>
          나의쿠키(<a href="https://mycookie.dev">mycookie.dev</a>)는 개발자 취업 준비생을 위한 학습 사이트입니다.
          컴퓨터공학 전공 지식, 기술면접, 기업별 전공필기, 코딩테스트, 실시간 CS 대결을 한곳에서 공부할 수 있습니다.
        </p>
        <div className="ob-cards">
          <Card title="공부하기" body="전공노트, 웹 필수지식, 오늘의 CS 5문제, 기술면접 질문과 모범답안" />
          <Card title="실전 연습" body="기업별 전공필기 문제집, 주제별 통합 문제집, NCS와 인적성, 계산 문제" />
          <Card title="함께하기" body="같은 문제로 겨루는 1:1 대결과 단체전, 실시간 채팅, 순위" />
          <Card title="기록과 성장" body="오답노트, 북마크, 계정 간 기록 동기화, 풀이 수에 따른 등급과 승급 시험" />
        </div>
        <Note>
          화면, 백엔드, DB가 모두 <b>집에 있는 노트북 한 대(홈서버)</b>에서 돌아갑니다. 예전에는 Vercel, Render, Neon을 썼고
          2026년 11월에 홈서버로 옮겼습니다. 과정은 <a href={doc('docs/homeserver.md')}>docs/homeserver.md</a>에 있습니다.
        </Note>
      </Section>

      <Section id="arch" no="02" title="아키텍처">
        <p>바깥에서 들어오는 요청은 Cloudflare 터널로만 들어옵니다. 홈서버는 공유기 포트를 하나도 열지 않습니다.</p>
        <figure className="ob-figure">
          <div className="ob-diagram-wrap"><ArchDiagram /></div>
          <figcaption>그림 1. 전체 구조. 점선 상자 안은 모두 Docker Compose 컨테이너입니다. deploy.sh는 GitHub에서 코드를 받아 오고, backup.sh는 백업을 암호화해서 구글 드라이브에 올립니다</figcaption>
        </figure>
        <table className="ob-table">
          <thead><tr><th>구성 요소</th><th>하는 일</th></tr></thead>
          <tbody>
            <tr><td>Cloudflare</td><td>DNS, HTTPS 인증서, 공격 방어. 터널 입구 역할을 합니다</td></tr>
            <tr><td>cloudflared</td><td>홈서버가 먼저 Cloudflare로 연결을 걸어 두는 터널 프로그램</td></tr>
            <tr><td>nginx (화면 서버)</td><td>React 빌드 파일을 내보내고, <code>/api/</code> 요청은 같은 주소 그대로 백엔드에 넘깁니다(CORS 불필요)</td></tr>
            <tr><td>Spring Boot (백엔드)</td><td>로그인, 채점, 대결, 학습 기록, 채팅(SSE), 메일 발송</td></tr>
            <tr><td>PostgreSQL 18</td><td>운영 DB <code>cookie_prod</code>와 스테이징 DB <code>cookie_staging</code>. 계정도 따로입니다</td></tr>
            <tr><td>백업</td><td>매일 새벽 4시 덤프, 그램 안 14일 + 구글 드라이브(암호화) 30일</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="flow" no="03" title="요청이 흘러가는 순서">
        <ol className="ob-steps">
          <li><b>화면 받기:</b> 브라우저가 <code>https://mycookie.dev</code>를 열면 Cloudflare가 받아 터널로 홈서버의 nginx에 넘깁니다. nginx가 <code>index.html</code>과 JS, CSS를 돌려줍니다.</li>
          <li><b>API 부르기:</b> 화면은 같은 주소의 <code>/api/v1/...</code>로 요청합니다(<code>frontend/src/api.js</code>). nginx가 이걸 백엔드 컨테이너로 넘깁니다.</li>
          <li><b>처리와 저장:</b> 백엔드가 로그인 토큰을 확인하고, JPA로 PostgreSQL을 읽고 씁니다.</li>
          <li><b>실시간:</b> 채팅과 승급 알림은 SSE(서버가 계속 보내는 연결)로 받습니다. nginx는 이 연결을 끊지 않게 버퍼링을 꺼 두었습니다.</li>
        </ol>
        <Note>
          백엔드는 요청 제한을 <b>접속한 사람의 IP</b>로 겁니다. 그래서 nginx는 <code>X-Forwarded-For</code>를 덧붙이지 않고 그대로 넘깁니다.
          이 설정을 바꾸면 모든 방문자가 같은 사람으로 보여 함께 막힐 수 있습니다.
        </Note>
      </Section>

      <Section id="stack" no="04" title="기술 스택">
        <table className="ob-table">
          <thead><tr><th>영역</th><th>사용 기술</th></tr></thead>
          <tbody>
            <tr><td>화면</td><td>React 19, React Router 7, Vite, axios. 디자인 공통 값은 <code>styles/ds.css</code></td></tr>
            <tr><td>백엔드</td><td>Java 17, Spring Boot 3.5, Spring Data JPA, Spring Mail, Spring AI 1.1(RAG, 선택)</td></tr>
            <tr><td>DB</td><td>PostgreSQL 18 (테스트는 H2, 동시성 테스트는 Testcontainers)</td></tr>
            <tr><td>인프라</td><td>Docker Compose, nginx, Cloudflare Tunnel, systemd 타이머(배포, 백업), WSL2 Ubuntu 24.04</td></tr>
            <tr><td>외부 연동</td><td>소셜 로그인(네이버 등), 토스페이먼츠(테스트 키), GitHub 이슈(건의, 제보), SMTP 메일</td></tr>
            <tr><td>테스트</td><td>JUnit 5, MockMvc, ESLint, 데이터 검사 스크립트(<code>npm run check:*</code>)</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="repo" no="05" title="저장소 구조">
        <pre className="ob-code">{`mycookie/
├─ frontend/          React 화면
│  ├─ src/pages/      화면 하나당 파일 하나 (Main.jsx가 첫 화면)
│  ├─ src/components/ 여러 화면이 같이 쓰는 부품 (헤더, 푸터, 아이콘)
│  ├─ src/data/       문제, 전공노트, 웹 필수지식 같은 학습 데이터
│  ├─ src/styles/     디자인 시스템(ds.css), 웹 스타일 덮어쓰기(inner.css)
│  ├─ scripts/        데이터 검사, 검색용 HTML 생성 같은 빌드 스크립트
│  └─ nginx/          홈서버 화면 서버 설정
├─ backend/           Spring Boot API
│  └─ src/main/java/com/csstudy/backend/
│     ├─ controller/  API 주소 (/api/v1/...)
│     ├─ service/     실제 로직
│     ├─ entity/      DB 표
│     └─ security/    요청 제한, 보안 기록
├─ deploy/homeserver/ 홈서버 docker-compose, 배포, 백업, 복원 스크립트
├─ docs/              설계, 운영 문서
└─ CLAUDE.md          작업 규칙 (꼭 읽기)`}</pre>
      </Section>

      <Section id="local" no="06" title="로컬에서 실행하기">
        <p>Node.js 24와 <b>JDK 17~21</b>이 필요합니다. Gradle 8.7은 JDK 25 이상에서 실행되지 않습니다.</p>
        <h3>1. DB 띄우기 (Docker)</h3>
        <pre className="ob-code">{`docker run -d --name cookie-db -p 5432:5432 \\
  -e POSTGRES_PASSWORD=local -e POSTGRES_DB=cs_study postgres:18-alpine`}</pre>
        <h3>2. 백엔드</h3>
        <pre className="ob-code">{`cd backend
JDBC_DATABASE_URL=jdbc:postgresql://localhost:5432/cs_study \\
SPRING_DATASOURCE_PASSWORD=local ./gradlew bootRun`}</pre>
        <p>표는 서버가 켜질 때 JPA가 만듭니다(<code>ddl-auto: update</code>). 빈 DB여도 됩니다.</p>
        <h3>3. 화면</h3>
        <pre className="ob-code">{`cd frontend
npm ci
VITE_API_URL=http://localhost:8080/api/v1 npm run dev`}</pre>
        <h3>4. 검사</h3>
        <pre className="ob-code">{`cd backend && ./gradlew test
cd frontend && npm run lint && npm run build`}</pre>
      </Section>

      <Section id="env" no="07" title="환경과 브랜치">
        <p>나의쿠키는 같은 코드를 세 곳에서 돌립니다. 어느 브랜치가 어디로 가는지만 기억하면 됩니다.</p>
        <table className="ob-table">
          <thead><tr><th>환경</th><th>브랜치</th><th>주소</th><th>DB</th><th>용도</th></tr></thead>
          <tbody>
            <tr><td>로컬</td><td>내 작업 브랜치</td><td><code>localhost:5173</code></td><td>내 PC의 PostgreSQL</td><td>개발하면서 바로 확인</td></tr>
            <tr><td>스테이징(개발 서버)</td><td><code>dev</code></td><td><a href="https://staging.mycookie.dev">staging.mycookie.dev</a></td><td><code>cookie_staging</code></td><td>합친 기능을 실제와 같은 환경에서 시험</td></tr>
            <tr><td>운영(실제 서비스)</td><td><code>master</code></td><td><a href="https://mycookie.dev">mycookie.dev</a></td><td><code>cookie_prod</code></td><td>사용자가 쓰는 진짜 사이트</td></tr>
          </tbody>
        </table>
        <Note>
          다른 저장소의 <code>main</code> 브랜치가 우리 저장소에서는 <b><code>master</code></b>입니다. 이름만 다르고 역할(운영에 나가는 기준 브랜치)은 같습니다.
          <code>master</code>에 직접 커밋하지 않고, 항상 PR로 합칩니다.
        </Note>
        <h3>브랜치 이름</h3>
        <table className="ob-table">
          <thead><tr><th>이름</th><th>언제</th></tr></thead>
          <tbody>
            <tr><td><code>feature/기능-이름</code></td><td>새 기능, 개선 (예: <code>feature/naver-login</code>)</td></tr>
            <tr><td><code>fix/고칠-것</code></td><td>버그 수정 (예: <code>fix/spa-fallback</code>)</td></tr>
            <tr><td><code>codex/...</code>, <code>claude/...</code></td><td>AI 에이전트가 만든 작업 브랜치. 사람 브랜치와 똑같이 PR로 리뷰합니다</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="github" no="08" title="GitHub으로 일하는 순서">
        <ol className="ob-steps">
          <li><b>이슈 등록:</b> 할 일을 GitHub 이슈로 먼저 적습니다. <b>New issue</b>에서 양식(기능과 개선, 버그와 문제)을 고르면 제목 머리말과 라벨이 붙습니다.</li>
          <li><b>브랜치 만들기:</b> 최신 <code>dev</code>에서 <code>feature/...</code>나 <code>fix/...</code> 브랜치를 만듭니다.</li>
          <li><b>커밋:</b> 한 커밋에 한 가지 일만 담고, 메시지는 한글로 "무엇을 왜"를 첫 줄에 씁니다.</li>
          <li><b>PR 올리기:</b> <code>dev</code>로 PR을 엽니다. 양식(관련 이슈, 무엇을, 왜, 확인한 것)을 채우고 <code>closes #이슈번호</code>를 적으면 머지할 때 이슈가 자동으로 닫힙니다.</li>
          <li><b>리뷰와 머지:</b> 리뷰를 받고 고칠 것을 반영한 뒤 머지합니다. 5분 안에 스테이징에 자동 배포됩니다.</li>
          <li><b>운영 배포:</b> 스테이징에서 확인이 끝나면 <code>dev</code> → <code>master</code> PR을 열어 머지합니다. 5분 안에 운영에 반영됩니다.</li>
          <li><b>기록:</b> 사용자가 체감하는 변화면 패치노트를 쓰고, 버전 태그와 릴리스를 붙입니다(다음 항목).</li>
        </ol>
        <h3>용어 정리</h3>
        <table className="ob-table">
          <thead><tr><th>용어</th><th>뜻</th><th>나의쿠키에서는</th></tr></thead>
          <tbody>
            <tr><td>이슈(Issue)</td><td>할 일, 버그, 아이디어를 적는 게시글</td><td>제목 머리말 <code>[기능]</code> <code>[개선]</code> <code>[버그]</code> <code>[인프라]</code>, 같은 이름의 라벨</td></tr>
            <tr><td>브랜치(Branch)</td><td>본 코드에서 갈라져 나온 작업 공간</td><td><code>dev</code>에서 따서 작업</td></tr>
            <tr><td>커밋(Commit)</td><td>코드 변경을 저장한 한 단위</td><td>한글 메시지, 한 커밋 한 가지</td></tr>
            <tr><td>PR(Pull Request)</td><td>"내 브랜치를 합쳐 주세요" 요청. 리뷰와 토론이 여기서 일어남</td><td>양식 채우기, <code>closes #번호</code></td></tr>
            <tr><td>머지(Merge)</td><td>PR을 받아들여 브랜치를 합치는 것</td><td><code>dev</code> 머지 → 스테이징, <code>master</code> 머지 → 운영</td></tr>
            <tr><td>태그(Tag)</td><td>특정 커밋에 붙이는 이름표(버전 번호)</td><td><code>v0.21.0</code>처럼 <code>v</code>로 시작</td></tr>
            <tr><td>릴리스(Release)</td><td>태그에 설명(바뀐 점)을 붙여 공개한 기록</td><td>패치노트 내용을 그대로 옮김</td></tr>
          </tbody>
        </table>
        <h3>급하게 운영을 고쳐야 할 때(핫픽스)</h3>
        <p><code>master</code>에서 <code>fix/...</code> 브랜치를 따서 고치고 <code>master</code>로 PR을 올립니다. 머지한 뒤에는 <code>master</code>를 <code>dev</code>에도 합쳐서 두 브랜치가 어긋나지 않게 합니다.</p>
      </Section>

      <Section id="release" no="09" title="버전, 태그, 릴리스">
        <p>버전은 <b>패치노트의 버전 번호</b>(<code>frontend/src/data/patchNotes.js</code>)를 기준으로 하고, 같은 번호로 태그와 릴리스를 만듭니다.</p>
        <table className="ob-table">
          <thead><tr><th>바뀐 것</th><th>번호 올리는 법</th><th>예</th></tr></thead>
          <tbody>
            <tr><td>새 기능이나 눈에 띄는 개선을 묶어 배포</td><td>가운데 숫자 +1, 끝은 0</td><td><code>0.23.0</code> → <code>0.24.0</code></td></tr>
            <tr><td>버그 수정, 작은 고침만</td><td>끝 숫자 +1</td><td><code>0.24.0</code> → <code>0.24.1</code></td></tr>
            <tr><td>정식 1.0 같은 큰 전환</td><td>앞 숫자 +1</td><td><code>0.x</code> → <code>1.0.0</code></td></tr>
          </tbody>
        </table>
        <h3>릴리스 만드는 법</h3>
        <ol className="ob-steps">
          <li>패치노트 맨 위에 새 버전을 추가하고 <code>master</code>까지 배포합니다.</li>
          <li>배포된 <code>master</code> 커밋에 태그를 붙입니다.
            <pre className="ob-code">{`git checkout master && git pull
git tag -a v0.24.0 -m "v0.24.0: 바뀐 점 한 줄"
git push origin v0.24.0`}</pre>
          </li>
          <li>GitHub 저장소 → <b>Releases</b> → <b>Draft a new release</b> → 방금 태그 선택 → 제목은 버전, 본문은 패치노트 내용 → <b>Publish</b>.</li>
        </ol>
        <Note>
          지금 상태: 태그와 릴리스는 <code>v0.9.0</code>부터 <code>v0.21.0</code>까지 있습니다. 패치노트의 <code>0.22.0</code>, <code>0.23.0</code>은 아직 태그가 없으니,
          다음 릴리스 때 함께 정리합니다. 오래된 <code>v1.0</code>, <code>v2.0.260921</code>은 예전 프로젝트 시절 태그라 지금 번호 체계와 상관없습니다.
        </Note>
      </Section>

      <Section id="ai" no="10" title="AI와 함께 일하기">
        <p>나의쿠키는 AI 코딩 도구(Claude Code, Codex)를 적극적으로 씁니다. 사람과 AI가 같은 규칙으로 일하도록 정해 둔 것들입니다.</p>
        <ul className="ob-list">
          <li><b>규칙은 <code>CLAUDE.md</code>에:</b> AI는 작업 전에 이 파일을 읽습니다. 지켜야 할 규칙이 생기면 여기에 적습니다.</li>
          <li><b>AI 작업도 PR로:</b> AI가 만든 브랜치(<code>claude/...</code>, <code>codex/...</code>)도 사람이 리뷰한 뒤 머지합니다. 테스트 결과와 확인한 화면을 PR에 남기게 합니다.</li>
          <li><b>커밋 꼬리말:</b> AI가 만든 커밋에는 <code>Co-Authored-By</code> 줄이 붙습니다. 누가 만든 코드인지 기록으로 남깁니다.</li>
          <li><b>비밀값은 AI에게도 주지 않기:</b> 토큰, 비밀번호, DB 주소는 대화창에 붙이지 않습니다. 서버의 <code>.env</code>에 직접 넣고, AI에게는 "넣었다"는 사실만 알려 줍니다.</li>
          <li><b>결과는 직접 확인:</b> AI가 "됐다"고 해도 테스트, 빌드, 실제 화면으로 다시 확인합니다.</li>
        </ul>
        <p>AI 워크플로우를 실제로 어떻게 쓰는지는 아래 기술 블로그에 글로 정리해 나갑니다.</p>
      </Section>

      <Section id="rules" no="11" title="작업 규칙">
        <ul className="ob-list">
          <li><b>온프레미스 전제:</b> 특정 클라우드 전용 서비스에 묶이지 않습니다. PostgreSQL, SMTP처럼 직접 띄울 수 있는 것만 씁니다.</li>
          <li><b>메모리 8GB 예산:</b> 홈서버 한 대에서 모두 돌아야 합니다. 새 컨테이너를 넣을 때는 <code>mem_limit</code> 합계를 확인합니다.</li>
          <li><b>상태는 DB에:</b> 재시작하면 사라지면 안 되는 정보는 PostgreSQL에 둡니다.</li>
          <li><b>설정은 환경 변수로:</b> 새 설정은 <code>deploy/homeserver/.env.example</code>과 <code>docker-compose.yml</code>에 같이 적습니다.</li>
          <li><b>보안 헤더:</b> <code>frontend/vercel.json</code>을 고치면 <code>node frontend/scripts/export-nginx-headers.mjs</code>로 nginx 헤더도 다시 만듭니다.</li>
          <li><b>화면:</b> 새 화면은 <code>styles/ds.css</code>의 부품과 토큰을 씁니다. 그림자 대신 얇은 테두리, 이모지 대신 선 아이콘(<code>LineIcon</code>)입니다.</li>
          <li><b>비밀값:</b> 비밀번호, 토큰, DB 주소는 메신저나 이슈, 커밋에 붙이지 않습니다. 확인이 필요하면 값 대신 길이나 앞 몇 글자만 봅니다.</li>
        </ul>
      </Section>

      <Section id="blog" no="12" title="기술 블로그">
        <p>나의쿠키를 만들면서 겪은 일(홈서버 구축, AI 워크플로우 등)을 기술 블로그에 정리합니다. 새 글을 올리면 이 목록에 자동으로 나타납니다.</p>
        <BlogPosts />
      </Section>

      <Section id="first" no="13" title="첫 주 체크리스트">
        <ul className="ob-check">
          <li>GitHub 저장소 접근 권한 받기 (비공개 저장소)</li>
          <li><a href={doc('CLAUDE.md')}>CLAUDE.md</a>와 <a href={doc('README.md')}>README.md</a> 읽기</li>
          <li>로컬에서 백엔드, 화면 띄우고 회원가입부터 문제 풀이까지 해 보기</li>
          <li><a href="https://staging.mycookie.dev">스테이징</a>과 <a href="https://mycookie.dev">운영</a> 사이트 둘러보기</li>
          <li><a href={doc('docs/homeserver.md')}>docs/homeserver.md</a>로 서버 구조 익히기</li>
          <li>작은 이슈 하나 골라서 기능 브랜치 → <code>dev</code> PR 올려 보기</li>
        </ul>
        <h3>더 읽을 문서</h3>
        <div className="ob-links">
          {[['docs/homeserver.md', '홈서버 구축, 배포, 백업과 복구'], ['docs/design-system.md', '디자인 시스템'], ['docs/security.md', '보안 설계'],
            ['docs/seo.md', '검색 노출'], ['docs/staging.md', '스테이징과 운영 환경'], ['docs/membership.md', '등급과 승급']]
            .map(([path, label]) => <a key={path} href={doc(path)}><b>{label}</b><small>{path}</small></a>)}
        </div>
      </Section>

      <Section id="faq" no="14" title="자주 막히는 곳">
        <dl className="ob-faq">
          <dt>Gradle이 실행되지 않아요</dt>
          <dd>JDK 25 이상이면 Gradle 8.7이 동작하지 않습니다. JDK 17이나 21로 바꿔 주세요.</dd>
          <dt>로컬 화면이 운영 API를 불러요</dt>
          <dd><code>npm run dev</code>를 띄울 때 <code>VITE_API_URL=http://localhost:8080/api/v1</code>을 꼭 같이 줍니다.</dd>
          <dt>DB를 복원하는데 identity 열 오류가 나요</dt>
          <dd>백엔드가 먼저 만든 표와 덤프의 형식이 달라서입니다. <code>restore.sh</code>는 DB를 새로 만든 뒤 복원하니 직접 <code>pg_restore --clean</code>을 쓰지 마세요.</dd>
          <dt>스테이징에서 소셜 로그인이 안 돼요</dt>
          <dd>각 소셜 로그인 콘솔에 <code>https://staging.mycookie.dev/auth/callback</code>이 등록돼 있어야 합니다. 네이버는 검수 전까지 등록된 아이디만 로그인됩니다.</dd>
          <dt>운영 서버를 직접 만져야 해요</dt>
          <dd>운영자에게 요청하세요. 홈서버 접근 권한과 비밀값은 필요한 범위만 따로 전달합니다.</dd>
        </dl>
      </Section>

      <footer className="ob-foot">
        <p>궁금한 점은 운영자에게 편하게 물어보세요. 이 페이지에서 틀린 내용을 발견하면 <code>frontend/src/pages/OnboardingPage.jsx</code>를 고쳐서 PR을 올려 주세요.</p>
        <Link to="/">나의쿠키 첫 화면으로</Link>
      </footer>
    </div>
  );
}

const BLOG_HOME = 'https://cookie.tistory.com';
// 첫 글은 블로그 목록을 못 불러와도 항상 보이게 둔다
const PINNED = [{ title: '홈서버 구축하기: 서버 구축부터 DB 마이그레이션까지', url: `${BLOG_HOME}/258`, category: '인프라', publishedAt: '' }];

// 서버가 티스토리 RSS를 읽어 30분마다 갱신한다(/api/v1/blog/posts)
function BlogPosts() {
  const [state, setState] = useState({ loading: true, posts: [] });
  useEffect(() => {
    let alive = true;
    api.get('/blog/posts', { timeout: 15000 })
      .then(({ data }) => { if (alive) setState({ loading: false, posts: Array.isArray(data?.posts) ? data.posts : [] }); })
      .catch(() => { if (alive) setState({ loading: false, posts: [] }); });
    return () => { alive = false; };
  }, []);
  const posts = [...state.posts];
  for (const pin of PINNED) if (!posts.some(p => p.url === pin.url)) posts.push(pin);
  return <>
    {state.loading && <p className="ob-muted" role="status">글 목록을 불러오는 중…</p>}
    <ul className="ob-blog">
      {posts.map(post => <li key={post.url}>
        <a href={post.url} target="_blank" rel="noopener noreferrer"><b>{post.title}</b>
          <small>{[post.category, post.publishedAt].filter(Boolean).join(', ') || '기술 블로그'}</small></a>
      </li>)}
    </ul>
    <p><a href={BLOG_HOME} target="_blank" rel="noopener noreferrer">블로그 전체 보기 →</a></p>
  </>;
}

function Section({ id, no, title, children }) {
  return <section id={id} className="ob-section" aria-labelledby={`${id}-t`}>
    <h2 id={`${id}-t`}><span>{no}</span>{title}</h2>
    {children}
  </section>;
}

function Card({ title, body }) {
  return <div className="ob-card"><b>{title}</b><p>{body}</p></div>;
}

function Note({ children }) {
  return <p className="ob-note">{children}</p>;
}

// 아키텍처 그림. 색은 테마 변수를 따라 라이트, 다크 모두에서 보인다
function ArchDiagram() {
  return (
    <svg viewBox="0 0 1000 560" className="ob-diagram" role="img" aria-label="방문자가 Cloudflare를 거쳐 홈서버의 nginx, 백엔드, PostgreSQL로 이어지는 구조">
      <defs>
        <marker id="ob-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="ob-d-head" />
        </marker>
      </defs>
      {/* 바깥 */}
      <DBox x={20} y={200} w={120} h={60} title="방문자" sub="브라우저" />
      <DBox x={180} y={200} w={140} h={60} title="Cloudflare" sub="DNS, HTTPS" accent />
      <DArrow d="M140,230 L178,230" />
      <text x={250} y={285} textAnchor="middle" className="ob-d-label">mycookie.dev</text>
      <text x={250} y={300} textAnchor="middle" className="ob-d-label">staging.mycookie.dev</text>
      {/* 홈서버 */}
      <rect x={360} y={20} width={620} height={520} rx="10" className="ob-d-group" />
      <text x={376} y={44} className="ob-d-group-t">홈서버 (노트북, Windows + WSL2 Ubuntu)</text>
      <rect x={380} y={60} width={580} height={330} rx="8" className="ob-d-group ob-d-dash" />
      <text x={396} y={82} className="ob-d-group-t">Docker Compose</text>
      <DBox x={400} y={194} w={120} h={74} title="cloudflared" sub={'터널(홈서버가\n먼저 연결)'} />
      <DArrow d="M400,230 L322,230" dash />
      <DBox x={560} y={110} w={130} h={60} title="nginx 운영" sub="화면 + /api/" />
      <DBox x={560} y={290} w={130} h={60} title="nginx 스테이징" sub="화면 + /api/" />
      <DArrow d="M520,220 L558,150" />
      <DArrow d="M520,240 L558,310" />
      <DBox x={720} y={110} w={110} h={60} title="백엔드" sub="Spring Boot" />
      <DBox x={720} y={290} w={110} h={60} title="백엔드" sub="스테이징" />
      <DArrow d="M690,140 L718,140" />
      <DArrow d="M690,320 L718,320" />
      <DBox x={850} y={180} w={95} h={100} title="PostgreSQL" sub={'cookie_prod\ncookie_staging'} accent />
      <DArrow d="M830,145 L848,200" />
      <DArrow d="M830,315 L848,262" />
      {/* 운영 도구 */}
      <DBox x={400} y={420} w={170} h={60} title="deploy.sh" sub="5분마다 새 커밋 확인" />
      <DBox x={600} y={420} w={170} h={60} title="backup.sh" sub="매일 4시 덤프" />
      <DBox x={800} y={420} w={150} h={60} title="Tailscale" sub="원격 관리(SSH)" />
      {/* 바깥 서비스 */}
      <DBox x={180} y={400} w={140} h={50} title="GitHub" sub="비공개 저장소" />
      <DBox x={180} y={480} w={140} h={50} title="구글 드라이브" sub="암호화 백업" />
      <DArrow d="M400,450 L322,425" />
      <DArrow d="M685,480 L685,505 L322,505" dash label="암호화해서 업로드" lx={500} ly={498} />
    </svg>
  );
}

function DBox({ x, y, w, h, title, sub, accent }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" className={accent ? 'ob-d-box ob-d-accent' : 'ob-d-box'} />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -4 : 5)} textAnchor="middle" className="ob-d-title">{title}</text>
      {sub && sub.split('\n').map((line, i) => <text key={i} x={x + w / 2} y={y + h / 2 + 15 + i * 15} textAnchor="middle" className="ob-d-sub">{line}</text>)}
    </g>
  );
}

function DArrow({ d, dash, label, lx, ly }) {
  return (
    <g>
      <path d={d} className={dash ? 'ob-d-line ob-d-dash' : 'ob-d-line'} markerEnd="url(#ob-arrow)" />
      {label && <text x={lx} y={ly} textAnchor="middle" className="ob-d-label">{label}</text>}
    </g>
  );
}
