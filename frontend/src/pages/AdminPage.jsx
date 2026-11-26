import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { COMPANIES, EXAM_CATEGORIES, companyPath } from '../data/examQuestions';
import { account } from '../sync';

const KEY = 'admin-key';
const RANGES = [7, 30, 90];
const AUTO_SECONDS = 60;
const TABS = [['overview', '개요'], ['solves', '풀이'], ['visitors', '방문자'], ['security', '보안 · 크롤링'], ['reports', '제보'], ['chat', '채팅'], ['accounts', '계정 · 채점'], ['audit', '작업 기록'], ['mail', '메일'], ['system', '시스템']];
const REPORT_KINDS = { answer: '정답 오류', typo: '오타', explain: '해설 문제', etc: '기타' };
const MODES = { exam: '모의고사', set: '회차별 모의고사', unit: '단원별 문제집', practice: '영역별 연습', wrong: '오답 다시 풀기', marked: '북마크 다시 풀기', cpp: 'C++ 문제집', recall: '응시 후기 복원 문제' };

const PAGE_NAMES = {
  '/': '홈', '/exam': '기업별 기출문제', '/computer-general': '컴퓨터일반', '/topics': '주제별 통합', '/algo': '코테 풀이', '/duel': '대결', '/calc': '계산 문제 무한 연습', '/major': '필기이론',
  '/major-exam': '필기이론 문제', '/stats': '통계', '/search': '문제 검색', '/ncs': 'NCS', '/interview': '면접 연습', '/technical-interview': '기술면접 준비', '/ssafy': 'SSAFY',
  ...Object.fromEntries(EXAM_CATEGORIES.map(c => [`/exam/category/${c.key}`, `기업별 기출 · ${c.name}`])),
  ...Object.fromEntries(COMPANIES.map(c => [companyPath(c), c.name])),
};
// 내린 홈 코너(멘탈 기르기 · 오늘의 운세)의 예전 클릭 기록을 "최근 활동"에서 이름으로 보여 준다
const CORNERS = { '/fun/mental': '🧘 멘탈 기르기', '/fun/fortune': '🔮 오늘의 운세' };
const CORNER_BUTTONS = {
  '/fun/mental': { open: '열기', pass: '합격 맛보기', fail: '탈락 맛보기', comfort: '떨어졌을 때 보시오' },
  '/fun/fortune': { open: '열기', view: '생일 넣고 운세 보기' },
};
const cornerButton = (path, detail) => CORNER_BUTTONS[path]?.[detail] || detail || '';

const pageName = (path) => PAGE_NAMES[path] || path;
const companyName = (key) => COMPANIES.find(c => c.key === key)?.name || key;

const p2 = (n) => String(n).padStart(2, '0');
const fmtAt = (iso) => {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};
const fmtClock = (d) => `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

const fmtDur = (s) => (s == null ? '–' : s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);
const fmtUptime = (s) => {
  if (s >= 86400) return `${Math.floor(s / 86400)}일 ${Math.floor(s % 86400 / 3600)}시간`;
  if (s >= 3600) return `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분`;
  return fmtDur(s);
};
const pct = (score, total) => (total ? Math.round(score / total * 100) : null);

// 관리자 키는 이 기기에 기억해 둔다. 비공개 페이지 비밀번호만 넣으면 모니터링까지 바로 보이게 하려는 것이다.
// 공용 PC에서는 "이 기기에서 키 지우기"로 지운다
const savedKey = () => { try { return localStorage.getItem(KEY) || sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
const storeKey = (v) => { try { localStorage.setItem(KEY, v); } catch { /* 저장소를 못 쓰면 이번 화면에서만 쓴다 */ } };
const forgetKey = () => { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch { /* 무시 */ } };
// /admin은 ADMIN 권한 계정으로 로그인해서 연다(키 대신 로그인 토큰). 홈서버 스크립트처럼 키를 쓰는 길도 남겨 둔다
const LOGIN = '__login__';
const adminHeaders = key => (key === LOGIN ? (account()?.token ? { Authorization: `Bearer ${account().token}` } : {}) : { 'X-Admin-Key': key });

const HOME = { to: '/', label: '← 홈으로' };

export default function AdminPage({ back = HOME, viaLogin = false }) {
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/public/metrics', { timeout: 180000 })
      .then(res => { if (active) setMetrics(res.data); })
      .catch(() => { if (active) setMetricsError('공개 이용 통계를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'); });
    return () => { active = false; };
  }, []);
  return <>
    <section className="page-header" aria-label="공개 이용 통계">
      <h1>서비스 이용 현황</h1>
      <p>관리자 키 없이 확인할 수 있는 전체 집계입니다.</p>
      {metrics ? <>
        <div className="exam-stats">
          <Tile k="가입 계정" v={metrics.registeredAccounts} unit=" 개" sub="현재 등록된 계정 수" />
          <Tile k="오늘 방문자" v={metrics.todayVisitors} sub="오늘 0시부터 현재까지 · KST" />
          <Tile k="어제 방문자" v={metrics.yesterdayVisitors} sub="집계가 완료된 하루 · KST" />
          <Tile k="최근 30일 방문자" v={metrics.visitors30d} sub="기간 내 브라우저 ID 중복 제거" />
          <Tile k="최근 30일 최대 일간 방문자" v={metrics.peakDailyVisitors30d} sub="당일 진행 중 집계 포함" />
          <Tile k="최근 30일 조회수" v={metrics.pageViews30d ?? '–'} unit=" 회" sub="페이지 조회 이벤트 · 반복 조회 포함" />
          <Tile k="누적 조회수" v={metrics.totalPageViews ?? '–'} unit=" 회" sub="수집된 전체 페이지 조회 이벤트" />
          <Tile k="누적 풀이 완료" v={metrics.totalExamCompletions} unit=" 건" sub="문항 수가 아닌 풀이 완료 이벤트 수" />
        </div>
        <p className="exam-note">{metrics.from} ~ {metrics.through} · {new Date(metrics.asOf).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} KST 기준. 방문자는 페이지를 조회한 익명 브라우저 ID 기준으로, 가입자 수와 다릅니다. 기기 변경·브라우저 초기화 시 중복될 수 있으며 자동화 방문이 포함될 수 있습니다.</p>
      </> : <p role="status">{metricsError || '이용 통계를 불러오는 중입니다. 서버 시작에 1~2분 걸릴 수 있습니다.'}</p>}
    </section>
    <AdminControls back={back} viaLogin={viaLogin} />
  </>;
}

function AdminControls({ back, viaLogin }) {
  const [key, setKey] = useState(() => (viaLogin ? LOGIN : savedKey()));
  const [input, setInput] = useState('');
  const [days, setDays] = useState(30);
  const [tab, setTab] = useState('overview');
  const [auto, setAuto] = useState(false);
  const [tick, setTick] = useState(0);
  const [data, setData] = useState(null);
  const [sys, setSys] = useState(null);
  const [reports, setReports] = useState(null);
  const [chat, setChat] = useState(null);
  const [audit, setAudit] = useState(null);
  const [mailFailures, setMailFailures] = useState(null);
  const [dailyStats, setDailyStats] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(() => viaLogin || !!savedKey());

  useEffect(() => {
    if (!key) return;
    let stale = false;
    // 잠든 서버가 깨어나는 데 1~2분 걸릴 수 있다
    const options = { headers: adminHeaders(key), timeout: 180000 };
    // 계정·시스템 조회는 실패해도 이용 현황은 그대로 보여 준다
    api.get('/admin/system', options)
      .then(res => { if (!stale) setSys(res.data); })
      .catch(() => { if (!stale) setSys(null); });
    api.get('/admin/reports', options)
      .then(res => { if (!stale) setReports(res.data); })
      .catch(() => { if (!stale) setReports(null); });
    api.get('/admin/audit', options)
      .then(res => { if (!stale) setAudit(res.data); })
      .catch(() => { if (!stale) setAudit(null); });
    api.get('/admin/mail-failures', options)
      .then(res => { if (!stale) setMailFailures(res.data); })
      .catch(() => { if (!stale) setMailFailures(null); });
    api.get('/admin/daily-practice', options)
      .then(res => { if (!stale) setDailyStats(res.data); })
      .catch(() => { if (!stale) setDailyStats(null); });
    api.get('/admin/lounge/messages', options)
      .then(res => { if (!stale) setChat(res.data); })
      .catch(() => { if (!stale) setChat(null); });
    api.get('/admin/usage', { ...options, params: { days } })
      .then(res => { if (!stale) { setData(res.data); setUpdatedAt(new Date()); setError(''); } })
      .catch(err => {
        if (stale) return;
        const status = err.response?.status;
        if (status === 401 && key === LOGIN) {
          setError('관리자 권한이 없거나 로그인이 만료되었어요. 관리자 계정으로 다시 로그인해 주세요.');
        } else if (status === 401) {
          forgetKey();
          setKey('');
          setData(null);
          setSys(null);
          setReports(null);
          setChat(null);
          setError('관리자 키가 올바르지 않습니다.');
        } else if (status === 503) {
          setError('서버의 ADMIN_KEY 설정을 확인해 주세요. 관리자 키는 32자 이상의 무작위 값이어야 합니다.');
        } else {
          setError('서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      })
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [key, days, tick]);

  useEffect(() => {
    if (!auto || !key) return;
    const id = setInterval(() => setTick(t => t + 1), AUTO_SECONDS * 1000);
    return () => clearInterval(id);
  }, [auto, key]);

  const begin = () => { setLoading(true); setError(''); };

  const submit = (e) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    storeKey(v);
    begin();
    setKey(v);
    setInput('');
  };

  const logout = () => {
    forgetKey();
    setKey('');
    setData(null);
    setSys(null);
    setReports(null);
    setChat(null);
    setAuto(false);
  };

  if (!key) {
    return (
      <div className="fade-in">
        <div className="page-header">
          <Link to={back.to} className="back-link">{back.label}</Link>
          <h1>관리자</h1>
          <p>모니터링 화면을 보려면 서버 관리자 키를 입력하세요. 이 기기에서는 한 번만 입력하면 됩니다.</p>
        </div>
        <form className="admin-login" onSubmit={submit}>
          <input type="password" value={input} onChange={e => setInput(e.target.value)} placeholder="관리자 키" autoFocus autoComplete="off" />
          <button type="submit" className="exam-btn primary">확인</button>
        </form>
        {error && <p className="admin-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header exam-page-header">
        <Link to={back.to} className="back-link">{back.label}</Link>
        <div className="exam-toplinks">
          {RANGES.map(r => <button key={r} type="button" className={days === r ? 'on' : ''} onClick={() => { if (r !== days) { begin(); setDays(r); } }}>최근 {r}일</button>)}
          <button type="button" onClick={() => { begin(); setTick(t => t + 1); }}>{loading ? '불러오는 중' : '새로고침'}</button>
          <button type="button" className={auto ? 'on' : ''} onClick={() => setAuto(a => !a)}>자동 {auto ? '켜짐' : '꺼짐'}</button>
          {key !== LOGIN && <button type="button" onClick={logout}>이 기기에서 키 지우기</button>}
        </div>
        <h1>관리자 모니터링</h1>
        <p>
          익명 방문자 ID 기준 · 한국 시간 · 관리자 화면 열람은 집계에서 제외
          {updatedAt && ` · ${fmtClock(updatedAt)} 갱신`}
          {auto && ` · ${AUTO_SECONDS}초마다 자동 갱신`}
        </p>
      </div>

      {error && <p className="admin-error">{error}</p>}
      {loading && !data && <div className="loading"><div className="loading-spinner" />불러오는 중... 서버가 잠들어 있으면 1~2분 걸립니다</div>}

      {data && (
        <>
          <div className="major-tabs">
            {TABS.map(([k, name]) => (
              <button key={k} type="button" className={`major-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
                {name}{k === 'reports' && reports?.open ? ` ${reports.open}` : ''}{k === 'mail' && mailFailures?.last24h ? ` ${mailFailures.last24h}` : ''}
              </button>
            ))}
          </div>
          <Health sys={sys} />
          <QuickLinks links={sys?.links} />
          {tab === 'overview' && <Overview data={data} sys={sys} />}
          {tab === 'solves' && <Solves data={data} />}
          {tab === 'visitors' && <Visitors data={data} />}
          {tab === 'security' && <SecurityPanel adminKey={key} revision={tick} />}
          {tab === 'reports' && (reports
            ? <Reports reports={reports} adminKey={key} onChange={setReports} />
            : <p className="exam-note">제보 정보를 불러오지 못했습니다. 백엔드 배포가 끝난 뒤 새로고침해 주세요.</p>)}
          {tab === 'chat' && (chat
            ? <Chat chat={chat} adminKey={key} onChange={setChat} />
            : <p className="exam-note">채팅 글을 불러오지 못했습니다. 백엔드 배포가 끝난 뒤 새로고침해 주세요.</p>)}
          {tab === 'accounts' && <>
            <PrivateBankGrants adminKey={key} />
            <TierAdjust adminKey={key} />
            {sys ? <Accounts sys={sys} /> : <SysMissing />}
          </>}
          {tab === 'audit' && (audit ? <AuditLog rows={audit} /> : <p className="exam-note">작업 기록을 불러오지 못했습니다. 백엔드 배포가 끝난 뒤 새로고침해 주세요.</p>)}
          {tab === 'mail' && dailyStats && <DailyPracticeStats data={dailyStats} />}
          {tab === 'mail' && (mailFailures ? <MailFailures data={mailFailures} /> : <p className="exam-note">메일 발송 현황을 불러오지 못했습니다. 백엔드 배포가 끝난 뒤 새로고침해 주세요.</p>)}
          {tab === 'system' && (sys ? <System sys={sys} events={data.server.events} /> : <SysMissing />)}
        </>
      )}
    </div>
  );
}

function SecurityPanel({ adminKey, revision }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/security', { headers: adminHeaders(adminKey), signal: controller.signal, timeout: 90000 })
      .then(({ data }) => { if (!controller.signal.aborted) { setEvents(data); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [adminKey, revision]);
  const reasons = { DECLARED_AUTOMATION: '자동화 도구 표기 · 크롤링 가능성', ADMIN_DENIED: '관리자 접근 거부', PROBE: '민감 경로 탐색', RATE_AUTH: '로그인·가입 과다 요청', RATE_CONTENT: '질문 대량 조회', RATE_CODE: '코드 실행 과다 요청', RATE_CHAT: '챗봇 과다 요청', RATE_GENERAL: 'API 과다 요청' };
  return <section aria-label="보안 및 크롤링 의심 기록">
    <h2>보안 · 크롤링 의심 기록</h2>
    <p className="exam-note">새 백엔드 적용 이후 API 요청 중 탐색·과다 요청·자동화 도구 표기를 기록합니다. 최근 7일, 최신 200건을 표시하며 동일 IP·사유는 분당 한 번 표본으로 남깁니다. IP는 사람의 신원이 아니며, User-Agent도 위조할 수 있습니다.</p>
    <p className="exam-note">첫 HTML·정적 파일만 가져가는 요청은 Vercel의 프로젝트 Logs에서 경로·IP·User-Agent·요청 빈도를 함께 확인하세요. 과거 미수집 기록은 여기서 복원할 수 없습니다.</p>
    {error ? <p role="alert">보안 기록을 불러오지 못했습니다. 새 백엔드 배포 후 새로고침해 주세요.</p> : !events ? <p role="status">보안 기록을 불러오는 중…</p> : !events.length ? <p>기록된 의심 요청이 없습니다. 크롤링이 전혀 없었다는 의미는 아닙니다.</p> : <div className="exam-table-wrap"><table className="exam-table admin-table">
      <thead><tr><th>한국 시간</th><th>IP</th><th>사유</th><th>경로</th><th>응답</th><th>분당 API 요청</th><th>User-Agent</th></tr></thead>
      <tbody>{events.map(event => <tr key={event.id}><td>{new Date(event.occurredAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td><td>{event.ip}</td><td>{reasons[event.reason] || event.reason}</td><td>{event.method} {event.path}</td><td>{event.reason === 'DECLARED_AUTOMATION' ? '감지' : event.status}</td><td>{event.requestsInWindow || '—'}</td><td style={{ maxWidth: 280, overflowWrap: 'anywhere' }}>{event.userAgent}</td></tr>)}</tbody>
    </table></div>}
  </section>;
}

// 비공개 문제집 열람 권한. 닉네임으로 열어 주면 그 계정의 내 계정 메뉴에 "비공개 문제집"이 생기고 /private/banks가 열린다.
// 홈서버 작업 없이 여기서 주고 뺀다(관리자 · 주인 권한은 계속 홈서버에서만 준다)
function PrivateBankGrants({ adminKey }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [nickname, setNickname] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    api.get('/admin/private-bank', { headers: adminHeaders(adminKey), signal: controller.signal, timeout: 60000 })
      .then(({ data }) => { if (!controller.signal.aborted) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (!controller.signal.aborted) setError('목록을 불러오지 못했습니다. 백엔드 배포가 끝난 뒤 새로고침해 주세요.'); });
    return () => controller.abort();
  }, [adminKey]);

  const change = (name, grant) => {
    const target = name.trim();
    if (!target || busy) return;
    if (!grant && !window.confirm(`${target} 님의 비공개 문제집 권한을 뺄까요?`)) return;
    setBusy(true); setError(''); setDone('');
    api.post('/admin/private-bank', { nickname: target, grant }, { headers: adminHeaders(adminKey), timeout: 60000 })
      .then(({ data }) => {
        setRows(data.grants || []);
        setDone(grant ? `${data.nickname} 님에게 비공개 문제집을 열었어요. 그 계정이 새로고침하면 메뉴에 보여요.` : `${data.nickname} 님의 권한을 뺐어요.`);
        if (grant) setNickname('');
      })
      .catch(e => setError(e?.response?.data?.error || e?.response?.data?.message || '바꾸지 못했어요. 잠시 후 다시 시도해 주세요.'))
      .finally(() => setBusy(false));
  };

  return <section aria-label="비공개 문제집 권한">
    <div className="section-title">비공개 문제집 권한</div>
    <p className="exam-note">닉네임으로 열어 주면 그 계정의 내 계정 메뉴에 "비공개 문제집"이 생깁니다. 주인 계정은 항상 열려 있어 목록에 없습니다.</p>
    <form className="admin-filter" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }}
      onSubmit={e => { e.preventDefault(); change(nickname, true); }}>
      <input aria-label="권한을 줄 닉네임" placeholder="닉네임" maxLength={40} value={nickname} disabled={busy} onChange={e => setNickname(e.target.value)} />
      <button type="submit" className="exam-btn sm" disabled={busy || !nickname.trim()}>{busy ? '처리 중…' : '권한 주기'}</button>
    </form>
    {done && <p className="exam-note" role="status">{done}</p>}
    {error && <p role="alert">{error}</p>}
    {rows === null ? (!error && <p role="status">목록을 불러오는 중…</p>) : rows.length ? (
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>닉네임</th><th>연 날짜</th><th>빼기</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.nickname}>
            <td>{r.nickname}</td>
            <td>{fmtAt(r.grantedAt)}</td>
            <td><button type="button" className="exam-btn sm" disabled={busy} onClick={() => change(r.nickname, false)}>권한 빼기</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    ) : <p className="exam-note">아직 열어 준 계정이 없습니다.</p>}
  </section>;
}

// 등급 조정: 닉네임으로 지금 등급을 보고, 최소 등급(시험 · 구매로 생기는 "이 아래로 안 내려가는 등급")을 바꾸거나 지운다.
// 최소 등급이라 푼 문제 수가 더 높은 등급이면 그 등급으로 보인다. 바꾸면 관리자 작업 기록에 남는다
const ADJUST_TIERS = [['AUTO', '문제 수대로(최소 등급 지우기)'], ['BRONZE', '동 쿠키'], ['SILVER', '은 쿠키'], ['GOLD', '금 쿠키'], ['DIAMOND', '다이아 쿠키'], ['RUBY', '루비 쿠키']];
const DIVISION_LABELS = [[5, 'Ⅴ'], [4, 'Ⅳ'], [3, 'Ⅲ'], [2, 'Ⅱ'], [1, 'Ⅰ']];
function TierAdjust({ adminKey }) {
  const [nickname, setNickname] = useState('');
  const [current, setCurrent] = useState(null);
  const [tier, setTier] = useState('DIAMOND');
  const [division, setDivision] = useState(5);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const options = { headers: adminHeaders(adminKey), timeout: 60000 };
  const fail = e => setError(e?.response?.data?.error || e?.response?.data?.message || '처리하지 못했어요. 잠시 후 다시 시도해 주세요.');

  const lookup = () => {
    const name = nickname.trim();
    if (!name || busy) return;
    setBusy(true); setError(''); setMessage('');
    api.get('/admin/tier', { ...options, params: { nickname: name } })
      .then(({ data }) => setCurrent(data)).catch(e => { setCurrent(null); fail(e); }).finally(() => setBusy(false));
  };
  const apply = () => {
    if (!current || busy) return;
    const label = tier === 'AUTO' ? '문제 수대로' : `${ADJUST_TIERS.find(t => t[0] === tier)[1]} ${DIVISION_LABELS.find(d => d[0] === division)[1]}`;
    if (!window.confirm(`${current.nickname} 님의 등급을 "${label}"(으)로 바꿀까요?`)) return;
    setBusy(true); setError(''); setMessage('');
    api.post('/admin/tier', { nickname: current.nickname, tier, division: tier === 'AUTO' ? null : division }, options)
      .then(({ data }) => { setCurrent(data); setMessage(`${data.nickname} 님: ${data.before?.tierName} → ${data.tierName}`); })
      .catch(fail).finally(() => setBusy(false));
  };

  return <section aria-label="등급 조정" style={{ marginTop: 32 }}>
    <div className="section-title">등급 조정</div>
    <p className="exam-note">최소 등급(승급 시험 · 구매로 생긴 등급)을 바꾸거나 지웁니다. 푼 문제 수가 더 높은 등급에 해당하면 그 등급으로 보여요.</p>
    <form className="admin-filter" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }} onSubmit={e => { e.preventDefault(); lookup(); }}>
      <input aria-label="등급을 조정할 닉네임" placeholder="닉네임" maxLength={40} value={nickname} disabled={busy} onChange={e => setNickname(e.target.value)} />
      <button type="submit" className="exam-btn sm" disabled={busy || !nickname.trim()}>조회</button>
    </form>
    {current && <>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>닉네임</th><th>지금 등급</th><th>푼 문제</th><th>최소 등급</th></tr></thead>
          <tbody><tr><td>{current.nickname}</td><td>{current.tierName}</td><td className="num">{Number(current.solvedCount).toLocaleString()}</td><td>{current.floor || '없음'}</td></tr></tbody>
        </table>
      </div>
      <div className="admin-filter" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '10px 0' }}>
        <select aria-label="바꿀 등급" value={tier} disabled={busy} onChange={e => setTier(e.target.value)}>
          {ADJUST_TIERS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        {tier !== 'AUTO' && <select aria-label="바꿀 단계" value={division} disabled={busy} onChange={e => setDivision(Number(e.target.value))}>
          {DIVISION_LABELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>}
        <button type="button" className="exam-btn sm" disabled={busy} onClick={apply}>{busy ? '처리 중…' : '등급 바꾸기'}</button>
      </div>
    </>}
    {message && <p className="exam-note" role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </section>;
}

function SysMissing() {
  return <p className="exam-note">계정·시스템 정보를 불러오지 못했습니다. 백엔드가 아직 이전 버전이면 배포가 끝난 뒤 새로고침해 주세요.</p>;
}

// 어느 탭에서든 한 줄로 보이는 상태 표시
function Health({ sys }) {
  if (!sys) return null;
  const mem = sys.server.memoryMaxMb ? sys.server.memoryUsedMb / sys.server.memoryMaxMb : 0;
  const items = [
    ['cloud', `서버 가동 ${fmtUptime(sys.server.uptimeSeconds)}`],
    [sys.database.up ? 'cloud' : 'error', sys.database.up ? `DB 정상 · ${sys.database.pingMs}ms` : 'DB 연결 실패'],
    [mem > 0.85 ? 'error' : 'cloud', `메모리 ${Math.round(mem * 100)}%`],
    [!sys.chat.geminiConfigured ? '' : sys.chat.geminiErrors ? 'error' : 'cloud',
      !sys.chat.geminiConfigured ? 'Gemini 키 없음 (챗봇은 검색 답변만)' : sys.chat.geminiErrors ? `Gemini 오류 ${sys.chat.geminiErrors}회` : 'Gemini 정상'],
    [sys.slackEnabled ? 'cloud' : 'off', sys.slackEnabled ? 'Slack 알림 켜짐' : 'Slack 알림 꺼짐'],
  ];
  return (
    <div className="admin-health">
      {items.map(([state, label]) => <span key={label} className={`exam-sync ${state}`}><i />{label}</span>)}
    </div>
  );
}

function Overview({ data, sys }) {
  const maxViews = Math.max(1, ...data.daily.map(d => d.views));
  const maxHour = Math.max(1, ...data.hours);
  const deviceTotal = data.devices.reduce((n, d) => n + d.count, 0);
  const mobile = data.devices.find(d => d.device === 'mobile')?.count || 0;
  return (
    <>
      <div className="exam-stats">
        <Tile k="지금 공부 중" v={data.studying ?? data.active} sub="화면을 열어 둔 방문자 (헤더에도 표시됨)" />
        <Tile k="최근 5분 활동" v={data.active} sub="페이지를 옮기거나 풀이를 끝낸 방문자" />
        <Tile k="오늘 방문자" v={data.today.visitors} sub={`조회 ${data.today.views} · 풀이 ${data.today.exams}`} />
        <Tile k="오늘 신규 방문자" v={data.newToday} sub={`재방문 ${Math.max(0, data.today.visitors - data.newToday)}명`} />
      </div>

      <div className="exam-stats">
        <Tile k="최근 7일 방문자" v={data.week.visitors} sub={`조회 ${data.week.views} · 풀이 ${data.week.exams}`} />
        <Tile k={`최근 ${data.days}일 방문자`} v={data.range.visitors} sub={`조회 ${data.range.views} · 풀이 ${data.range.exams}`} />
        <Tile k="누적 방문자" v={data.all.visitors} sub={`조회 ${data.all.views} · 풀이 ${data.all.exams}`} />
        <Tile k="모바일 비율" v={deviceTotal ? Math.round(mobile / deviceTotal * 100) : '–'} unit=" %" sub={`최근 ${data.days}일 · 모바일 ${mobile}명 · PC ${deviceTotal - mobile}명`} />
      </div>

      {sys && (
        <div className="exam-stats">
          <Tile k="계정" v={sys.accounts.total} sub={`최근 24시간 가입 ${sys.accounts.joined24h} · 7일 ${sys.accounts.joined7d}`} />
          <Tile k="면접 답변 채점" v={sys.grading.total} unit=" 건" sub={`최근 24시간 ${sys.grading.last24h} · 7일 ${sys.grading.last7d}`} />
          <Tile k="채점 평균" v={sys.grading.avgScore ?? '–'} unit=" 점" sub="전체 채점 기록 기준" />
          <Tile k="챗봇 응답" v={sys.chat.aiReplies + sys.chat.fallbackReplies} unit=" 회" sub="서버가 마지막으로 깨어난 뒤부터" />
        </div>
      )}

      <div className="section-title">일별 추이</div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>날짜</th><th>방문자</th><th>조회</th><th>풀이 완료</th><th className="admin-barcol">조회 추이</th></tr></thead>
          <tbody>
            {data.daily.slice().reverse().map(d => (
              <tr key={d.day}>
                <td>{d.day}</td>
                <td className="num">{d.visitors}</td>
                <td className="num">{d.views}</td>
                <td className="num">{d.exams}</td>
                <td className="admin-barcol"><Bar ratio={d.views / maxViews} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">시간대별 열람 (한국 시간)</div>
      <div className="admin-hours">
        {data.hours.map((n, h) => (
          <div key={h} className="admin-hour" title={`${h}시 · ${n}회`}>
            <span className="admin-hour-bar"><i style={{ height: `${Math.round(n / maxHour * 100)}%` }} /></span>
            <span className="admin-hour-label">{h}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Solves({ data }) {
  return (
    <>
      <div className="section-title">풀이 기록</div>
      {data.solves.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>시각</th><th>방문자</th><th>문제은행</th><th>방식</th><th>점수</th><th>정답률</th><th>소요</th><th>기기</th></tr></thead>
            <tbody>
              {data.solves.map((r, i) => (
                <tr key={i}>
                  <td>{fmtAt(r.at)}</td>
                  <td className="num">{r.visitor}</td>
                  <td>{pageName(r.path)}</td>
                  <td>{MODES[r.detail] || r.detail || ''}</td>
                  <td className="num">{r.total ? `${r.score} / ${r.total}` : '–'}</td>
                  <td className="num">{r.total ? `${pct(r.score, r.total)}%` : '–'}</td>
                  <td className="num">{fmtDur(r.seconds)}</td>
                  <td>{r.device === 'mobile' ? '모바일' : r.device === 'desktop' ? 'PC' : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 풀이 기록이 없습니다.</p>}
      <p className="exam-note">점수는 이 기능이 배포된 뒤의 풀이부터 기록됩니다. 그 전 기록은 점수 없이 "–"로 나옵니다.</p>

      <div className="section-title">문제은행별 평균 점수</div>
      {data.scores.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>문제은행</th><th>방식</th><th>풀이</th><th>방문자</th><th>평균 정답률</th><th>평균 소요</th></tr></thead>
            <tbody>
              {data.scores.map((r, i) => (
                <tr key={i}>
                  <td>{pageName(r.path)}</td>
                  <td>{MODES[r.detail] || r.detail || ''}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{r.visitors}</td>
                  <td className="num">{r.avgPercent}%</td>
                  <td className="num">{fmtDur(r.avgSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">점수가 기록된 풀이가 아직 없습니다.</p>}

      <div className="section-title">풀이 완료가 많은 문제은행</div>
      <PathTable rows={data.exams} countLabel="풀이 완료" empty="아직 풀이 기록이 없습니다." />
    </>
  );
}

function Visitors({ data }) {
  return (
    <>
      <div className="section-title">방문자별 현황</div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>방문자</th><th>열람</th><th>풀이</th><th>평균 정답률</th><th>첫 방문</th><th>마지막 활동</th></tr></thead>
          <tbody>
            {data.visitors.map(v => (
              <tr key={v.visitor + v.firstAt}>
                <td className="num">{v.visitor}</td>
                <td className="num">{v.views}</td>
                <td className="num">{v.exams}</td>
                <td className="num">{v.avgPercent == null ? '–' : `${v.avgPercent}%`}</td>
                <td>{fmtAt(v.firstAt)}</td>
                <td>{fmtAt(v.lastAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="exam-note">최근 {data.days}일 안에 활동한 방문자 중 마지막 활동이 최근인 순서로 50명까지 보여줍니다.</p>

      <div className="section-title">유입 경로</div>
      {data.referrers.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>들어온 곳</th><th>횟수</th></tr></thead>
            <tbody>
              {data.referrers.map(r => <tr key={r.referrer}><td>{r.referrer}</td><td className="num">{r.count}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">다른 사이트에서 들어온 기록이 아직 없습니다. 주소를 직접 입력하거나 메신저 앱에서 연 경우는 잡히지 않습니다.</p>}

      <div className="section-title">많이 본 페이지</div>
      <PathTable rows={data.pages} countLabel="조회" empty="아직 기록이 없습니다." />

      <div className="section-title">최근 활동</div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>시각</th><th>방문자</th><th>종류</th><th>페이지</th></tr></thead>
          <tbody>
            {data.recent.map((r, i) => (
              <tr key={i}>
                <td>{fmtAt(r.at)}</td>
                <td className="num">{r.visitor}</td>
                <td>{r.type === 'exam' ? `풀이 완료 · ${MODES[r.detail] || r.detail || ''}${r.total ? ` · ${r.score}/${r.total}` : ''}` : r.type === 'click' ? `버튼 · ${cornerButton(r.path, r.detail)}` : '열람'}</td>
                <td>{CORNERS[r.path] || pageName(r.path)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Reports({ reports, adminKey, onChange }) {
  const [busy, setBusy] = useState(0);

  const mark = (item) => {
    setBusy(item.id);
    api.post(`/admin/reports/${item.id}`, { handled: !item.handled }, { headers: adminHeaders(adminKey), timeout: 60000 })
      .then(res => onChange({
        ...reports,
        open: reports.open + (res.data.handled ? -1 : 1),
        items: reports.items.map(r => (r.id === item.id ? res.data : r)),
      }))
      .catch(() => {})
      .finally(() => setBusy(0));
  };

  return (
    <>
      <div className="exam-stats">
        <Tile k="처리할 제보" v={reports.open} unit=" 건" sub="아직 확인하지 않은 제보" />
        <Tile k="최근 7일" v={reports.last7d} unit=" 건" sub="이 기간에 들어온 제보" />
        <Tile k="전체 제보" v={reports.total} unit=" 건" sub="처리한 것까지 모두" />
      </div>

      <div className="section-title">제보 목록</div>
      {reports.items.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>시각</th><th>문제은행</th><th>문제</th><th>종류</th><th>내용</th><th>처리</th></tr></thead>
            <tbody>
              {reports.items.map(r => (
                <tr key={r.id} className={r.handled ? 'admin-done' : ''}>
                  <td>{fmtAt(r.at)}</td>
                  <td>{pageName(r.path)}</td>
                  <td className="num" title={r.questionText || ''}>{r.questionId}</td>
                  <td>{REPORT_KINDS[r.kind] || r.kind}</td>
                  <td className="admin-msg">{r.message || '–'}</td>
                  <td>
                    <button type="button" className="exam-btn sm" disabled={busy === r.id} onClick={() => mark(r)}>
                      {r.handled ? '되돌리기' : '처리함'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 들어온 제보가 없습니다.</p>}
      <p className="exam-note">문제 ID에 마우스를 올리면 지문 앞부분이 보입니다. 같은 문제에 처리 안 된 제보가 있으면 중복 제보는 쌓이지 않습니다.</p>

      {reports.top.length > 0 && (
        <>
          <div className="section-title">제보가 많은 문제</div>
          <div className="exam-table-wrap">
            <table className="exam-table admin-table">
              <thead><tr><th>문제</th><th>문제은행</th><th>제보</th></tr></thead>
              <tbody>
                {reports.top.map(r => (
                  <tr key={`${r.path}:${r.questionId}`}>
                    <td className="num">{r.questionId}</td>
                    <td>{pageName(r.path)}</td>
                    <td className="num">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// 채팅방에 올라온 글. 부적절한 글은 여기서 지운다
function Chat({ chat, adminKey, onChange }) {
  const [busy, setBusy] = useState(0);

  const remove = (item) => {
    setBusy(item.id);
    api.delete(`/admin/lounge/messages/${item.id}`, { headers: adminHeaders(adminKey), timeout: 60000 })
      .then(() => onChange(chat.filter(m => m.id !== item.id)))
      .catch(() => {})
      .finally(() => setBusy(0));
  };

  if (!chat.length) return <p className="exam-note">아직 올라온 채팅이 없습니다.</p>;

  return (
    <>
      <div className="section-title">최근 채팅 {chat.length}건</div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>시각</th><th>방문자</th><th>닉네임</th><th>내용</th><th>삭제</th></tr></thead>
          <tbody>
            {chat.map(m => (
              <tr key={m.id}>
                <td>{fmtAt(m.at)}</td>
                <td className="num">{m.visitor}</td>
                <td>{m.nickname}</td>
                <td className="admin-msg">{m.text}</td>
                <td><button type="button" className="exam-btn sm" disabled={busy === m.id} onClick={() => remove(m)}>삭제</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="exam-note">지운 글은 열려 있는 채팅 창에서도 몇 초 안에 사라집니다. 30일이 지난 글은 자동으로 정리됩니다.</p>
    </>
  );
}

const SORTS = {
  joined: ['가입 최신순', (a, b) => (b.id || 0) - (a.id || 0)],
  login: ['마지막 로그인순', (a, b) => String(b.lastLoginAt || '').localeCompare(String(a.lastLoginAt || ''))],
  studied: ['학습 문제 많은 순', (a, b) => (b.studied || 0) - (a.studied || 0)],
  answers: ['채점 많은 순', (a, b) => (b.answers || 0) - (a.answers || 0)],
};

const TIER_LABELS = { BRONZE: '동', SILVER: '은', GOLD: '금', DIAMOND: '다이아', RUBY: '루비' };

// 관리자 페이지 바로가기. 서버가 알려 준 주소만 보여 준다(Grafana는 서버의 GRAFANA_URL을 설정해야 나온다)
function QuickLinks({ links }) {
  if (!links) return null;
  return (
    <p className="exam-note admin-links" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
      <strong>바로가기</strong>
      {links.grafana
        ? <a href={links.grafana} target="_blank" rel="noopener noreferrer">Grafana 모니터링 열기</a>
        : <span>Grafana 주소 미설정(서버 GRAFANA_URL)</span>}
      {links.repo && <a href={links.repo} target="_blank" rel="noopener noreferrer">GitHub 저장소</a>}
    </p>
  );
}

// 관리자 작업 기록(계정 생성, 권한 부여 등). 비밀번호와 키는 남기지 않는다
function AuditLog({ rows }) {
  return (
    <>
      <div className="section-title">관리자 작업 기록</div>
      {rows.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>시각</th><th>누가</th><th>작업</th><th>대상</th></tr></thead>
            <tbody>
              {rows.map((r, i) => <tr key={i}><td>{fmtAt(r.at)}</td><td>{r.actor}</td><td>{r.action}</td><td>{r.target || '–'}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 기록된 작업이 없습니다.</p>}
      <p className="exam-note">최근 100개까지 보여 줍니다. 계정 생성과 권한 부여·회수가 기록됩니다.</p>
    </>
  );
}

// 학습 메일 연습 반응: 메일 버튼을 눌러 연습 화면을 연 횟수와 5문제를 끝까지 푼 비율(개인 정보 없이 횟수만 센다)
function DailyPracticeStats({ data }) {
  return (
    <>
      <div className="section-title">학습 메일 연습 반응</div>
      <div className="exam-stats">
        <Tile k="연습 화면 열기" v={data.opens} unit=" 회" sub="메일 버튼을 눌러 들어온 수에 가까움" />
        <Tile k="끝까지 풀기" v={data.finishes} unit=" 회" sub="5문제를 풀고 결과를 본 수" />
        <Tile k="완주율" v={data.rate ?? '–'} unit={data.rate == null ? '' : ' %'} sub="끝까지 푼 수 ÷ 연 수" />
      </div>
      {data.sets.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>세트</th><th>주제</th><th>열기</th><th>끝까지</th><th>완주율</th></tr></thead>
            <tbody>
              {data.sets.map(r => <tr key={r.day}><td className="num">{r.day}</td><td>{r.theme}</td><td className="num">{r.opens}</td><td className="num">{r.finishes}</td><td className="num">{r.rate == null ? '–' : `${r.rate}%`}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 연습 화면을 연 사람이 없습니다.</p>}
      <p className="exam-note">같은 사람이 여러 번 열면 그만큼 늘어납니다. 구독자 수가 적을 때는 숫자가 크게 흔들립니다.</p>
    </>
  );
}

// 메일 발송 실패 현황: 최근 실패 건수와 어떤 메일(받는 주소 · 종류 · 제목)이 왜 실패했는지
function MailFailures({ data }) {
  const kinds = Object.entries(data.byKind || {});
  return (
    <>
      <div className="section-title">메일 발송 실패</div>
      <div className="exam-stats">
        <Tile k="최근 24시간" v={data.last24h} unit=" 건" sub="실패한 메일 수" />
        <Tile k="최근 7일" v={data.last7d} unit=" 건" sub="실패한 메일 수" />
        <Tile k="최근 30일" v={data.last30d} unit=" 건" sub={kinds.length ? kinds.map(([kind, n]) => `${kind} ${n}`).join(' · ') : '실패 없음'} />
      </div>
      {data.recent.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>시각</th><th>종류</th><th>받는 주소</th><th>제목</th><th>원인</th></tr></thead>
            <tbody>
              {data.recent.map((r, i) => <tr key={i}><td>{fmtAt(r.at)}</td><td>{r.kind}</td><td>{r.to}</td><td>{r.subject}</td><td>{r.reason}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">최근 30일 동안 발송에 실패한 메일이 없습니다.</p>}
      <p className="exam-note">최근 100건까지 보여 줍니다. 실패한 학습 메일은 보낸 것으로 치지 않고 같은 날 10시에 한 번 더 시도하며, 3번 연속 실패하면 그날은 쉬고 다음 평일에 다시 시도합니다. 실패 기록은 30일 뒤 지워집니다.</p>
    </>
  );
}

function Accounts({ sys }) {
  const { accounts, grading, examSync } = sys;
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('joined');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.users.filter(u => !q || String(u.nickname).toLowerCase().includes(q)).sort(SORTS[sort][1]);
  }, [accounts.users, query, sort]);
  const maxGrade = Math.max(1, ...Object.values(grading.grades));
  return (
    <>
      <div className="exam-stats">
        <Tile k="계정" v={accounts.total} sub={`최근 24시간 가입 ${accounts.joined24h} · 7일 ${accounts.joined7d}`} />
        <Tile k="살아 있는 로그인" v={accounts.sessions} unit=" 개" sub="로그아웃하지 않은 기기 수" />
        <Tile k="면접 답변 채점" v={grading.total} unit=" 건" sub={`로그인 없이 ${grading.anonymous}건`} />
        <Tile k="채점 평균" v={grading.avgScore ?? '–'} unit=" 점" sub={`최근 24시간 ${grading.last24h}건 · 7일 ${grading.last7d}건`} />
      </div>

      <div className="section-title">계정 목록</div>
      <div className="admin-filter" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '0 0 10px' }}>
        <input type="search" aria-label="닉네임 검색" placeholder="닉네임 검색" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="정렬" value={sort} onChange={e => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <span className="exam-note" role="status">{query.trim() ? `${accounts.users.length}명 중 ${shown.length}명` : `${accounts.users.length}명`}</span>
      </div>
      {accounts.users.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>닉네임</th><th>등급</th><th>가입</th><th>마지막 로그인</th><th>로그인 기기</th><th>학습 문제</th><th>북마크</th><th>채점</th><th>채점 평균</th><th>기출 저장</th><th>마지막 기출 저장</th></tr></thead>
            <tbody>
              {shown.map(u => (
                <tr key={u.id}>
                  <td>{u.nickname}</td>
                  <td>{TIER_LABELS[u.tier] || '–'}</td>
                  <td>{fmtAt(u.joinedAt)}</td>
                  <td>{fmtAt(u.lastLoginAt)}</td>
                  <td className="num">{u.sessions}</td>
                  <td className="num">{u.studied}</td>
                  <td className="num">{u.bookmarks}</td>
                  <td className="num">{u.answers}</td>
                  <td className="num">{u.avgScore == null ? '–' : u.avgScore}</td>
                  <td className="num">{u.examBanks}</td>
                  <td>{fmtAt(u.lastExamSaveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 가입한 계정이 없습니다.</p>}
      {accounts.users.length > 0 && shown.length === 0 && <p className="exam-note">검색 결과가 없습니다.</p>}
      <p className="exam-note">최근에 가입한 순서로 200명까지 보여줍니다. 마지막 로그인은 로그아웃하지 않은 기기 기준이라, 모두 로그아웃한 계정은 "–"로 나옵니다.</p>

      <div className="section-title">기출 풀이 기록을 계정에 저장한 문제은행</div>
      {examSync.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>문제은행</th><th>계정 수</th></tr></thead>
            <tbody>
              {examSync.map(r => <tr key={r.company}><td>{companyName(r.company)}</td><td className="num">{r.count}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 계정에 저장된 기출 풀이 기록이 없습니다.</p>}

      <div className="section-title">면접 답변 채점 등급 분포</div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>등급</th><th>건수</th><th className="admin-barcol">분포</th></tr></thead>
          <tbody>
            {Object.entries(grading.grades).map(([g, n]) => (
              <tr key={g}>
                <td>{g}</td>
                <td className="num">{n}</td>
                <td className="admin-barcol"><Bar ratio={n / maxGrade} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">최근 채점</div>
      {grading.recent.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>시각</th><th>닉네임</th><th>문제</th><th>점수</th></tr></thead>
            <tbody>
              {grading.recent.map((r, i) => (
                <tr key={i}>
                  <td>{fmtAt(r.at)}</td>
                  <td>{r.nickname || '비로그인'}</td>
                  <td>{r.question}</td>
                  <td className="num">{r.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 채점 기록이 없습니다.</p>}

      <div className="section-title">채점이 많은 문제</div>
      {grading.topQuestions.length ? (
        <div className="exam-table-wrap">
          <table className="exam-table admin-table">
            <thead><tr><th>문제</th><th>채점</th><th>평균 점수</th></tr></thead>
            <tbody>
              {grading.topQuestions.map(r => (
                <tr key={r.question}>
                  <td>{r.question}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{r.avgScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="exam-note">아직 채점 기록이 없습니다.</p>}
    </>
  );
}

const TABLE_NAMES = {
  users: '계정', auth_tokens: '로그인 토큰', usage_events: '이용 기록 (열람 + 풀이 완료)', answers: '면접 답변 채점',
  exam_progress: '기출 풀이 저장', user_question_progress: '문제별 학습 · 북마크', questions: '면접 문제', categories: '면접 카테고리',
};

function System({ sys, events }) {
  const { server, database, chat } = sys;
  const maxRows = Math.max(1, ...Object.values(database.tables));
  return (
    <>
      <div className="section-title">서버</div>
      <div className="exam-stats">
        <Tile k="서버 가동 시간" v={fmtUptime(server.uptimeSeconds)} unit="" sub={`${fmtAt(server.startedAt)}에 깨어남 · Render 무료 서버는 쉬다가 깨어나면 0부터 다시 셉니다`} />
        <Tile k="메모리 사용" v={server.memoryUsedMb} unit=" MB" sub={`최대 ${server.memoryMaxMb} MB`} />
        <Tile k="스레드" v={server.threads} unit=" 개" sub={`CPU ${server.processors}개${server.loadAverage == null ? '' : ` · 부하 ${server.loadAverage}`}`} />
        <Tile k="Java" v={server.java} unit="" sub="실행 중인 JVM 버전" />
      </div>

      <div className="section-title">데이터베이스</div>
      <div className="exam-stats">
        <Tile k="연결" v={database.up ? '정상' : '실패'} unit="" sub={database.up ? `응답 ${database.pingMs}ms` : 'select 1 이 실패했습니다'} />
        <Tile k="DB 크기" v={database.sizeMb ?? '–'} unit=" MB" sub="Neon 무료 요금제 한도는 0.5 GB" />
        <Tile k="이용 기록" v={events} unit=" 건" sub="열람 + 풀이 완료 전체" />
      </div>
      <div className="exam-table-wrap">
        <table className="exam-table admin-table">
          <thead><tr><th>테이블</th><th>내용</th><th>행 수</th><th className="admin-barcol">비중</th></tr></thead>
          <tbody>
            {Object.entries(database.tables).map(([name, rows]) => (
              <tr key={name}>
                <td className="num">{name}</td>
                <td>{TABLE_NAMES[name] || ''}</td>
                <td className="num">{rows}</td>
                <td className="admin-barcol"><Bar ratio={rows / maxRows} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-title">쿠키 도우미</div>
      <div className="exam-stats">
        <Tile k="AI 응답" v={chat.aiReplies} unit=" 회" sub={chat.geminiConfigured ? 'Gemini가 답한 횟수' : 'GEMINI_API_KEY가 설정되지 않았습니다'} />
        <Tile k="검색 답변" v={chat.fallbackReplies} unit=" 회" sub="Gemini 없이 문제 검색으로 답한 횟수" />
        <Tile k="Gemini 오류" v={chat.geminiErrors} unit=" 회" sub={chat.lastErrorAt ? `마지막 ${fmtAt(chat.lastErrorAt)} · ${chat.lastError}` : '오류 없음'} />
        <Tile k="전체 응답" v={chat.aiReplies + chat.fallbackReplies} unit=" 회" sub={`마지막 대화 ${fmtAt(chat.lastChatAt)} · 내용은 저장하지 않습니다`} />
      </div>
      <p className="exam-note">챗봇 숫자는 메모리에만 있어서 서버가 다시 깨어나면 0부터 셉니다.</p>
    </>
  );
}

function Bar({ ratio }) {
  return <span className="admin-bar"><i style={{ width: `${Math.round(ratio * 100)}%` }} /></span>;
}

function Tile({ k, v, sub, unit = ' 명' }) {
  return (
    <div className="exam-stat">
      <div className="k">{k}</div>
      <div className="v">{v}<small>{unit}</small></div>
      <div className="admin-sub">{sub}</div>
    </div>
  );
}

function PathTable({ rows, countLabel, empty }) {
  if (!rows.length) return <p className="exam-note">{empty}</p>;
  return (
    <div className="exam-table-wrap">
      <table className="exam-table admin-table">
        <thead><tr><th>페이지</th><th>{countLabel}</th><th>방문자</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.path}>
              <td>{pageName(r.path)}</td>
              <td className="num">{r.count}</td>
              <td className="num">{r.visitors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
