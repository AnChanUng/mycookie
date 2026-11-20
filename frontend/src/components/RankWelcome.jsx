import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api';
import { account } from '../sync';
import './RankWelcome.css';
import RankMedal from './RankMedal';

export default function RankWelcome() {
  const [notices, setNotices] = useState([]);
  useEffect(() => {
    let active = true;
    let busy = false;
    const seen = new Set();
    try { JSON.parse(sessionStorage.getItem('rank-welcome-seen') || '[]').forEach(id => seen.add(id)); } catch { /* optional storage */ }
    const poll = async () => {
      if (document.hidden || busy) return;
      busy = true;
      try {
        const token = account()?.token;
        const { data } = await api.post('/rank/welcome', {}, {
          timeout: 10000, headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!active) return;
        const fresh = (data.notices || []).filter(n => !seen.has(n.id));
        fresh.forEach(n => seen.add(n.id));
        if (fresh.length) {
          setNotices(old => [...old, ...fresh.map(n => ({ ...n, expires: Date.now() + 10000 }))].slice(-5));
          try { sessionStorage.setItem('rank-welcome-seen', JSON.stringify([...seen].slice(-100))); } catch { /* optional storage */ }
        }
      } catch { /* notices must not interrupt studying */ }
      finally { busy = false; }
    };
    poll();
    const timer = setInterval(poll, 15000);
    const expiry = setInterval(() => setNotices(old => old.filter(n => n.expires > Date.now())), 1000);
    document.addEventListener('visibilitychange', poll);
    return () => { active = false; clearInterval(timer); clearInterval(expiry); document.removeEventListener('visibilitychange', poll); };
  }, []);
  return createPortal(<div className="rank-welcome" role="status" aria-live="polite">
    {notices.map(n => <div key={n.id} className="rank-welcome-item">
      <span className="rank-welcome-text"><RankMedal rank={n.rank} /> {n.rank}위 <strong>{n.nickname}</strong>님, 환영합니다!</span>
      <button type="button" aria-label="환영 공지 닫기" onClick={() => setNotices(old => old.filter(x => x.id !== n.id))}>×</button>
    </div>)}
  </div>, document.body);
}
