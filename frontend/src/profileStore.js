import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import api from './api';
import { account, onAccountChange } from './sync';
import { membershipHeaders } from './membership';

// 프로필 꾸미기 결과를 여러 화면(헤더 · 채팅 · 순위)이 함께 쓰는 곳.
// - 내 프로필: 로그인하면 한 번 불러오고, 프로필 카드에서 저장하면 바로 바뀐다
// - 다른 사람: 닉네임으로 대표 아이콘 · 테두리만 묻고(/profiles/public) 잠시 기억해 둔다. 고르지 않은 사람은 null

// ---------- 내 프로필 ----------
let mine = { token: '', profile: null };
const mineListeners = new Set();
const emitMine = () => mineListeners.forEach(fn => fn());

export function setMyProfile(profile) {
  mine = { token: account()?.token || '', profile };
  emitMine();
}

function loadMine(token) {
  api.get('/me/profile', { headers: membershipHeaders(), timeout: 20000 })
    .then(({ data }) => { if ((account()?.token || '') === token) setMyProfile(data || null); })
    .catch(() => {});
}

// 내 프로필(대표 아이콘 · 테두리 등). 로그인하지 않았거나 아직 못 불러왔으면 null
export function useMyProfile() {
  const token = useSyncExternalStore(onAccountChange, () => account()?.token || '', () => '');
  const snapshot = useSyncExternalStore(cb => { mineListeners.add(cb); return () => mineListeners.delete(cb); }, () => mine, () => mine);
  useEffect(() => { if (token && mine.token !== token) loadMine(token); }, [token]);
  return token && snapshot.token === token ? snapshot.profile : null;
}

// ---------- 다른 사람 ----------
const KEEP_MS = 5 * 60 * 1000;
const looks = new Map(); // 닉네임 → { look, at }
const lookListeners = new Set();
let queued = new Set();
let timer = null;

function flush() {
  timer = null;
  const names = [...queued].slice(0, 100);
  queued = new Set([...queued].slice(100));
  if (queued.size) timer = setTimeout(flush, 0);
  if (!names.length) return;
  const params = new URLSearchParams();
  names.forEach(n => params.append('nicknames', n));
  api.get(`/profiles/public?${params}`, { timeout: 20000 })
    .then(({ data }) => {
      const now = Date.now();
      names.forEach(n => looks.set(n, { look: data?.[n] || null, at: now }));
      lookListeners.forEach(fn => fn());
    })
    .catch(() => { const now = Date.now(); names.forEach(n => { if (!looks.has(n)) looks.set(n, { look: null, at: now - KEEP_MS + 30000 }); }); });
}

function request(names) {
  const now = Date.now();
  let added = false;
  for (const n of names) {
    const hit = looks.get(n);
    if (!n || queued.has(n) || (hit && now - hit.at < KEEP_MS)) continue;
    queued.add(n); added = true;
  }
  if (added && !timer) timer = setTimeout(flush, 50);
}

// 닉네임 목록의 대표 아이콘 · 테두리. { 닉네임: { avatar, frame } } 모양이고 고르지 않은 사람은 빠진다
export function usePublicLooks(nicknames) {
  const key = useMemo(() => [...new Set((nicknames || []).filter(Boolean))].sort().join('\n'), [nicknames]);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onChange = () => setVersion(v => v + 1);
    lookListeners.add(onChange);
    return () => lookListeners.delete(onChange);
  }, []);
  useEffect(() => { if (key) request(key.split('\n')); }, [key]);
  return useMemo(() => {
    const out = {};
    if (key) for (const n of key.split('\n')) { const look = looks.get(n)?.look; if (look) out[n] = look; }
    return out;
  }, [key, version]); // eslint-disable-line react-hooks/exhaustive-deps
}
