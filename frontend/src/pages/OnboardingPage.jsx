import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import OnboardingTabs from '../components/OnboardingTabs';
import './OnboardingPage.css';
import archImg from '../assets/architecture.webp';

// 신입 개발자 온보딩 페이지. 들어오는 주소는 /private/bomin, 화면에서는 알아보기 어려운 주소(ONBOARDING_PATH)로 바꿔 보여 준다.
// 주소를 숨기는 것일 뿐 보안 장치는 아니다. 비밀번호, 키, 연결 주소 같은 비밀값은 이 페이지에 적지 않는다.
export const ONBOARDING_PATH = '/x/f9aa1502c8';
const REPO = 'https://github.com/AnChanUng/mycookie';
const doc = path => `${REPO}/blob/master/${path}`;

export default function OnboardingPage() {
  return (
    <div className="ob">
      <header className="ob-hero">
        <OnboardingTabs />
        <p className="ob-eyebrow">나의쿠키</p>
        <h1>신입 개발자 온보딩</h1>
        <p className="ob-lead">
          나의쿠키에 오신 걸 환영합니다. 이 페이지 하나로 나의쿠키가 무엇이고, 어떻게 생겼고, 어디서부터 손대면 되는지 알 수 있게 정리했습니다.
          위에서부터 순서대로 읽되, 모르는 부분은 넘어가도 괜찮습니다.
        </p>
        <nav className="ob-toc" aria-label="목차">
          {[['about', '한눈에 보기'], ['arch', '아키텍처'], ['flow', '요청 흐름'], ['stack', '기술 스택'], ['repo', '저장소 구조'],
            ['local', '로컬 실행'], ['env', '환경과 브랜치'], ['github', 'GitHub 작업 순서'], ['ops', '운영과 장애 대응'], ['release', '버전과 릴리스'], ['ai', 'AI와 함께 일하기'],
            ['rules', '작업 규칙'], ['blog', '기술 블로그'], ['docs', '더 읽을 문서']]
            .map(([id, label], i) => <a key={id} href={`#${id}`}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a>)}
        </nav>
      </header>

      <Section id="about" no="01" title="나의쿠키 한눈에 보기">
        <p>
          나의쿠키(<a href="https://mycookie.dev">mycookie.dev</a>)는 개발자 취업 준비생을 위한 학습 사이트입니다.
          컴퓨터공학 전공 지식, 기술면접, 기업별 전공필기, 코딩테스트, 실시간 CS 대결을 한곳에서 공부할 수 있습니다.
        </p>
        <p>
          나의쿠키는 <b>삼성 청년 SW·AI 아카데미(SSAFY)</b>에서 시작했어요. 처음에는 전공시험을 준비하면서 친한 형과 같이 공부하려고 만든 개인 사이트였어요.
          그러다 반 친구들(SSAFY 16기 대전 4반)에게도 공유하게 되었고, 우리 서비스를 더 잘 만들어 줄 멋진 팀원을 만나 지금은 <b>2명이 함께 개발</b>하고 있습니다.
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
        <p>노트북 한 대(홈서버)에서 화면, 백엔드, DB를 Docker Compose로 돌립니다. 바깥 요청은 Cloudflare 터널로만 들어오고, 공유기 포트는 하나도 열지 않습니다.</p>
        <figure className="ob-figure">
          <a className="ob-diagram-wrap" href={archImg} target="_blank" rel="noopener noreferrer">
            <img className="ob-diagram" src={archImg} width="1680" height="1185" loading="lazy"
              alt="사용자 요청이 Cloudflare와 cloudflared를 거쳐 홈서버의 nginx, Spring Boot, PostgreSQL, Redis, Kafka로 이어지고, 자동 배포와 암호화 백업이 Google Drive로 이어지는 구조" />
          </a>
          <figcaption>그림 1. 전체 구조. 회색은 사용자 요청, 보라는 외부 연동, 파란 점선은 배포, 초록은 백업 흐름입니다. 그림을 누르면 크게 볼 수 있어요(원본: <code>docs/architecture/build.py</code>)</figcaption>
        </figure>
        <table className="ob-table">
          <thead><tr><th>구성 요소</th><th>하는 일</th></tr></thead>
          <tbody>
            <tr><td>Cloudflare</td><td>DNS, HTTPS 인증서, 공격 방어. 터널 입구 역할을 합니다</td></tr>
            <tr><td>cloudflared</td><td>홈서버가 먼저 Cloudflare로 연결을 걸어 두는 터널 프로그램. 주소(mycookie.dev, staging.mycookie.dev)에 따라 운영, 스테이징 nginx로 나눠 보냅니다</td></tr>
            <tr><td>nginx (화면 서버)</td><td>React 빌드 파일을 내보내고, <code>/api/</code> 요청은 같은 주소 그대로 백엔드에 넘깁니다(CORS 불필요)</td></tr>
            <tr><td>Spring Boot (백엔드)</td><td>로그인, 채점, 대결, 학습 기록, 채팅(SSE), 메일 발송</td></tr>
            <tr><td>PostgreSQL 18</td><td>운영 DB <code>cookie_prod</code>와 스테이징 DB <code>cookie_staging</code>. 계정도 따로입니다. 사라지면 안 되는 데이터는 모두 여기에 둡니다</td></tr>
            <tr><td>Redis 7.4</td><td>지금 공부 중인 사람 수, 채팅 참여자, IP별 요청 제한처럼 <b>짧게 사는 상태</b>. 백엔드를 다시 띄워도 남고, 여러 대로 늘려도 같은 값을 봅니다. 운영과 스테이징은 키 앞머리(<code>prod:</code>, <code>staging:</code>)로 나눕니다. 디스크에 남기지 않습니다</td></tr>
            <tr><td>Kafka 3.9 (KRaft)</td><td>제보가 들어오면 <code>prod.feedback.created</code> 이벤트를 넣고 바로 답합니다. 소비자가 GitHub 이슈를 만들고 Mattermost로 알립니다. 실패하면 10초 간격으로 3번 다시 시도하고, 그래도 안 되면 <code>.dlt</code> 토픽에 남깁니다</td></tr>
            <tr><td>자동 배포</td><td>systemd 타이머가 5분마다 <code>deploy.sh</code>를 돌려 새 커밋을 받고, 바뀐 쪽(화면 또는 백엔드)만 다시 빌드합니다</td></tr>
            <tr><td>백업</td><td>매일 새벽 4시 덤프, 홈서버 안 14일 + 구글 드라이브(gpg 암호화) 30일</td></tr>
            <tr><td>Tailscale</td><td>집 밖에서 홈서버에 들어가는 사설 네트워크. SSH와 Grafana(로그, 서버 상태 화면)를 여기로만 엽니다</td></tr>
            <tr><td>모니터링</td><td>Grafana, Loki(로그), Prometheus(지표), Alloy(수집). 서비스와 분리된 Compose 프로젝트로 돌고, 로그의 이메일, IP, 토큰은 저장 전에 가립니다(<a href={doc('docs/monitoring.md')}>docs/monitoring.md</a>)</td></tr>
            <tr><td>GitHub Actions</td><td>PR마다 백엔드 테스트, 화면 린트와 빌드, 데이터 검사(<code>ci.yml</code>), 위험도 판정(<code>pr-risk.yml</code>), 담당자 지정을 돌리고, 새 이슈, 새 PR, CI 실패를 Mattermost로 알립니다</td></tr>
            <tr><td>외부 서비스</td><td>Mattermost(매일 CS 알림, 제보 알림 웹훅), 소셜 로그인(Google, Kakao, Naver, GitHub), 티스토리 RSS(기술 블로그 목록)</td></tr>
          </tbody>
        </table>

        <Note>
          Redis나 Kafka가 멈춰도 사이트는 멈추지 않습니다. Redis가 안 되면 각 백엔드의 메모리 값으로, Kafka가 안 되면 제보를 요청 안에서 바로 처리합니다.
          로컬 개발과 테스트에서는 둘 다 꺼진 채(<code>REDIS_ENABLED</code>, <code>KAFKA_ENABLED</code>가 false) 예전처럼 돌아갑니다.
        </Note>

        <h3>메모리 예산 (8GB)</h3>
        <p>모든 컨테이너에 <code>mem_limit</code>을 걸어 둡니다. 새 컨테이너를 넣기 전에 이 합계부터 확인하세요.</p>
        <table className="ob-table">
          <thead><tr><th>컨테이너</th><th>한도</th></tr></thead>
          <tbody>
            <tr><td>backend-prod</td><td>1GB (JVM 힙은 75%까지)</td></tr>
            <tr><td>backend-staging</td><td>768MB</td></tr>
            <tr><td>postgres</td><td>768MB</td></tr>
            <tr><td>kafka</td><td>640MB (JVM 힙 256MB)</td></tr>
            <tr><td>redis</td><td>96MB (데이터 64MB, 넘치면 오래된 키부터 지움)</td></tr>
            <tr><td>frontend-prod, frontend-staging</td><td>각 64MB</td></tr>
            <tr><td>서비스 합계</td><td>약 3.4GB</td></tr>
            <tr><td>모니터링(loki 384, prometheus 256, alloy 256, grafana 256, stats 64MB)</td><td>약 1.2GB</td></tr>
            <tr><td><b>전체 합계</b></td><td><b>약 4.6GB</b> (나머지는 Windows, WSL, 빌드에 씁니다)</td></tr>
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
├─ deploy/homeserver/ 홈서버 docker-compose, 배포, 백업, 복원, 상태 확인 스크립트
├─ deploy/monitoring/ Grafana, Loki, Prometheus (서비스와 따로 띄움)
├─ .github/           CI, 위험도 검사, 알림 워크플로, 브랜치 규칙 원본
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
cd frontend && npm run lint && npm run build
npm run check:today-cs        # 데이터 검사는 check:* 하나씩 돌릴 수 있습니다`}</pre>
        <p>CI는 <code>package.json</code>에 있는 <code>check:*</code> 검사를 <b>모두</b> 돌립니다. 새 검사를 만들면 이름만 <code>check:</code>로 시작하게 붙이면 CI에 자동으로 들어갑니다. 화면을 바꿨다면 관련 검사를 먼저 로컬에서 돌려 보세요.</p>
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
        <h3>배포는 어떻게 일어나나</h3>
        <p>배포 버튼은 없습니다. <b>브랜치에 합치는 것이 곧 배포</b>입니다. 홈서버가 5분마다 GitHub을 확인해서 새 커밋이 있는 쪽만 다시 띄웁니다.</p>
        <ol className="ob-steps">
          <li><b>작업 브랜치 → <code>dev</code> PR 병합:</b> 5분 안에 스테이징(staging.mycookie.dev)이 바뀝니다. 여기서 직접 눌러 보며 확인합니다.</li>
          <li><b><code>dev</code> → <code>master</code> PR 병합:</b> 5분 안에 운영(mycookie.dev)이 바뀝니다. 스테이징에서 확인한 것만 올립니다.</li>
          <li><b>바뀐 쪽만 다시 빌드:</b> 화면 파일만 바뀌면 화면만, <code>backend/</code>가 바뀌면 백엔드만 다시 만듭니다. 백엔드가 다시 뜨는 1~2분 동안은 API가 잠깐 멈출 수 있습니다.</li>
        </ol>
        <Note>
          <b>헷갈리기 쉬운 두 가지</b><br />
          1. <code>master</code>에 바로 들어간 변경(핫픽스 등)은 <code>dev</code>에 없습니다. 그대로 두면 다음 배포 때 스테이징이 예전 코드로 돌아가니, <b><code>master</code> → <code>dev</code> PR</b>로 바로 맞춰 둡니다.<br />
          2. 홈서버 <code>.env</code>의 <code>PROD_BRANCH</code>, <code>STAGING_BRANCH</code>로 어느 브랜치를 띄울지 잠깐 바꿀 수 있습니다(큰 작업을 바로 확인할 때). <b>평소에는 비워 둡니다.</b> 비어 있으면 운영은 <code>master</code>, 스테이징은 <code>dev</code>를 띄웁니다.
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
          <li><b>이슈 등록:</b> 할 일을 GitHub 이슈로 먼저 적습니다. <b>New issue</b>에서 양식(기능과 개선, 버그와 문제)을 고르면 제목 머리말과 라벨이 붙습니다. 사이트의 <Link to="/feedback">건의, 제보</Link> 양식으로 들어온 글도 <code>[기능개발]</code>, <code>[버그]</code> 이슈로 자동 등록되니, 이슈 목록이 곧 할 일 목록입니다.</li>
          <li><b>브랜치 만들기:</b> 최신 <code>dev</code>에서 <code>feature/...</code>나 <code>fix/...</code> 브랜치를 만듭니다.</li>
          <li><b>커밋:</b> 한 커밋에 한 가지 일만 담고, 메시지는 한글로 "무엇을 왜"를 첫 줄에 씁니다.</li>
          <li><b>PR 올리기:</b> <code>dev</code>로 PR을 엽니다. 양식(관련 이슈, 무엇을, 왜, 확인한 것)을 채우고 <code>closes #이슈번호</code>를 적으면 머지할 때 이슈가 자동으로 닫힙니다.</li>
          <li><b>위험도에 따라 머지:</b> PR을 올리면 바뀐 파일을 보고 위험도 라벨이 자동으로 붙습니다(아래 표). 조건을 채우면 머지되고, 5분 안에 스테이징에 자동 배포됩니다.</li>
          <li><b>운영 배포:</b> 스테이징에서 확인이 끝나면 <code>dev</code> → <code>master</code> PR을 엽니다. <b>운영 머지는 관리자(찬웅님)만</b> 할 수 있습니다. 5분 안에 운영에 반영됩니다.</li>
          <li><b>기록:</b> 사용자가 체감하는 변화면 패치노트를 쓰고, 버전 태그와 릴리스를 붙입니다(다음 항목).</li>
        </ol>
        <h3>PR 위험도와 머지 조건</h3>
        <table className="ob-table">
          <thead><tr><th>위험도</th><th>무엇이 바뀌면</th><th>머지 조건</th></tr></thead>
          <tbody>
            <tr><td>🟢 낮음</td><td>문서, 문제 데이터, 테스트만</td><td>CI 통과하면 <b>자동 머지</b></td></tr>
            <tr><td>🟡 중간</td><td>그 외 백엔드, 화면 코드</td><td>CI 통과 + <b>찬웅님 승인</b>. 찬웅님이 올린 PR은 승인 없이 머지 가능</td></tr>
            <tr><td>🔴 높음</td><td>로그인, 보안, 결제, DB 엔티티, 설정(<code>application.yml</code>), 배포, CI, 의존성</td><td>CI 통과 + <b>작성자가 아닌 사람 1명 승인</b>(필수)</td></tr>
            <tr><td>운영</td><td><code>dev</code> → <code>master</code></td><td>CI 통과 + <b>관리자만 머지</b></td></tr>
          </tbody>
        </table>
        <Note>
          판정은 PR의 <b>위험도 검사</b>(GitHub Actions)가 하고, 이유는 검사 결과 요약에 적힙니다. 여러 파일이 섞이면 가장 높은 위험도를 따릅니다.
          <code>master</code>에는 <code>dev</code>에서 오는 PR만 받습니다. 작업 브랜치에서 <code>master</code>로 바로 올리면 검사가 막습니다.<br />
          새 PR과 이슈의 담당자(Assignees)에는 찬웅님이 자동으로 들어갑니다.
        </Note>

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
        <p>평소처럼 <code>fix/...</code> → <code>dev</code> → <code>master</code>로 빠르게 올리는 것이 기본입니다. 그럴 시간도 없는 장애라면 관리자만 규칙을 건너뛰어 <code>master</code>를 바로 고칠 수 있고, 고친 뒤에는 <code>master</code> → <code>dev</code> PR로 두 브랜치를 맞춥니다.</p>
      </Section>

      <Section id="ops" no="09" title="운영과 장애 대응">
        <p>운영 중인 사이트가 어떤지 보는 곳과, 문제가 생겼을 때 알림이 오는 곳입니다. 서버 계정이나 docker 권한이 없어도 볼 수 있게 만들어 두었습니다.</p>
        <h3>어디서 보나</h3>
        <table className="ob-table">
          <thead><tr><th>보고 싶은 것</th><th>어디서</th></tr></thead>
          <tbody>
            <tr><td>운영, 스테이징 로그</td><td>Grafana <b>MyCookie Logs</b>. 환경(<code>prod</code>, <code>staging</code>, <code>shared</code>), 서비스, 레벨(<code>ERROR</code> 등), 검색어로 거릅니다. 14일 보관</td></tr>
            <tr><td>서버 CPU, 메모리, 디스크, 컨테이너별 메모리</td><td>Grafana <b>MyCookie Server</b>(첫 화면). 7일 보관</td></tr>
            <tr><td>사용자 제보, CI 실패, 장애 알림</td><td>Mattermost 알림 채널</td></tr>
            <tr><td>할 일과 진행 상황</td><td>GitHub 이슈, PR</td></tr>
          </tbody>
        </table>
        <Note>
          <b>Grafana 접속:</b> 찬웅님이 Tailscale에 초대하고 보기 전용 계정을 만들어 드립니다. Tailscale에 들어온 뒤 <code>http://&lt;홈서버의 Tailscale 이름&gt;:3000</code>으로 엽니다(인터넷에는 열려 있지 않습니다).
          처음 받은 비밀번호는 첫 로그인 뒤 오른쪽 위 프로필에서 바로 바꿔 주세요.
        </Note>
        <h3>알림 종류</h3>
        <table className="ob-table">
          <thead><tr><th>알림</th><th>언제 오나</th></tr></thead>
          <tbody>
            <tr><td>🚨 사이트 응답 없음</td><td>운영 백엔드나 mycookie.dev가 3분 넘게 응답하지 않을 때. 되살아나면 복구 알림도 옵니다(홈서버가 1분마다 확인)</td></tr>
            <tr><td>🚨 치명 오류</td><td>메모리 부족, DB 연결 실패처럼 서비스 전체가 멈출 수 있는 오류가 한 번이라도 났을 때(운영 백엔드)</td></tr>
            <tr><td>🚨 오류 급증</td><td>5분 동안 ERROR 로그가 10건 이상일 때(운영 백엔드)</td></tr>
            <tr><td>할 일 알림</td><td>새 제보, 새 이슈, 새 PR, CI 실패. PR 병합, 이슈 닫힘은 알리지 않습니다</td></tr>
          </tbody>
        </table>
        <p>긴급 알림에는 <b>Gemini 요약</b>(AI 추측이 섞일 수 있음), <b>원본 증거</b>(오류 이름, 횟수, 위치), <b>Grafana 링크</b>가 함께 옵니다. 같은 문제는 30분 동안 다시 알리지 않습니다.</p>
        <h3>긴급 알림을 받으면</h3>
        <ol className="ob-steps">
          <li><b>알림 채널에 "제가 봅니다"를 남깁니다.</b> 여러 사람이 같은 일을 겹쳐 하지 않게 합니다.</li>
          <li><b>원본 증거부터 읽습니다.</b> Gemini 요약은 방향만 잡는 용도이고, 판단은 오류 이름과 위치로 합니다.</li>
          <li><b>Grafana 링크로 앞뒤 로그를 봅니다.</b> 같은 시각 DB 로그는 환경 <code>shared</code>, 서비스 <code>postgres</code>입니다. 서버 화면에서 메모리가 한도에 붙어 있는지도 확인합니다.</li>
          <li><b>재시작, 배포 되돌리기 같은 서버 조치는 찬웅님이 합니다.</b> 원인과 고칠 방법을 이슈(<code>[버그]</code>)로 정리하고, 코드로 고칠 수 있으면 <code>fix/...</code> 브랜치로 PR을 올립니다(급하면 핫픽스 순서).</li>
        </ol>
        <Note>
          로그와 알림에는 이메일, IP, 토큰이 가려져 있습니다. 그래도 로그 화면을 캡처해 바깥(블로그, 공개 이슈)에 올릴 때는 개인정보가 없는지 한 번 더 확인하세요.
          저장소가 공개라 이슈와 PR도 누구나 볼 수 있습니다.
        </Note>
      </Section>

      <Section id="release" no="10" title="버전, 태그, 릴리스">
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
          지금 상태: 태그와 릴리스는 <code>v0.9.0</code>부터 <code>v0.21.0</code>까지 있습니다. 패치노트의 <code>0.22.0</code>, <code>0.23.0</code>, <code>0.24.0</code>은 아직 태그가 없으니,
          다음 릴리스 때 함께 정리합니다. 오래된 <code>v1.0</code>, <code>v2.0.260921</code>은 예전 프로젝트 시절 태그라 지금 번호 체계와 상관없습니다.
        </Note>
      </Section>

      <Section id="ai" no="11" title="AI와 함께 일하기">
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

      <Section id="rules" no="12" title="작업 규칙">
        <ul className="ob-list">
          <li><b>온프레미스 전제:</b> 특정 클라우드 전용 서비스에 묶이지 않습니다. PostgreSQL, SMTP처럼 직접 띄울 수 있는 것만 씁니다.</li>
          <li><b>메모리 8GB 예산:</b> 홈서버 한 대에서 모니터링까지 모두 돌아야 합니다. 새 컨테이너를 넣을 때는 <code>mem_limit</code> 합계(지금 약 4.6GB)를 확인합니다.</li>
          <li><b>상태는 알맞은 곳에:</b> 사라지면 안 되는 정보는 PostgreSQL, 접속자 수나 요청 제한처럼 짧게 사는 값은 Redis, 느린 후속 작업(이슈 생성, 알림)은 Kafka 이벤트로 넘깁니다. Redis와 Kafka가 멈춰도 사이트가 돌도록 대신하는 길을 꼭 남깁니다.</li>
          <li><b>유료 API 자동화 금지:</b> Claude API처럼 돈이 드는 API를 쓰는 자동화(AI 리뷰 등)는 넣지 않습니다. 요약은 무료 Gemini를 씁니다.</li>
          <li><b>예외는 한곳에서:</b> 백엔드 오류는 <code>CookieErrorCode</code>에 한 줄 추가하고 <code>throw new CookieException(CookieErrorCode.이름)</code>으로 던집니다. 응답은 <code>CookieExceptionHandler</code>가 <code>{"{"}code, error{"}"}</code> 모양으로 만들어 화면은 <code>error</code>를 그대로 보여 줍니다.</li>
          <li><b>로그에 개인정보 금지:</b> 로그에 이메일, 토큰, 비밀번호를 그대로 찍지 않습니다. 모니터링도 한 번 더 가리지만 코드에서 먼저 조심합니다.</li>
          <li><b>패치노트:</b> 사용자가 체감하는 변화만, 버전당 3~4개 이내로 짧게 씁니다. 인프라, 리팩터링, 테스트는 넣지 않습니다.</li>
          <li><b>설정은 환경 변수로:</b> 새 설정은 <code>deploy/homeserver/.env.example</code>과 <code>docker-compose.yml</code>에 같이 적습니다.</li>
          <li><b>보안 헤더:</b> <code>frontend/vercel.json</code>을 고치면 <code>node frontend/scripts/export-nginx-headers.mjs</code>로 nginx 헤더도 다시 만듭니다.</li>
          <li><b>화면:</b> 새 화면은 <code>styles/ds.css</code>의 부품과 토큰을 씁니다. 그림자 대신 얇은 테두리, 이모지 대신 선 아이콘(<code>LineIcon</code>)입니다.</li>
          <li><b>비밀값:</b> 비밀번호, 토큰, DB 주소는 메신저나 이슈, 커밋에 붙이지 않습니다. 확인이 필요하면 값 대신 길이나 앞 몇 글자만 봅니다.</li>
        </ul>
      </Section>

      <Section id="blog" no="13" title="기술 블로그">
        <p>나의쿠키를 만들면서 겪은 일(홈서버 구축, AI 워크플로우 등)을 기술 블로그에 정리합니다. 나의쿠키 관련 글(태그 "나의쿠키")을 올리면 이 목록에 자동으로 나타납니다.</p>
        <BlogPosts />
      </Section>

      <Section id="docs" no="14" title="더 읽을 문서">
        <div className="ob-links">
          {[['docs/homeserver.md', '홈서버 구축, 배포, 백업과 복구'], ['docs/monitoring.md', '로그, 서버 상태 보기 (Grafana)'], ['docs/design-system.md', '디자인 시스템'], ['docs/security.md', '보안 설계'],
            ['docs/seo.md', '검색 노출'], ['docs/staging.md', '스테이징과 운영 환경'], ['docs/membership.md', '등급과 승급']]
            .map(([path, label]) => <a key={path} href={doc(path)}><b>{label}</b><small>{path}</small></a>)}
        </div>
      </Section>


      <footer className="ob-foot">
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

