import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account, onAccountChange } from '../sync';
import { membershipHeaders } from '../membership';
import './AutoAttend.css';

// 로그인한 채로 사이트에 들어오면 하루 한 번 자동으로 출석 포인트를 받는다.
// 서버가 하루 한 번만 주므로, 여기서는 같은 날 같은 계정으로 다시 부르지 않게 날짜만 기억한다
const KEY = 'points-attend:v1';
const snapshot = () => account()?.token || '';
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

export default function AutoAttend() {
  const token = useSyncExternalStore(onAccountChange, snapshot, () => '');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!token) return undefined;
    const user = account()?.nickname || '';
    const mark = `${today()}:${user}`;
    try { if (localStorage.getItem(KEY) === mark) return undefined; } catch { /* 저장소를 못 쓰면 서버가 중복을 막는다 */ }
    let alive = true;
    api.post('/points/attend', null, { headers: membershipHeaders(), timeout: 30000 })
      .then(({ data }) => {
        try { localStorage.setItem(KEY, mark); } catch { /* 기억 못 해도 서버가 하루 한 번만 준다 */ }
        if (alive && data?.earned > 0) setToast(data);
      })
      .catch(() => { /* 서버가 깨어나는 중이면 다음 접속 때 다시 받는다 */ });
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return <div className="auto-attend" role="status">
    <span aria-hidden="true">📅</span>
    <p><b>출석 완료 +{toast.earned}P</b><small>{toast.streak}일 연속 출석 · 내 포인트 {toast.balance.toLocaleString()}P</small></p>
    <Link to="/shop" onClick={() => setToast(null)}>상점</Link>
    <button type="button" aria-label="닫기" onClick={() => setToast(null)}>×</button>
  </div>;
}
