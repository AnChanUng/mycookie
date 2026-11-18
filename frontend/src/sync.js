import api from './api';
import { visitorId } from './track';

// 기기 간 동기화 계정(닉네임 + 비밀번호). 로그인하지 않아도 사이트는 그대로 쓸 수 있고,
// 로그인하면 풀이 기록을 서버에 함께 저장해 다른 기기에서 이어서 본다
const KEY = 'sync:account';
const EVENT = 'sync:change';

export function account() {
  try {
    const a = JSON.parse(localStorage.getItem(KEY));
    return a?.token ? a : null;
  } catch {
    return null;
  }
}

function setAccount(value) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(EVENT));
}

// 로그인 상태가 바뀔 때 화면을 다시 그리게 한다
export function onAccountChange(listener) {
  window.addEventListener(EVENT, listener);
  const storageChange = event => { if (event.key === KEY || event.key === null) listener(); };
  window.addEventListener('storage', storageChange);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', storageChange);
  };
}

// 무료 서버가 잠들어 있으면 깨어나는 데 1분쯤 걸려서 넉넉히 기다린다
const auth = () => ({ headers: { Authorization: `Bearer ${account()?.token}` }, timeout: 90000 });

// mode: 'login' | 'register'
export async function signIn(mode, nickname, password) {
  const { data } = await api.post(`/auth/${mode}`, { nickname, password }, { timeout: 90000, headers: { 'X-Visitor-Id': visitorId() } });
  setAccount({ id: data.id, nickname: data.nickname, token: data.token });
}

// ===== 소셜(구글 · 카카오) · 깃허브 로그인 =====
// 처음 들어온 소셜 계정은 기존 닉네임 + 비밀번호를 한 번 입력해 연결하면, 그 계정의 학습 기록을 그대로 쓴다
export const OAUTH_LABELS = { google: '구글', kakao: '카카오', github: '깃허브' };
const OAUTH_STATE = 'oauth:state';
const callbackUri = () => `${window.location.origin}/auth/callback`;

export async function oauthProviders() {
  const { data } = await api.get('/auth/oauth/providers', { timeout: 90000 });
  return Array.isArray(data?.providers) ? data.providers : [];
}

// 제공자 로그인 화면으로 보낸다. 돌아왔을 때 같은 state인지 확인해 다른 사이트가 끼워 넣은 요청을 막는다
export async function startOAuth(provider) {
  const { data } = await api.get(`/auth/oauth/${provider}/authorize`, { params: { redirectUri: callbackUri() }, timeout: 90000 });
  try { sessionStorage.setItem(OAUTH_STATE, JSON.stringify({ provider, state: data.state })); } catch { /* 저장소가 없으면 돌아와서 실패한다 */ }
  window.location.assign(data.url);
}

// 돌아온 코드로 로그인한다. 연결된 계정이면 { status: 'ok' }, 처음이면 { status: 'link', ticket, ... }
export async function finishOAuth(code, state) {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(OAUTH_STATE)); sessionStorage.removeItem(OAUTH_STATE); } catch { /* 아래에서 거절 */ }
  if (!saved || saved.state !== state) throw new Error('로그인 요청이 올바르지 않습니다. 처음부터 다시 시도해 주세요.');
  const { data } = await api.post(`/auth/oauth/${saved.provider}/callback`, { code, state, redirectUri: callbackUri() }, { timeout: 90000 });
  if (data.status === 'ok') setAccount({ id: data.user.id, nickname: data.user.nickname, token: data.user.token });
  return data;
}

// 기존 계정에 연결한다. 로그인 중이면 비밀번호 없이 지금 계정에 연결한다
export async function linkOAuth(ticket, nickname, password) {
  const current = account();
  const headers = { 'X-Visitor-Id': visitorId(), ...(current ? { Authorization: `Bearer ${current.token}` } : {}) };
  const { data } = await api.post('/auth/oauth/link', current ? { ticket } : { ticket, nickname, password }, { timeout: 90000, headers });
  setAccount({ id: data.id, nickname: data.nickname, token: data.token });
}

export async function signUpOAuth(ticket, nickname) {
  const { data } = await api.post('/auth/oauth/signup', { ticket, nickname }, { timeout: 90000, headers: { 'X-Visitor-Id': visitorId() } });
  setAccount({ id: data.id, nickname: data.nickname, token: data.token });
}

export async function linkedProviders() {
  const { data } = await api.get('/auth/oauth/linked', auth());
  return Array.isArray(data?.providers) ? data.providers : [];
}

export async function changeNickname(nickname) {
  const current = account();
  if (!current) throw new Error('로그인이 필요합니다.');
  const { data } = await api.put('/auth/nickname', { nickname }, { ...auth(), headers: { ...auth().headers, 'X-Visitor-Id': visitorId() } });
  if (account()?.token === current.token) setAccount({ ...current, nickname: data.nickname });
  return data.nickname;
}

export async function passwordStatus() {
  const { data } = await api.get('/auth/password', auth());
  return data?.hasPassword !== false;
}

// 현재 비밀번호를 확인하고 바꾼다. 다른 기기의 로그인은 끊기고 이 기기는 새 토큰으로 이어진다
export async function changePassword(currentPassword, newPassword) {
  const current = account();
  if (!current) throw new Error('로그인이 필요합니다.');
  const { data } = await api.post('/auth/change-password', { currentPassword, newPassword }, { ...auth(), timeout: 90000 });
  setAccount({ id: data.id, nickname: data.nickname, token: data.token });
}

export async function signOut() {
  try { await api.post('/auth/logout', null, auth()); } catch { /* 서버에 닿지 않아도 이 기기에서는 로그아웃한다 */ }
  setAccount(null);
}

// A failed request may belong to an earlier login. Never log out its successor.
const guard = (error, user) => {
  if (error?.response?.status === 401 && account()?.token === user?.token) setAccount(null);
  throw error;
};

export async function fetchRemote(company, user = account()) {
  if (!user) return null;
  const deadline = Date.now() + 90000;
  for (let attempt = 0; ; attempt++) {
    if (account()?.token !== user.token) return null;
    let response;
    try {
      response = await api.get(`/exam/progress/${company}`, {
        headers: { Authorization: `Bearer ${user.token}` }, timeout: Math.max(1, deadline - Date.now()),
      });
    } catch (error) {
      const status = error?.response?.status;
      const retryAfter = Number(error?.response?.headers?.['retry-after']) * 1000;
      const delay = status === 429 ? Math.max(1500, retryAfter || 5000) : attempt === 0 ? 1500 : 3500;
      const transient = !status || status === 429 || (status >= 500 && status <= 599);
      if (!transient || attempt >= 2 || Date.now() + delay >= deadline) return guard(error, user);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    if (account()?.token !== user.token) return null;
    return response.data.data ? JSON.parse(response.data.data) : null;
  }
}

const timers = new Map();
const pending = new Map();
const running = new Map();
const ownerKey = user => user?.id ? `user:${user.id}` : `nickname:${user?.nickname}`;
const queueKey = (user, company) => `${ownerKey(user)}:${company}`;
const storageKey = user => `sync:pending:v1:${ownerKey(user)}`;
const isCurrent = user => !!user && account()?.token === user.token;

function persist(user) {
  const records = {};
  for (const { entry } of running.values()) {
    if (ownerKey(entry.user) === ownerKey(user)) records[entry.company] = entry.data;
  }
  for (const entry of pending.values()) {
    if (ownerKey(entry.user) === ownerKey(user)) records[entry.company] = entry.data;
  }
  try {
    if (Object.keys(records).length) localStorage.setItem(storageKey(user), JSON.stringify(records));
    else localStorage.removeItem(storageKey(user));
  } catch { /* The regular local progress record is retained as well. */ }
}

function schedule(key, delay) {
  clearTimeout(timers.get(key));
  const timer = setTimeout(() => {
    timers.delete(key);
    const entry = pending.get(key);
    if (entry && isCurrent(entry.user)) void flush(entry.company, entry.user);
  }, delay);
  timer.unref?.();
  timers.set(key, timer);
}

async function flush(company, user) {
  const key = queueKey(user, company);
  if (!isCurrent(user)) return false;
  const active = running.get(key);
  if (active) {
    await active.promise;
    return pending.has(key) ? flush(company, user) : true;
  }
  const entry = pending.get(key);
  if (!entry) return true;
  clearTimeout(timers.get(key)); timers.delete(key);
  pending.delete(key);
  const promise = (async () => {
    let saved = false, retry = true, retryDelay = 5000;
    try {
      await api.put(`/exam/progress/${company}`, { data: JSON.stringify(entry.data) }, {
        headers: { Authorization: `Bearer ${user.token}` }, timeout: 90000,
      }).catch(error => guard(error, user));
      saved = true;
    } catch (error) {
      const status = error?.response?.status;
      retry = !status || status === 408 || status === 429 || status >= 500;
      if (status === 429) retryDelay = Math.max(5000, Number(error.response.headers?.['retry-after']) * 1000 || 5000);
      if (!pending.has(key)) pending.set(key, entry);
    } finally {
      running.delete(key);
      persist(user);
      if (pending.has(key) && isCurrent(pending.get(key).user) && (saved || retry)) schedule(key, saved ? 0 : retryDelay);
    }
    return saved;
  })();
  running.set(key, { entry, promise });
  return promise;
}

function enqueue(company, data) {
  const user = account();
  if (!user) return null;
  const key = queueKey(user, company);
  pending.set(key, { company, data, user: { ...user } });
  persist(user);
  return { key, user };
}

export function pushRemote(company, data, delay = 1500) {
  const queued = enqueue(company, data);
  if (queued) schedule(queued.key, delay);
}

// False means the record is safely queued locally, but not yet acknowledged.
export function pushRemoteNow(company, data) {
  const queued = enqueue(company, data);
  return queued ? flush(company, queued.user) : Promise.resolve(false);
}

function restorePending() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  const user = account();
  if (!user) return;
  try {
    const records = JSON.parse(localStorage.getItem(storageKey(user)) || '{}');
    for (const [company, data] of Object.entries(records)) {
      const key = queueKey(user, company);
      if (!pending.has(key)) pending.set(key, { company, data, user: { ...user } });
      else pending.get(key).user = { ...user };
    }
  } catch { /* Ignore corrupt queue metadata; regular progress is still local. */ }
  for (const [key, entry] of pending) if (isCurrent(entry.user)) schedule(key, 0);
}

function flushPending() {
  for (const entry of pending.values()) if (isCurrent(entry.user)) void flush(entry.company, entry.user);
}

if (typeof window !== 'undefined') {
  window.addEventListener(EVENT, restorePending);
  window.addEventListener('storage', event => { if (event.key === KEY || event.key === null) restorePending(); });
  window.addEventListener('online', restorePending);
  window.addEventListener('focus', restorePending);
  window.addEventListener('pagehide', flushPending);
  if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPending();
  });
  restorePending();
}
