import { useEffect, useState, useSyncExternalStore } from 'react';
import api from './api';
import { account, onAccountChange } from './sync';
import { visitorId } from './track';

export const TIER_NAMES = { BRONZE: '동 쿠키', SILVER: '은 쿠키', GOLD: '금 쿠키', DIAMOND: '다이아 쿠키', RUBY: '루비 쿠키' };
export function membershipHeaders() {
  const token = account()?.token;
  return { 'X-Visitor-Id': visitorId(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
const snapshot = () => account()?.token || '';
let membershipVersion = 0;
const membershipListeners = new Set();
const subscribeMembership = listener => { membershipListeners.add(listener); return () => membershipListeners.delete(listener); };
const versionSnapshot = () => membershipVersion;
export function refreshMembership() { membershipVersion++; membershipListeners.forEach(listener => listener()); }
export function useMembership(revision = 0) {
  const token = useSyncExternalStore(onAccountChange, snapshot, () => '');
  const version = useSyncExternalStore(subscribeMembership, versionSnapshot, () => 0);
  const [state, setState] = useState({ token, revision, version, loading: true, membership: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    const delays = [2000, 5000, 10000, 20000, 30000];
    let timer, retries = 0;
    const load = () => api.get('/membership', { headers: membershipHeaders(), signal: controller.signal, timeout: 90000 })
      .then(({ data }) => {
        if (!data || !Object.hasOwn(TIER_NAMES, data.tier)) throw new Error('Invalid membership response');
        if (!controller.signal.aborted) setState({ token, revision, version, loading: false, membership: data, error: false });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setState({ token, revision, version, loading: false, membership: null, error: true });
        if (retries < delays.length) timer = setTimeout(load, delays[retries++]);
      });
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [token, revision, version]);
  return state.token === token && state.revision === revision && state.version === version ? state : { loading: true, membership: null, error: false };
}

// "금 쿠키 Ⅲ" 같은 이름으로 등급 키(GOLD)를 찾는다(승급 알림처럼 이름만 받을 때)
export const tierFromName = name => Object.keys(TIER_NAMES).find(key => String(name || '').startsWith(TIER_NAMES[key]));
