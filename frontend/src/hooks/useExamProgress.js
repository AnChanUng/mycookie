import { useCallback, useEffect, useRef, useState } from 'react';
import { account, fetchRemote, onAccountChange, pushRemote, pushRemoteNow } from '../sync';

// marks: 북마크. 오답 기록(stats)과 별도로 저장해 한쪽이 유실돼도 다시 풀 문제를 찾을 수 있게 한다
const EMPTY = { stats: {}, history: [], marks: {}, updatedAt: 0 };
// 기록은 이 브라우저의 로컬 저장소에 두고, 동기화 계정에 로그인했으면 서버에도 함께 올린다.
// 예전 계정별 키(`:userId` 접미사)는 첫 로드 때 흡수한다
const localKey = (company, userId) => (userId ? `exam-progress:${company}:${userId}` : `exam-progress:${company}`);

function readLocal(company, userId) {
  try {
    const raw = localStorage.getItem(localKey(company, userId));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

function writeLocal(company, userId, data) {
  try {
    localStorage.setItem(localKey(company, userId), JSON.stringify(data));
  } catch {
    /* storage unavailable */
  }
}

// 두 기기의 기록을 합친다: 문제별로는 더 최근 풀이를, 응시 이력은 합집합을 남긴다
export function mergeProgress(a, b) {
  if (!a) return b;
  if (!b) return a;
  const stats = { ...a.stats };
  for (const [qid, s] of Object.entries(b.stats || {})) {
    if (!stats[qid] || (s.at || 0) > (stats[qid].at || 0)) stats[qid] = s;
  }
  const marks = { ...(a.marks || {}) };
  for (const [qid, m] of Object.entries(b.marks || {})) {
    if (!marks[qid] || (m.at || 0) > (marks[qid].at || 0)) marks[qid] = m;
  }
  const seen = new Set();
  const history = [...(a.history || []), ...(b.history || [])]
    .filter(h => {
      const key = `${h.at}:${h.mode}:${h.sec ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((x, y) => x.at - y.at)
    .slice(-200);
  return { stats, history, marks, updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0) };
}

// 예전에 로그인 상태로 저장된 계정별 기록이 남아 있으면 브라우저 기록과 합쳐서 가져온다
function absorbAccountRecords(company) {
  const prefix = `${localKey(company, null)}:`;
  let merged = readLocal(company, null);
  let found = false;
  try {
    for (const k of Object.keys(localStorage)) {
      if (!account()?.id || k !== `${prefix}${account().id}`) continue;
      try { merged = mergeProgress(merged, { ...EMPTY, ...JSON.parse(localStorage.getItem(k)) }); } catch { /* skip */ }
      localStorage.removeItem(k);
      found = true;
    }
  } catch {
    /* storage unavailable */
  }
  if (found) writeLocal(company, null, merged);
  return merged;
}

const hasRecords = (d) => !!d && (Object.keys(d.stats || {}).length > 0 || (d.history || []).length > 0 || Object.keys(d.marks || {}).length > 0);
const sameRecords = (a, b) => JSON.stringify([a?.stats || {}, a?.history || [], a?.marks || {}]) === JSON.stringify([b?.stats || {}, b?.history || [], b?.marks || {}]);

// 서버 기록을 받아 이 브라우저 기록과 합치고, 합친 결과가 서버와 다르면 다시 올린다. 합친 기록을 돌려준다
export async function syncProgress(company, { wait = false } = {}) {
  const user = account();
  if (!user) return null;
  const remote = await fetchRemote(company, user);
  if (account()?.token !== user.token) return null;
  const local = readLocal(company, null);
  const merged = remote ? mergeProgress(local, { ...EMPTY, ...remote }) : local;
  if (!sameRecords(merged, local)) writeLocal(company, null, merged);
  if (hasRecords(merged) && !sameRecords(merged, remote)) {
    if (wait && !await pushRemoteNow(company, merged)) throw new Error('기록이 기기에 보관되어 있습니다. 연결 후 다시 동기화해 주세요.');
    if (!wait) pushRemote(company, merged, 0);
  }
  return account()?.token === user.token ? merged : null;
}

// 모든 문제은행을 한꺼번에 맞춘다. 서버에 무리가 가지 않게 몇 개씩 나눠 부른다
export async function syncAllProgress(companies) {
  const token = account()?.token;
  let done = 0;
  const queue = [...companies];
  const worker = async () => {
    while (queue.length) {
      if (account()?.token !== token) throw new Error('계정이 바뀌어 동기화를 중단했습니다.');
      const key = queue.shift();
      const merged = await syncProgress(key, { wait: true });
      if (hasRecords(merged)) done++;
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return done;
}

export function useExamProgress(company) {
  const [state, setState] = useState(() => ({ company, data: absorbAccountRecords(company) }));
  if (state.company !== company) setState({ company, data: absorbAccountRecords(company) });
  const data = state.company === company ? state.data : EMPTY;
  const latest = useRef(data);
  useEffect(() => { latest.current = data; }, [data]);

  const save = useCallback((updater) => {
    const next = { ...(typeof updater === 'function' ? updater(latest.current) : updater), updatedAt: Date.now() };
    latest.current = next;
    writeLocal(company, null, next);
    pushRemote(company, next);
    setState(prev => (prev.company === company ? { ...prev, data: next } : prev));
  }, [company]);

  // Reconcile again after login, reconnect and return from another device.
  useEffect(() => {
    let alive = true, busy = false;
    const refresh = async () => {
      if (!account() || busy || globalThis.document?.visibilityState === 'hidden') return;
      busy = true;
      try {
        const merged = await syncProgress(company);
        if (!alive || !merged) return;
        // Answers entered while a GET was in flight must remain in the UI too.
        const next = mergeProgress(latest.current, merged);
        if (!sameRecords(next, latest.current)) {
          latest.current = next;
          writeLocal(company, null, next);
          setState(prev => prev.company === company ? { ...prev, data: next } : prev);
        }
      } catch { /* Continue with local records and retry on the next refresh. */ }
      finally { busy = false; }
    };
    void refresh();
    const off = onAccountChange(() => {
      // 로그인 전 계정의 메모리 기록을 새 계정의 서버 응답과 합치지 않는다.
      latest.current = readLocal(company, null);
      setState(prev => prev.company === company ? { ...prev, data: latest.current } : prev);
      void refresh();
    });
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    globalThis.document?.addEventListener?.('visibilitychange', refresh);
    const timer = setInterval(refresh, 30000);
    timer.unref?.();
    return () => {
      alive = false; off(); clearInterval(timer);
      window.removeEventListener('online', refresh);
      window.removeEventListener('focus', refresh);
      globalThis.document?.removeEventListener?.('visibilitychange', refresh);
    };
  }, [company]);

  return { data, save };
}

export const isMarked = (data, qid) => !!data.marks?.[qid]?.on;

// 해제도 시각과 함께 남겨서 다른 기기의 오래된 북마크가 되살아나지 않게 한다
export function toggleMark(marks, qid) {
  return { ...(marks || {}), [qid]: { on: !marks?.[qid]?.on, at: Date.now() } };
}

export function recordAnswer(stats, qid, correct) {
  const prev = stats[qid] || { c: 0, w: 0, last: null };
  return {
    ...stats,
    [qid]: { c: prev.c + (correct ? 1 : 0), w: prev.w + (correct ? 0 : 1), last: correct ? 'r' : 'w', at: Date.now() },
  };
}
