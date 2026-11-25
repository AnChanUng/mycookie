// 라운지 채팅 몰림 시나리오: 접속자 CLIENTS명이 실시간 연결(SSE)을 열고 입장한 뒤,
// SENDERS명이 RATE에 맞춰 메시지를 보내는 동안 "누가 무엇을 언제 받았는지"를 잰다.
//   연결 거부  : /lounge/stream이 200이 아닌 수(상한 초과 503 등)
//   유실률     : 연결돼 있던 접속자가 실시간으로 받아야 했던 (접속자, 메시지) 쌍 중 받지 못한 비율
//                (화면은 30초마다 목록을 다시 물어 가므로 결국 보이지만, 그만큼 늦게 보인다)
//   전달 시간  : 보낸 시각부터 접속자가 받은 시각까지(같은 머신 시계)
//   전송량     : 메시지 1개가 접속자 1명에게 보내질 때의 평균 바이트
// 로컬 loadtest 프로필 서버에만 보낸다(trust-forwarded-for=true로 띄워 접속자마다 다른 IP로 나눈다).
//   node load-tests/lounge-sse.mjs   (CLIENTS=300 SENDERS=25 SEND_EVERY_MS=2500 DURATION_S=60 SLOW=15)
const BASE = (process.env.BASE_URL || 'http://127.0.0.1:18080').replace(/\/$/, '');
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(BASE)) throw new Error('BASE_URL은 로컬 서버만 됩니다.');
const CLIENTS = Number(process.env.CLIENTS || 300);
const SLOW = Number(process.env.SLOW || 15);              // 읽기가 느린 접속자(휴대폰 데이터 흉내)
const SENDERS = Number(process.env.SENDERS || 25);
const SEND_EVERY_MS = Number(process.env.SEND_EVERY_MS || 2500); // 25명 × 2.5초 = 초당 10개
const DURATION_S = Number(process.env.DURATION_S || 60);
const RAMP_S = Number(process.env.RAMP_S || 10);
const LABEL = process.env.LABEL || 'run';
const API = `${BASE}/api/v1`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ip = n => `198.18.${Math.floor(n / 250)}.${(n % 250) + 1}`;
const run = Date.now().toString(36);

const sent = new Map();   // seq → 보낸 시각
const sendFail = {};
const clients = [];
let refused = 0, refusedReasons = {};

function parseEvents(buffer, onEvent) {
  let idx;
  while ((idx = buffer.indexOf('\n\n')) >= 0) {
    const raw = buffer.slice(0, idx); buffer = buffer.slice(idx + 2);
    let event = 'message', data = [];
    for (const line of raw.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    onEvent(event, data.join('\n'));
  }
  return buffer;
}

async function openClient(n, slow) {
  const c = { n, slow, seen: new Map(), bytes: 0, connectedAt: 0, closedAt: 0, events: 0 };
  const ac = new AbortController(); c.abort = () => ac.abort();
  try {
    const res = await fetch(`${API}/lounge/stream`, { headers: { 'X-Forwarded-For': ip(n), Accept: 'text/event-stream' }, signal: ac.signal });
    if (res.status !== 200) { refused++; refusedReasons[res.status] = (refusedReasons[res.status] || 0) + 1; await res.body?.cancel(); return null; }
    c.connectedAt = Date.now();
    clients.push(c);
    // 입장(참여자 목록에 이름 올리기)도 함께 몰린다
    fetch(`${API}/lounge/presence`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip(n) },
      body: JSON.stringify({ visitorId: `lt-${run}-v${n}`, nickname: `p${n}${run.slice(-4)}` }) }).catch(() => {});
    (async () => {
      const decoder = new TextDecoder(); let buf = '';
      try {
        for await (const chunk of res.body) {
          c.bytes += chunk.length;
          buf = parseEvents(buf + decoder.decode(chunk, { stream: true }), (event, data) => {
            c.events++;
            if (!data || event === 'heartbeat') return;
            let body; try { body = JSON.parse(data); } catch { return; }
            const rows = Array.isArray(body.messages) ? body.messages : body.message ? [body.message] : [];
            const now = Date.now();
            for (const m of rows) {
              const k = /^lt-[a-z0-9]+-(\d+)$/.exec(m.text || '');
              if (k && !c.seen.has(+k[1])) c.seen.set(+k[1], now);
            }
          });
          if (slow) await sleep(300);   // 느린 접속자: 받은 뒤 늦게 읽는다
        }
      } catch { /* 끊김 */ }
      c.closedAt = Date.now();
    })();
    return c;
  } catch { refused++; refusedReasons.error = (refusedReasons.error || 0) + 1; return null; }
}

async function sender(s, until) {
  let i = 0;
  while (Date.now() < until) {
    const seq = s * 100000 + (i++);
    const at = Date.now();
    try {
      const res = await fetch(`${API}/lounge/messages`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip(10000 + s) },
        body: JSON.stringify({ visitorId: `lt-${run}-s${s}`, nickname: `s${s}${run.slice(-4)}`, text: `lt-${run}-${seq}`, clientId: `${run}-${seq}` }) });
      if (res.ok) sent.set(seq, at); else { sendFail[res.status] = (sendFail[res.status] || 0) + 1; await res.body?.cancel(); }
    } catch (e) { const k = String(e.cause?.code || e.message).slice(0, 40); sendFail[k] = (sendFail[k] || 0) + 1; }
    await sleep(Math.max(0, SEND_EVERY_MS - (Date.now() - at)));
  }
}

const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

(async () => {
  const t0 = Date.now();
  const opens = [];
  for (let n = 0; n < CLIENTS; n++) {
    opens.push(openClient(n, n < SLOW));
    await sleep((RAMP_S * 1000) / CLIENTS);
  }
  await Promise.all(opens);
  await sleep(2000);
  const sendStart = Date.now();
  const until = sendStart + DURATION_S * 1000;
  await Promise.all(Array.from({ length: SENDERS }, (_, s) => sleep(s * SEND_EVERY_MS / SENDERS).then(() => sender(s, until))));
  await sleep(5000);   // 늦게 도착하는 것 기다리기
  const endAt = Date.now();

  // 받아야 했던 것: 연결돼 있던 동안 보낸 메시지
  let expected = 0, got = 0; const lat = [], latFast = [];
  for (const c of clients) {
    const closed = c.closedAt || endAt;
    for (const [seq, at] of sent) {
      if (at < c.connectedAt || at > closed - 1000) continue;
      expected++;
      const seen = c.seen.get(seq);
      if (seen) { got++; lat.push(seen - at); if (!c.slow) latFast.push(seen - at); }
    }
  }
  const msgs = sent.size;
  const dropped = clients.filter(c => c.closedAt && c.closedAt < endAt).length;
  const totalBytes = clients.reduce((a, c) => a + c.bytes, 0);
  const result = {
    label: LABEL, clients: CLIENTS, slow: SLOW, connected: clients.length, refused, refusedReasons,
    disconnectedDuringRun: dropped,
    messagesSent: msgs, sendFail, sendRatePerSec: +(msgs / DURATION_S).toFixed(2),
    lossRate: expected ? +(1 - got / expected).toFixed(4) : null, expected, received: got,
    latencyMs: { p50: pct(lat, 50), p95: pct(lat, 95), p99: pct(lat, 99), max: pct(lat, 100) },
    latencyMsNormalClients: { p50: pct(latFast, 50), p95: pct(latFast, 95), p99: pct(latFast, 99) },
    bytesPerClientPerMessage: msgs && clients.length ? Math.round(totalBytes / clients.length / msgs) : null,
    totalMB: +(totalBytes / 1048576).toFixed(1),
    elapsedS: Math.round((endAt - t0) / 1000),
  };
  console.log(JSON.stringify(result, null, 2));
  clients.forEach(c => c.abort());
  process.exit(0);
})();
