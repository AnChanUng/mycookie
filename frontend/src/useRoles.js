import { useEffect, useState, useSyncExternalStore } from 'react';
import api from './api';
import { account, onAccountChange } from './sync';

const tokenSnapshot = () => account()?.token || '';

// 로그인한 계정의 권한(ADMIN, OWNER, TEAM)을 서버에서 받아 온다. 화면을 가리는 용도이고, 실제 데이터는 서버가 권한으로 막는다
export default function useRoles() {
  const token = useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const [state, setState] = useState({ token: null, roles: [], error: false });
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 })
      .then(({ data }) => { if (alive) setState({ token, roles: Array.isArray(data?.roles) ? data.roles : [], error: false }); })
      .catch(error => { if (alive) setState({ token, roles: [], error: error?.response?.status !== 401 }); });
    return () => { alive = false; };
  }, [token]);
  const signedIn = !!token;
  const loading = signedIn && state.token !== token;
  return { signedIn, loading, roles: signedIn && !loading ? state.roles : [], error: signedIn && !loading && state.error };
}
