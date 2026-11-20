// 홈서버(그램 노트북)에서 실제 서비스 구성(nginx → 백엔드 → PostgreSQL, Redis)을 그대로 두고 재는 부하테스트.
// 기본 대상은 스테이징 화면 서버(127.0.0.1:8081)다. 운영(8080)은 CONFIRM_PROD=yes를 함께 줘야만 보낸다.
// 읽기 요청만 보낸다(방문 기록, 풀이 기록, 채팅 같은 쓰기는 하지 않는다).
//
//   k6 run -e PROFILE=smoke load-tests/homeserver.js
//   k6 run -e PROFILE=load load-tests/homeserver.js     # 10 → 50 VU, 판정 기준 있음
//   k6 run -e PROFILE=stress load-tests/homeserver.js   # 50 → 200 VU, 꺾이는 지점 찾기(실패율 5% 넘으면 멈춤)
//
// 요청 제한은 IP별이다. 모든 VU가 같은 루프백에서 나가므로 VU마다 다른 X-Forwarded-For(198.18.0.0/15, 시험용 대역)를
// 붙여 서로 다른 사용자처럼 나눈다. 백엔드는 마지막 값을 쓰고, 인터넷 요청은 Cloudflare가 실제 IP를 마지막에 붙이므로
// 바깥에서 이 헤더로 제한을 피할 수는 없다. 요청 제한 설정 자체는 바꾸지 않는다.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const base = (__ENV.BASE_URL || 'http://127.0.0.1:8081').replace(/\/$/, '');
const target = base.match(/^http:\/\/(127\.0\.0\.1|localhost):(\d+)$/);
if (!target) throw new Error('BASE_URL은 홈서버 안의 루프백 주소(예: http://127.0.0.1:8081)만 됩니다.');
if (target[2] === '8080' && __ENV.CONFIRM_PROD !== 'yes') {
  throw new Error('8080은 운영입니다. 사람이 적은 시간에 CONFIRM_PROD=yes를 함께 주세요.');
}
const mode = __ENV.PROFILE || 'smoke';
const plans = {
  smoke: { vus: 1, iterations: 3 },
  load: {
    stages: [
      { duration: '30s', target: 10 },
      { duration: '30s', target: 30 },
      { duration: '30s', target: 50 },
      { duration: '60s', target: 50 },
      { duration: '20s', target: 0 },
    ],
  },
  stress: {
    stages: [
      { duration: '30s', target: 50 },
      { duration: '60s', target: 100 },
      { duration: '60s', target: 150 },
      { duration: '60s', target: 200 },
      { duration: '30s', target: 0 },
    ],
  },
};
if (!plans[mode]) throw new Error('PROFILE은 smoke, load, stress 중 하나입니다.');

const throttled = new Counter('rate_limited_requests');
const serverErrors = new Counter('server_errors');
const routes = ['categories', 'question-list', 'question-detail', 'rank', 'lounge', 'membership', 'metrics'];

export const options = {
  ...plans[mode],
  thresholds: mode === 'stress' ? {
    // 한계를 찾는 실행이라 지연 기준은 두지 않고, 서버가 무너지기 시작하면 멈춘다
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '20s' }],
  } : {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    checks: ['rate>0.99'],
    server_errors: ['count==0'],
    rate_limited_requests: ['count==0'],
    ...Object.fromEntries(routes.map(name => [`http_req_duration{endpoint:${name}}`, ['p(95)<500']])),
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  userAgent: 'mycookie-k6-homeserver-load-test',
};

// VU 번호로 시험용 대역 안의 주소를 만든다(198.18.0.1 ~ 198.19.255.254)
const fakeIp = vu => `198.${18 + Math.floor(vu / 65025) % 2}.${Math.floor(vu / 255) % 255}.${vu % 255 || 1}`;

function get(path, endpoint, visitor) {
  const res = http.get(`${base}/api/v1${path}`, {
    headers: { 'X-Forwarded-For': fakeIp(__VU), ...(visitor ? { 'X-Visitor-Id': visitor } : {}) },
    tags: { endpoint },
    timeout: '10s',
    responseCallback: http.expectedStatuses(200),
  });
  if (res.status === 429) throttled.add(1);
  serverErrors.add(res.status >= 500 || res.status === 0 ? 1 : 0);
  return res;
}

export function setup() {
  const categories = get('/categories', 'setup');
  if (categories.status !== 200) throw new Error(`카테고리 조회 실패(${categories.status}). 서버가 떠 있는지 확인하세요.`);
  // 문제가 가장 많은 쪽을 고르지 않고, 문제가 있는 첫 카테고리를 쓴다
  for (const c of categories.json()) {
    const list = get(`/questions/category/${c.slug}`, 'setup');
    if (list.status === 200 && list.json().length) return { slug: c.slug, questionId: list.json()[0].id, run: `k6-${Date.now()}` };
  }
  throw new Error('문제가 있는 카테고리가 없습니다.');
}

export default function (fx) {
  const visitor = `${fx.run}-${__VU}`;
  const steps = [
    ['/categories', 'categories', r => Array.isArray(r.json()) && r.json().length > 0],
    [`/questions/category/${fx.slug}`, 'question-list', r => Array.isArray(r.json()) && r.json().length > 0],
    [`/questions/${fx.questionId}`, 'question-detail', r => r.json().id === fx.questionId],
    ['/rank/solved', 'rank', r => Array.isArray(r.json().top)],
    ['/lounge/messages', 'lounge', r => Array.isArray(r.json().messages)],
    ['/membership', 'membership', r => typeof r.json().tier === 'string'],
    ['/public/metrics', 'metrics', r => typeof r.json().visitors30d === 'number'],
  ];
  for (const [path, endpoint, valid] of steps) {
    const res = get(path, endpoint, visitor);
    check(res, { [`${endpoint}: 상태와 응답 모양`]: r => {
      if (r.status !== 200) return false;
      try { return valid(r); } catch { return false; }
    } });
  }
  sleep(1);
}

export function handleSummary(data) {
  const report = __ENV.REPORT_PATH || `load-tests/results/homeserver-${mode}.json`;
  const m = data.metrics;
  const failed = Object.entries(m).flatMap(([name, metric]) => Object.entries(metric.thresholds || {})
    .filter(([, t]) => !t.ok).map(([t]) => `${name}: ${t}`));
  const perRoute = Object.fromEntries(routes.map(r => [r, m[`http_req_duration{endpoint:${r}}`]?.values?.['p(95)']]));
  const summary = {
    mode, baseUrl: base,
    maxVus: m.vus_max?.values?.max,
    requests: m.http_reqs?.values?.count,
    rps: m.http_reqs?.values?.rate,
    durationMs: m.http_req_duration?.values,
    p95ByRoute: perRoute,
    failedRate: m.http_req_failed?.values?.rate,
    rateLimited: m.rate_limited_requests?.values?.count || 0,
    serverErrors: m.server_errors?.values?.count || 0,
    failedThresholds: failed,
  };
  return {
    [report]: JSON.stringify({ generatedAt: new Date().toISOString(), summary, ...data }, null, 2),
    stdout: `${JSON.stringify(summary, null, 2)}\n`,
  };
}
