import { Link } from 'react-router-dom';
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
            ['local', '로컬 실행'], ['deploy', '배포 흐름'], ['rules', '작업 규칙'], ['first', '첫 주 체크리스트'], ['faq', '자주 막히는 곳']]
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

      <Section id="deploy" no="07" title="브랜치와 배포 흐름">
        <ol className="ob-steps">
          <li>작업마다 GitHub 이슈를 만들고, <b>기능 브랜치</b>에서 작업합니다.</li>
          <li>이슈를 연결한 PR을 <code>dev</code>로 올립니다. 리뷰 후 병합하면 <b>스테이징</b>(<code>staging.mycookie.dev</code>)에 반영됩니다.</li>
          <li>스테이징에서 확인이 끝나면 <code>dev</code> → <code>master</code> PR로 <b>운영</b>(<code>mycookie.dev</code>)에 배포합니다.</li>
          <li>홈서버의 <code>deploy.sh</code>가 5분마다 새 커밋을 확인해서, 백엔드나 화면 코드가 바뀐 쪽만 다시 빌드합니다. 빌드가 실패하면 이전 버전이 계속 돕니다.</li>
        </ol>
        <Note>
          사용자가 체감하는 기능을 바꿨다면 패치노트(<code>frontend/src/data/patchNotes.js</code>, <code>changelog.js</code>)도 함께 고칩니다.
          인프라, 문서, 리팩터링은 패치노트에 넣지 않습니다.
        </Note>
      </Section>

      <Section id="rules" no="08" title="작업 규칙">
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

      <Section id="first" no="09" title="첫 주 체크리스트">
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

      <Section id="faq" no="10" title="자주 막히는 곳">
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
