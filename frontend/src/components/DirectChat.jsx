import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { account } from '../sync';
import { membershipHeaders } from '../membership';
import { Avatar, DayDivider, EmojiButton, ReactionChips, ReactionPicker, SendIcon } from './chatUi';
import { clock, layout, shortWhen, toggled } from './chatFormat';
import './Chat.css';
import { usePublicLooks } from '../profileStore';

const config = () => ({ headers: membershipHeaders(), timeout: 20000 });
const STATE_LABEL = { friends: '친구', sent: '요청 보냄', received: '요청 받음', none: '' };

// 친구 찾기 · 받은 요청 · 추천 · 친구 목록과 1:1 대화. 모두 로그인한 계정끼리만 쓴다
export default function DirectChat({ participants, self }) {
  const [threads, setThreads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [menu, setMenu] = useState(false);
  const retry = useRef(null);
  const active = useRef(true);
  const list = useRef(null);
  const inputRef = useRef(null);
  const myName = account()?.nickname;

  // 전체 채팅 접속자 가운데 닉네임이 같은 사람을 온라인으로 본다
  const onlineNames = useMemo(() => new Set(participants.filter(p => p.id !== self).map(p => p.nickname)), [participants, self]);
  const onlineKey = useMemo(() => [...onlineNames].filter(n => n !== myName).sort().join('\n'), [onlineNames, myName]);

  const looks = usePublicLooks([...threads.map(t => t.nickname), ...suggested.map(p => p.nickname), ...(results || []).map(p => p.nickname), selected?.nickname]);
  const refresh = useCallback(async () => {
    const { data } = await api.get('/direct', config());
    if (active.current) { setThreads(data); setLoaded(true); }
  }, []);
  useEffect(() => {
    active.current = true;
    let pending = false;
    const poll = async () => {
      if (document.hidden || pending || !account()) return;
      pending = true;
      try { await refresh(); } catch { if (active.current) setError('목록을 불러오지 못했습니다. 잠시 후 다시 확인합니다.'); }
      finally { pending = false; }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => { active.current = false; clearInterval(timer); };
  }, [refresh]);

  // 접속 중인 계정 사용자를 친구 추천으로 보여 준다
  const loadSuggestions = useCallback(async () => {
    if (!onlineKey || !account()) { setSuggested([]); return; }
    try {
      const { data } = await api.post('/direct/members', { nicknames: onlineKey.split('\n') }, config());
      if (active.current) setSuggested(data);
    } catch { /* 추천은 없어도 된다 */ }
  }, [onlineKey]);
  useEffect(() => {
    const timer = setTimeout(loadSuggestions, 0);
    return () => clearTimeout(timer);
  }, [loadSuggestions]);

  // 입력이 잠깐 멈추면 닉네임 일부로 찾는다
  useEffect(() => {
    const q = query.trim();
    let alive = true;
    const timer = setTimeout(async () => {
      if (!q) { if (alive) setResults(null); return; }
      try {
        const { data } = await api.get('/direct/search', { ...config(), params: { q } });
        if (alive) setResults(data);
      } catch { if (alive) setResults([]); }
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [query]);

  useEffect(() => {
    if (!selected) return;
    let alive = true, pending = false;
    const poll = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try {
        const { data } = await api.get(`/direct/${selected.id}/messages`, config());
        if (!alive) return;
        setMessages(data);
        if (data.length) await api.post(`/direct/${selected.id}/read`, { last: data.at(-1).id }, config());
      } catch { if (alive) setError('대화를 불러오지 못했습니다. 잠시 후 다시 확인합니다.'); }
      finally { pending = false; }
    };
    poll(); const timer = setInterval(poll, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, [selected]);
  useEffect(() => { if (list.current) list.current.scrollTop = list.current.scrollHeight; }, [messages.length]);

  const run = async (action, done) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await action(); await refresh();
      if (done && active.current) setNotice(done);
      if (query.trim()) {
        const { data } = await api.get('/direct/search', { ...config(), params: { q: query.trim() } });
        if (active.current) setResults(data);
      }
      loadSuggestions();
    }
    catch (e) { if (active.current) setError(e.response?.data?.error || '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { if (active.current) setBusy(false); }
  };
  const choose = thread => { setSelected(thread); setMessages([]); setText(''); setMenu(false); retry.current = null; setError(''); setNotice(''); };
  const threadFor = async person => person.threadId
    ? { id: person.threadId }
    : (await api.post('/direct', { nickname: person.nickname }, config())).data;
  const talk = person => run(async () => {
    const thread = await threadFor(person);
    if (active.current) choose({ ...thread, nickname: person.nickname, friendship: person.friendship });
  });
  const request = person => run(async () => {
    const thread = await threadFor(person);
    await api.post(`/direct/${thread.id}/friend`, { action: 'request' }, config());
  }, `${person.nickname}님에게 친구 요청을 보냈어요.`);
  const friend = (id, action, done) => run(() => api.post(`/direct/${id}/friend`, { action }, config()), done);

  const send = e => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    const body = retry.current?.text === text.trim() ? retry.current : { text: text.trim(), clientId: crypto.randomUUID() };
    retry.current = body;
    run(async () => {
      await api.post(`/direct/${selected.id}/messages`, body, config());
      if (!active.current) return;
      setText(''); retry.current = null;
      const { data } = await api.get(`/direct/${selected.id}/messages`, config());
      if (active.current) setMessages(data);
    });
  };
  const react = async (message, emoji) => {
    const threadId = selected.id;
    setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: toggled(m.reactions, emoji) } : m));
    try {
      const { data } = await api.post(`/direct/${threadId}/messages/${message.id}/reactions`, { emoji }, config());
      if (active.current) setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: data } : m));
    } catch (e) {
      if (!active.current) return;
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: message.reactions } : m));
      setError(e.response?.data?.error || '반응을 남기지 못했습니다.');
    }
  };

  if (!account()) return (
    <div className="direct-panel direct-login">
      <span className="direct-login-icon" aria-hidden="true">👥</span>
      <strong>친구와 1:1 대화</strong>
      <p>친구 목록과 1:1 대화는 계정에 저장됩니다. 로그인하면 친구를 찾고 요청을 보낼 수 있어요.</p>
      <Link to="/account" className="direct-primary">로그인하고 이용하기</Link>
    </div>
  );

  const current = selected ? threads.find(t => t.id === selected.id) || selected : null;
  const alerts = <>
    {error && <p role="alert" className="lounge-error">{error}</p>}
    {notice && <p role="status" className="direct-notice">{notice}</p>}
  </>;

  if (current) {
    const online = onlineNames.has(current.nickname);
    const rows = layout(messages, m => (m.mine ? 'me' : 'peer'));
    const actions = {
      none: [['친구 요청', 'request', '친구 요청을 보냈어요.']],
      sent: [['요청 취소', 'remove', '친구 요청을 취소했어요.']],
      received: [['친구 수락', 'accept', '이제 친구예요!'], ['요청 거절', 'remove', '친구 요청을 거절했어요.']],
      friends: [['친구 삭제', 'remove', '친구에서 삭제했어요.']],
    }[current.friendship] || [];
    return (
      <div className="direct-panel direct-conversation">
        <div className="direct-heading">
          <button type="button" className="chat-icon-btn" disabled={busy} onClick={() => { setSelected(null); setMessages([]); }} aria-label="목록으로">←</button>
          <Avatar name={current.nickname} look={looks[current.nickname]} online={online} />
          <div className="direct-peer">
            <strong>{current.nickname}</strong>
            <span>{online ? '접속 중' : '오프라인'}{STATE_LABEL[current.friendship] ? ` · ${STATE_LABEL[current.friendship]}` : ''}</span>
          </div>
          <span className="direct-menu">
            <button type="button" className="chat-icon-btn" onClick={() => setMenu(m => !m)} aria-label="친구 관리" aria-expanded={menu}>⋯</button>
            {menu && <div className="direct-menu-list" role="menu">
              {actions.map(([label, action, done]) => (
                <button type="button" role="menuitem" key={label} disabled={busy} className={action === 'remove' ? 'danger' : ''}
                  onClick={() => { setMenu(false); friend(current.id, action, done); }}>{label}</button>
              ))}
            </div>}
          </span>
        </div>
        {current.friendship === 'received' && (
          <div className="direct-banner">
            <span><b>{current.nickname}</b>님이 친구 요청을 보냈어요.</span>
            <button type="button" className="direct-primary" disabled={busy} onClick={() => friend(current.id, 'accept', '이제 친구예요!')}>수락</button>
            <button type="button" disabled={busy} onClick={() => friend(current.id, 'remove', '친구 요청을 거절했어요.')}>거절</button>
          </div>
        )}
        {alerts}
        <div className="direct-messages lounge-list" ref={list}>
          {!messages.length && (
            <div className="direct-first">
              <Avatar name={current.nickname} look={looks[current.nickname]} online={online} />
              <strong>{current.nickname}</strong>
              <p>두 사람만 볼 수 있는 대화예요. 첫 메시지를 보내 보세요.</p>
            </div>
          )}
          {rows.map(({ m, day, first, last }) => (
            <div key={m.id} className="lounge-row-wrap">
              {day && <DayDivider at={m.at} />}
              <div className={`lounge-msg${m.mine ? ' mine' : ''}${first ? ' first' : ''}${last ? ' last' : ''}`}>
                {!m.mine && (first ? <Avatar name={current.nickname} look={looks[current.nickname]} /> : <span className="chat-avatar-gap" />)}
                <div className="lounge-msg-body">
                  <div className="lounge-line">
                    <span className="lounge-bubble">{m.text}</span>
                    {last && <time className="lounge-time" dateTime={m.at}>{clock(m.at)}</time>}
                    <ReactionPicker onPick={emoji => react(m, emoji)} />
                  </div>
                  <ReactionChips items={m.reactions} onToggle={emoji => react(m, emoji)} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <form className="lounge-form" onSubmit={send}>
          <EmojiButton disabled={busy} onPick={e => { setText(t => (t + e).slice(0, 1000)); inputRef.current?.focus(); }} />
          <input ref={inputRef} aria-label="1:1 메시지" placeholder={`${current.nickname}님에게 메시지`} maxLength={1000} value={text} disabled={busy} onChange={e => setText(e.target.value)} />
          <button type="submit" className="chat-send" disabled={busy || !text.trim()} aria-label="보내기"><SendIcon /></button>
        </form>
      </div>
    );
  }

  const received = threads.filter(t => t.friendship === 'received');
  const friends = threads.filter(t => t.friendship === 'friends')
    .sort((a, b) => Number(onlineNames.has(b.nickname)) - Number(onlineNames.has(a.nickname)));
  const others = threads.filter(t => t.friendship === 'none' || t.friendship === 'sent');
  const onlineFriends = friends.filter(t => onlineNames.has(t.nickname)).length;
  const recommend = suggested.filter(p => p.friendship === 'none' || p.friendship === 'sent');

  const personAction = p => ({
    none: <button type="button" className="direct-primary" disabled={busy} onClick={() => request(p)}>친구 요청</button>,
    sent: <button type="button" disabled>요청됨</button>,
    received: <button type="button" className="direct-primary" disabled={busy} onClick={() => friend(p.threadId, 'accept', '이제 친구예요!')}>수락</button>,
    friends: <span className="direct-tag">친구</span>,
  })[p.friendship];

  const row = t => {
    const online = onlineNames.has(t.nickname);
    return (
      <button type="button" key={t.id} className={`direct-row${t.unread > 0 ? ' unread' : ''}`} disabled={busy} onClick={() => choose(t)}>
        <Avatar name={t.nickname} look={looks[t.nickname]} online={online} />
        <span className="direct-row-main">
          <span className="direct-row-top">
            <strong>{t.nickname}</strong>
            {STATE_LABEL[t.friendship] && t.friendship !== 'friends' && <span className="direct-tag">{STATE_LABEL[t.friendship]}</span>}
            <time>{shortWhen(t.lastAt)}</time>
          </span>
          <span className="direct-row-sub">
            <span>{t.lastText ? `${t.lastMine ? '나: ' : ''}${t.lastText}` : (online ? '지금 접속 중' : '아직 대화가 없어요')}</span>
            {t.unread > 0 && <b className="direct-unread" aria-label={`새 메시지 ${t.unread}개`}>{t.unread > 99 ? '99+' : t.unread}</b>}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="direct-panel">
      <form className="direct-search" role="search" onSubmit={e => e.preventDefault()}>
        <span aria-hidden="true">🔍</span>
        <input aria-label="친구 찾기" placeholder="닉네임으로 친구 찾기" value={query} maxLength={20} onChange={e => setQuery(e.target.value)} />
        {query && <button type="button" className="chat-icon-btn" onClick={() => setQuery('')} aria-label="검색어 지우기">×</button>}
      </form>
      {alerts}

      {results ? (
        <section className="direct-section">
          <h3>검색 결과</h3>
          {!results.length && <p className="direct-empty">'{query.trim()}'(으)로 찾은 계정이 없어요. 닉네임을 다시 확인해 주세요.</p>}
          {results.map(p => (
            <div className="direct-person" key={p.nickname}>
              <Avatar name={p.nickname} look={looks[p.nickname]} online={onlineNames.has(p.nickname)} />
              <span className="direct-person-name"><strong>{p.nickname}</strong><span>{onlineNames.has(p.nickname) ? '지금 접속 중' : '계정 사용자'}</span></span>
              <button type="button" disabled={busy} onClick={() => talk(p)}>메시지</button>
              {personAction(p)}
            </div>
          ))}
        </section>
      ) : <>
        {received.length > 0 && (
          <section className="direct-section">
            <h3>받은 친구 요청 <em>{received.length}</em></h3>
            {received.map(t => (
              <div className="direct-request" key={t.id}>
                <Avatar name={t.nickname} look={looks[t.nickname]} online={onlineNames.has(t.nickname)} />
                <span className="direct-person-name"><strong>{t.nickname}</strong><span>친구가 되고 싶어 해요</span></span>
                <button type="button" className="direct-primary" disabled={busy} onClick={() => friend(t.id, 'accept', `${t.nickname}님과 친구가 됐어요!`)}>수락</button>
                <button type="button" disabled={busy} onClick={() => friend(t.id, 'remove', '친구 요청을 거절했어요.')}>거절</button>
              </div>
            ))}
          </section>
        )}

        {recommend.length > 0 && (
          <section className="direct-section">
            <h3>지금 접속 중인 사람</h3>
            <div className="direct-suggest">
              {recommend.map(p => (
                <div className="direct-suggest-card" key={p.nickname}>
                  <Avatar name={p.nickname} look={looks[p.nickname]} online />
                  <strong title={p.nickname}>{p.nickname}</strong>
                  {p.friendship === 'sent'
                    ? <button type="button" disabled>요청됨</button>
                    : <button type="button" className="direct-primary" disabled={busy} onClick={() => request(p)}>+ 친구</button>}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="direct-section">
          <h3>친구 <em>{friends.length}</em>{friends.length > 0 && <span className="direct-sub">· 접속 중 {onlineFriends}</span>}</h3>
          {!loaded && <p className="direct-empty">목록을 불러오는 중…</p>}
          {loaded && !friends.length && <p className="direct-empty">아직 친구가 없어요. 위에서 닉네임을 찾아 친구 요청을 보내 보세요.</p>}
          {friends.map(row)}
        </section>

        {others.length > 0 && (
          <section className="direct-section">
            <h3>다른 대화</h3>
            {others.map(row)}
          </section>
        )}
      </>}
    </div>
  );
}
