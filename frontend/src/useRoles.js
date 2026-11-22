import { useEffect, useState, useSyncExternalStore } from 'react';
import api from './api';
import { account, onAccountChange } from './sync';

const tokenSnapshot = () => account()?.token || '';

// 로그인한 계정의 권한(ADMIN, OWNER, TEAM)을 서버에서 받아 온다. 화면을 가리는 용도이고, 실제 데이터는 서버가 권한으로 막는다
export default function useRoles() {
  const token = useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  const [state, setState] = useState({ token: null, roles: [], nickname: null, privateBank: false, error: false });
  useEffect(() => {
    if (!token) return undefined;
    let alive = true;
    api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 })
      .then(({ data }) => { if (alive) setState({ token, roles: Array.isArray(data?.roles) ? data.roles : [], nickname: data?.nickname || null, privateBank: !!data?.privateBank, error: false }); })
      .catch(error => { if (alive) setState({ token, roles: [], privateBank: false, error: error?.response?.status !== 401 }); });
    return () => { alive = false; };
  }, [token]);
  const signedIn = !!token;
  const loading = signedIn && state.token !== token;
  return { signedIn, loading, nickname: signedIn && !loading ? state.nickname : null, roles: signedIn && !loading ? state.roles : [], privateBank: signedIn && !loading && state.privateBank, error: signedIn && !loading && state.error };
}

// 비공개 문제집(/private/banks)을 볼 수 있는 계정인지는 서버가 정해서 알려 준다(찬웅 또는 서버 환경변수에 적은 계정).
// 닉네임을 화면 코드에 두지 않아 저장소와 배포 파일에 남지 않는다
export const canOpenPrivateBanks = ({ privateBank } = {}) => !!privateBank;
