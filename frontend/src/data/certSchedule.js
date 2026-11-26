// 추천 자격증 시험 일정(2026년 12월 ~ 2027년 12월). 시험 기관이 발표한 날짜만 넣고 지난 해 패턴으로 짐작하지 않는다.
// 기관이 새 일정을 발표하면 EVENTS에 더하고 CHECKED_AT과 PENDING을 고친다.
export const CHECKED_AT = '2026-11-26';
export const FIRST_MONTH = '2026-12';
export const LAST_MONTH = '2027-12';

export const KINDS = { apply: '접수', exam: '시험', result: '발표' };

const AICE_2026 = 'https://aice.study/certi/examSchedule';
const AICE_2027 = 'https://aice.study/board/notice/detail/17952';
const QNET = 'https://www.q-net.or.kr/crf021.do?id=crf02101&gSite=Q&gId=&scheType=03';
const DATAQ = 'https://www.dataq.or.kr/www/accept/schedule.do';
const KAIT = 'https://www.ihd.or.kr/guidecert1.do';
const ICQA = 'https://www.icqa.or.kr/cn/board/notice/646';

const event = (cert, kind, title, start, href, end = start) => ({ cert, kind, title, start, end, href });

// AICE Associate 2027: 온라인 응시 기준(2 · 3회의 오프라인 접수는 한 주 먼저 마감)
const AICE_ROUNDS_2027 = [
  [1, ['2027-03-01', '2027-03-19'], ['2027-03-26', '2027-03-27']],
  [2, ['2027-05-31', '2027-06-18'], ['2027-06-25', '2027-06-26']],
  [3, ['2027-08-30', '2027-09-17'], ['2027-09-24', '2027-09-25']],
  [4, ['2027-11-22', '2027-12-10'], ['2027-12-17', '2027-12-18']],
];

export const EVENTS = [
  event('SQLD', 'result', '제63회 합격자 발표', '2026-12-04', DATAQ),
  event('네트워크관리사 2급', 'exam', '실기시험', '2026-12-06', ICQA),
  event('네트워크관리사 2급', 'result', '합격자 발표', '2026-12-15', ICQA),
  event('리눅스마스터 2급', 'exam', '제2604회 2차 시험', '2026-12-12', KAIT),
  event('리눅스마스터 2급', 'result', '제2604회 합격자 발표', '2026-12-31', KAIT),
  event('AICE Associate', 'apply', '2026년 6회 접수', '2026-11-23', AICE_2026, '2026-12-11'),
  event('AICE Associate', 'exam', '2026년 6회 시험', '2026-12-18', AICE_2026, '2026-12-19'),
  event('AICE Associate', 'result', '2026년 6회 결과 발표', '2027-01-02', AICE_2026),
  event('정보처리기사', 'result', '2026년 3회 최종 합격자 발표', '2026-12-18', QNET),
  event('빅데이터분석기사', 'result', '제13회 실기 합격자 발표', '2026-12-18', DATAQ),
  ...AICE_ROUNDS_2027.flatMap(([round, apply, exam]) => [
    event('AICE Associate', 'apply', `2027년 ${round}회 접수`, apply[0], AICE_2027, apply[1]),
    event('AICE Associate', 'exam', `2027년 ${round}회 시험`, exam[0], AICE_2027, exam[1]),
  ]),
];

// 2027년 일정이 아직 확인되지 않은 곳
export const PENDING = [
  { name: '정보처리기사', href: 'https://www.q-net.or.kr/' },
  { name: '빅데이터분석기사 · SQLD · ADsP', href: DATAQ },
  { name: '정보보안기사', href: 'https://www.cq.or.kr/' },
  { name: '리눅스마스터 2급', href: KAIT },
  { name: '네트워크관리사 2급', href: 'https://www.icqa.or.kr/cn/index.php' },
];
