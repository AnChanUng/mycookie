import { useEffect, useState, useSyncExternalStore } from 'react';
import api from './api';
import { account, onAccountChange } from './sync';

const tokenSnapshot = () => account()?.token || '';

// 로그인한 계정의 권한(ADMIN, OWNER, TEAM, BANK)과 등급을 서버에서 받아 온다. 화면을 가리는 용도이고, 실제 데이터는 서버가 권한으로 막는다
export default function useRoles() {
  const token = useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const [state, setState] = useState({ token: null, roles: [], nickname: null, tier: null, error: false });
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 })
      .then(({ data }) => { if (alive) setState({ token, roles: Array.isArray(data?.roles) ? data.roles : [], nickname: data?.nickname || null, tier: data?.membership?.tier || null, error: false }); })
      .catch(error => { if (alive) setState({ token, roles: [], tier: null, error: error?.response?.status !== 401 }); });
    return () => { alive = false; };
  }, [token]);
  const signedIn = !!token;
  const loading = signedIn && state.token !== token;
  const ready = signedIn && !loading;
  return { signedIn, loading, nickname: ready ? state.nickname : null, roles: ready ? state.roles : [], tier: ready ? state.tier : null, error: ready && state.error };
}

// 비공개 문제집(/private/banks): 찬웅(OWNER)이거나, BANK 권한을 받고 다이아 쿠키 이상인 계정만 연다
const BANK_TIERS = ['DIAMOND', 'RUBY'];
export const canOpenPrivateBanks = ({ roles = [], tier } = {}) =>
  roles.includes('OWNER') || (roles.includes('BANK') && BANK_TIERS.includes(tier));
