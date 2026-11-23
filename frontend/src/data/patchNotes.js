// 패치노트 기록(버전, 변경 내용). 화면에서는 보여 주지 않고, 버전 번호의 기준으로만 쓴다. 공개 패치노트는 changelog.js.
// 새 패치는 맨 위에 추가한다. 사용자가 체감하는 기능 변화만 적고, 버전당 3~4개 이내로 줄인다(성능 · 인프라 · 문서 · 리팩터링 · 자잘한 수정은 적지 않는다).
// 버전 규칙: 앞자리는 서비스가 크게 바뀌는 대규모 개편, 가운데는 기능 묶음, 끝자리는 눈에 띄는 수정. 자세한 변경은 release PR과 GitHub Release에 적는다.
// 항목 type: 'feature' 새 기능 | 'improve' 개선
// status: 'released' 배포됨(master) | 'dev' 개발 브랜치에만 있음(release PR을 머지하면 released로 바꾼다)
export const PATCH_NOTES = [
  {
    version: '1.1.0',
    date: '2026-11-23',
    title: '간편 로그인으로 가입, 닉네임 · 이메일 로그인',
    status: 'dev',
    summary: '새 가입은 간편 로그인으로만 받고, 기존 계정은 닉네임 또는 인증한 이메일로 로그인합니다.',
    items: [
      { type: 'improve', text: '새 가입은 구글 · 카카오 · 네이버 등 간편 로그인으로만 받습니다. 처음 들어오면 닉네임만 정하면 바로 시작합니다. 이미 만든 닉네임 · 비밀번호 계정은 그대로 씁니다.' },
      { type: 'feature', text: '로그인 칸에 닉네임 대신 내 계정에서 인증한 이메일을 넣어도 로그인됩니다.' },
      { type: 'improve', text: '새로 정하거나 바꾸는 비밀번호는 8자 이상이어야 합니다. 기존 비밀번호는 짧아도 그대로 로그인됩니다.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-22',
    title: '학습 메일 구독, 기업 소식, 새 Spring 문제집',
    status: 'dev',
    summary: '이메일 인증 한 번으로 평일 아침마다 학습 메일을 받고, 기업 기술블로그 새 글을 모아 봅니다.',
    items: [
      { type: 'feature', text: '학습 메일 구독: 이메일 인증 번호로 구독하면 평일(월~금) 아침 8시 30분에 오늘의 문제, 이어지는 기업 기술블로그 글, 정답과 해설을 한 통으로 보냅니다(30세트, 구독자 400명 한정).' },
      { type: 'feature', text: '기업 소식: 네이버, 카카오, 토스 등 기업 기술블로그의 새 글을 매주 모아 회사별로 봅니다.' },
      { type: 'improve', text: 'Spring 핵심 실전 53문제를 정답이 길지 않게 다시 출제하고 첫 화면을 단순하게 정리했습니다.' },
      { type: 'improve', text: '채팅 대화 기록이 날이 바뀌어도 남고, 오늘의 명언이 하루에 한 번 바뀝니다.' },
    ],
  },
  {
    version: '0.25.0',
    date: '2026-11-20',
    title: '웹 필수지식 레벨',
    status: 'released',
    summary: '웹 필수지식을 수준별로 나눠 차례로 공부합니다.',
    items: [
      { type: 'improve', text: '웹 필수지식을 Lv.1 기초, Lv.2 실무, Lv.3 심화로 나눠 레벨별로 보고 완료 수를 확인합니다.' },
    ],
  },
  {
    version: '0.24.0',
    date: '2026-11-19',
    title: '내 계정 메뉴',
    status: 'released',
    summary: '오른쪽 위 내 계정을 누르면 등급과 학습 현황을 한 번에 봅니다.',
    items: [
      { type: 'improve', text: '내 계정 메뉴: 등급과 다음 등급까지 남은 문제, 학습 현황(이번 주, 정답률, 누적, 오답), 바로가기, 로그아웃.' },
    ],
  },
  {
    version: '0.23.0',
    date: '2026-11-19',
    title: '새 메뉴, 실시간 순위, 건의 제보',
    status: 'released',
    summary: '분야별 상단 메뉴와 실시간 순위를 추가했습니다.',
    items: [
      { type: 'feature', text: '상단 메뉴를 분야별로 나누고 인적성(SKCT, GSAT, LG 모의고사)을 추가했습니다.' },
      { type: 'feature', text: '첫 화면 맨 위 실시간 순위(1~3위 시상대와 내 순위)와 전체 순위 화면.' },
      { type: 'feature', text: '건의 · 버그 제보: 보내면 개발 목록에 바로 올라갑니다.' },
    ],
  },
  {
    version: '0.22.0',
    date: '2026-11-18',
    title: '소셜 로그인, 이메일 비밀번호 재설정',
    status: 'released',
    summary: '구글, 카카오, 깃허브로 로그인하고 이메일로 비밀번호를 다시 정할 수 있습니다.',
    items: [
      { type: 'feature', text: '소셜 로그인(구글, 카카오, 깃허브): 처음 로그인할 때 기존 닉네임 계정에 연결하거나 새 계정을 만듭니다.' },
      { type: 'feature', text: '이메일을 등록해 두면 비밀번호를 잊었을 때 메일로 재설정할 수 있습니다.' },
    ],
  },
  {
    version: '0.20.0',
    date: '2026-11-18',
    title: '새 메인 화면',
    status: 'released',
    summary: '첫 화면에서 오늘 할 공부를 바로 시작합니다.',
    items: [
      { type: 'feature', text: '메인: 인사, 등급과 연속 학습, 오늘의 CS, 실시간 대결, 이어서 하기.' },
    ],
  },
  {
    version: '0.18.0',
    date: '2026-11-18',
    title: '코테 메뉴',
    status: 'released',
    summary: '코딩테스트 사이트로 바로 이동합니다.',
    items: [
      { type: 'feature', text: '코테 메뉴에서 코딩테스트 사이트 4곳으로 새 탭에서 바로 이동합니다.' },
    ],
  },
  {
    version: '0.16.0',
    date: '2026-11-18',
    title: '내 학습',
    status: 'released',
    summary: '등급, 연속 학습, 이번 주 푼 문제를 한눈에 봅니다.',
    items: [
      { type: 'feature', text: '내 학습: 등급, 연속 학습, 이번 주 푼 문제, 정답률, 오늘 할 일(오늘의 CS, 풀던 문제 이어 풀기, 오답 다시 풀기).' },
    ],
  },
  {
    version: '0.14.0',
    date: '2026-11-18',
    title: '서비스 이름을 나의쿠키로 변경',
    status: 'released',
    summary: '서비스 이름과 로고가 나의쿠키로 바뀌었습니다.',
    items: [
      { type: 'improve', text: '로고, 첫 화면, 푸터, 브라우저 탭 제목, 약관을 나의쿠키로 바꿨습니다.' },
    ],
  },
  {
    version: '0.3.0',
    date: '2026-11-18',
    title: '실시간 대결 개선',
    status: 'released',
    summary: '같은 10문제로 겨루는 실시간 대결이 더 공정해졌습니다.',
    items: [
      { type: 'improve', text: '재대결에서 모두 같은 방으로 모이고, 점수는 서버가 직접 채점합니다.' },
    ],
  },
];
