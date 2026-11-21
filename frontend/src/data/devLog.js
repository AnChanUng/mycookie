// 신입 개발자 개발 일지(/private/bomin/log). 새 날은 맨 위에 추가한다.
// 주소만 숨긴 페이지라 비밀번호, 키, 개인 연락처 같은 비밀값은 적지 않는다.
//   items: { text, sub?: [{ text, note? }], note? }  note는 작게 덧붙이는 설명
//   goals: { title, lead, list: [{ key, text, note }] }  우선순위를 직접 매겨 보는 목표 목록(순서는 그 기기에만 저장)
export const DEV_LOG = [
  {
    date: '2026-11-23',
    day: 2,
    title: '개발 2일차',
    owner: '보민',
    items: [
      {
        text: '학습 플랫폼에 맞는 신규 기능 하나',
        note: '관심 있는 분야(예: AICE Associate, AWS)의 자료를 충분히 학습해 시험 문제를 출제합니다.',
      },
    ],
  },
  {
    date: '2026-11-20',
    day: 1,
    title: '개발 1일차',
    owner: '보민',
    items: [
      {
        text: '전체 흐름 파악하기',
        note: '서버, 클라이언트, DB 등 전체 구조를 이해합니다. 온보딩의 아키텍처와 요청 흐름부터 읽어 보세요.',
      },
      {
        text: '필수 기능',
        sub: [
          { text: 'SSAFY 계정 소셜 로그인', note: '세션, JWT, Spring Security의 차이를 알아보며 OAuth를 공부합니다.' },
        ],
      },
    ],
  },
];
