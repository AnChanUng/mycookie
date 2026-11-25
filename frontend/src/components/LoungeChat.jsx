import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { visitorId } from '../track';
import { NICKNAME_MAX, cleanNickname, myNickname, saveNickname, savedNickname } from '../nickname';
import { account, changeNickname, onAccountChange } from '../sync';
import { membershipHeaders } from '../membership';
import DirectChat from './DirectChat';

const accountSnapshot = () => `${account()?.token || ''}:${account()?.nickname || ''}`;

const POLL_OPEN = 3000;
const POLL_CLOSED = 30000;
const TEXT_MAX = 200;
const koreanDay = (at = Date.now()) => new Date(new Date(at).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

// 대결 초대 글에 든 /duel/방번호 는 누르면 바로 들어가는 참가 버튼으로 보여 준다
function ChatText({ text }) {
  const m = text.match(/^(.*?)\s*\/duel\/([A-Za-z0-9]{6})\b(.*)$/s);
  if (!m) return text;
  return <>{m[1]} <Link to={`/duel/${m[2].toUpperCase()}`} className="lounge-join">참가하기 →</Link>{m[3]}</>;
}
const KEEP = 200;
const SEEN_KEY = 'lounge:seen';

const p2 = (n) => String(n).padStart(2, '0');
function fmtAt(iso) {
  const d = new Date(iso);
  const clock = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return d.toDateString() === new Date().toDateString() ? clock : `${d.getMonth() + 1}.${d.getDate()} ${clock}`;
}

const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };
const writeSeen = (id) => { try { localStorage.setItem(SEEN_KEY, String(id)); } catch { /* storage unavailable */ } };

// 접속해 있는 사람들이 함께 쓰는 채팅 창. 닫혀 있을 때도 가끔 새 글을 확인해 헤더에 알림 점을 띄운다
export default function LoungeChat({ open, online, onClose, onOnline, onUnread, directUnread = 0 }) {
  const identity = useSyncExternalStore(onAccountChange, accountSnapshot, () => '');
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [nickname, setNickname] = useState(savedNickname);
  const [naming, setNaming] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [self, setSelf] = useState('');
  const [challenging, setChallenging] = useState(false);
  const [room, setRoom] = useState(null);
  const [tab, setTab] = useState('public');
  const displayName = account()?.nickname || nickname;

  const lastId = useRef(0);
  const epoch = useRef(null);
  const listRef = useRef(null);
  const stick = useRef(true);
  const openRef = useRef(open);
  const inFlight = useRef(false);
  const polling = useRef(false);
  const streamVersion = useRef(0);
  const acknowledged = useRef(new Set());
  const me = (visitorId() || '').slice(0, 8);

  useEffect(() => { openRef.current = open; }, [open]);

  // 받은 글을 목록에 합친다. replace면 처음부터 다시 받은 것이다
  const take = useCallback((rows, replace, advance = true) => {
    const newest = rows.length ? rows[rows.length - 1].id : (replace ? 0 : lastId.current);
    if (advance) lastId.current = replace ? newest : Math.max(lastId.current, newest);
    const confirmed = new Set(rows.map(m => m.clientId).filter(Boolean));
    for (const id of confirmed) acknowledged.current.add(id);
    while (acknowledged.current.size > KEEP) acknowledged.current.delete(acknowledged.current.values().next().value);
    setPending(prev => prev.filter(m => !confirmed.has(m.clientId)));
    setMessages(prev => {
      const have = new Set(replace ? [] : prev.map(m => m.id));
      return [...(replace ? [] : prev), ...rows.filter(m => !have.has(m.id))]
        .filter(m => koreanDay(m.at) === koreanDay()).sort((a, b) => a.id - b.id).slice(-KEEP);
    });
    if (openRef.current) {
      writeSeen(lastId.current);
      onUnread(false);
    } else {
      // 처음 온 사람에게는 예전 대화를 새 글로 치지 않는다
      let seen = readSeen();
      if (!seen) { seen = lastId.current; writeSeen(seen); }
      onUnread(lastId.current > seen);
    }
  }, [onUnread]);

  const poll = useCallback(async () => {
    if (document.hidden || polling.current) return;
    polling.current = true;
    const version = streamVersion.current;
    try {
      const first = epoch.current === null;
      let { data } = await api.get('/lounge/messages', { params: first ? {} : { after: lastId.current } });
      // 관리자가 글을 지웠으면 목록을 통째로 다시 받는다
      const reset = !first && data.epoch !== epoch.current;
      if (reset) ({ data } = await api.get('/lounge/messages'));
      if (version !== streamVersion.current) return;
      epoch.current = data.epoch;
      take(data.messages, first || reset);
      onOnline(data.online);
      if (Array.isArray(data.participants)) setParticipants(data.participants);
      setReady(true);
    } catch {
      /* 서버가 잠들어 있거나 끊겼다. 다음 차례에 다시 물어본다 */
    } finally { polling.current = false; }
  }, [take, onOnline]);

  useEffect(() => {
    const first = setTimeout(poll, 0);
    const timer = setInterval(poll, open && !streaming ? POLL_OPEN : POLL_CLOSED);
    document.addEventListener('visibilitychange', poll);
    return () => { clearTimeout(first); clearInterval(timer); document.removeEventListener('visibilitychange', poll); };
  }, [open, poll, streaming]);

  useEffect(() => {
    if (!open || typeof EventSource === 'undefined') return undefined;
    const source = new EventSource(`${api.defaults.baseURL}/lounge/stream`);
    source.addEventListener('messages', event => {
      try {
        const data = JSON.parse(event.data);
        streamVersion.current++;
        epoch.current = data.epoch;
        take(data.messages, true);
        onOnline(data.online);
        if (Array.isArray(data.participants)) setParticipants(data.participants);
        setReady(true);
        setStreaming(true);
      } catch { setStreaming(false); }
    });
    // 새 글은 그 글 하나만 온다. 목록 번호(epoch)가 바뀌었으면 지워진 글이 있으니 처음부터 다시 받는다
    source.addEventListener('message', event => {
      try {
        const data = JSON.parse(event.data);
        if (epoch.current !== null && data.epoch !== epoch.current) { epoch.current = null; poll(); return; }
        if (data.message) take([data.message], false);
      } catch { /* 다음 조회가 메운다 */ }
    });
    // 입장과 퇴장은 참여자 목록만 온다
    source.addEventListener('presence', event => {
      try {
        const data = JSON.parse(event.data);
        onOnline(data.online);
        if (Array.isArray(data.participants)) setParticipants(data.participants);
      } catch { /* 무시 */ }
    });
    // 실시간 연결이 가득 찼다: 다시 붙으려 하지 않고 몇 초마다 조회로 바꾼다
    source.addEventListener('full', () => { source.close(); setStreaming(false); });
    source.onerror = () => setStreaming(false); // EventSource reconnects; polling covers the gap.
    return () => { source.close(); setStreaming(false); };
  }, [open, take, onOnline, poll]);

  // Site presence stays active while the chat panel is closed.
  useEffect(() => {
    let active = true;
    const id = visitorId();
    const beat = () => {
      if (document.hidden) return;
      api.post('/lounge/presence', { visitorId: id, nickname: account()?.nickname || nickname || myNickname() }, { headers: membershipHeaders(), timeout: 20000 })
        .then(({ data }) => { if (active) { setParticipants(data.participants); setSelf(data.self); } })
        .catch(error => { if (active && error.response?.status === 409) setError('닉네임이 중복됩니다. 다른 닉네임을 정해 주세요.'); });
    };
    beat();
    const timer = setInterval(beat, 30000);
    document.addEventListener('visibilitychange', beat);
    return () => {
      active = false; clearInterval(timer); document.removeEventListener('visibilitychange', beat);
      // Expire on the server so closing one tab does not remove another active tab.
    };
  }, [nickname, identity]);

  // Clear yesterday's messages at Korean midnight, even with a disconnected server.
  useEffect(() => {
    const nextMidnight = new Date(`${koreanDay()}T00:00:00+09:00`).getTime() + 86400000;
    const timer = setTimeout(() => {
      setMessages(prev => prev.filter(m => koreanDay(m.at) === koreanDay()));
      setPending(prev => prev.filter(m => koreanDay(m.at) === koreanDay()));
      poll();
    }, Math.max(1, nextMidnight - Date.now()));
    return () => clearTimeout(timer);
  }, [messages, pending, poll]);

  // 맨 아래를 보고 있을 때만 새 글을 따라 내려간다
  useEffect(() => {
    const list = listRef.current;
    if (open && list && stick.current) list.scrollTop = list.scrollHeight;
  }, [messages, pending, open, ready]);

  const openNaming = () => { setDraftName(displayName); setNaming(true); };

  const saveName = async (e) => {
    e.preventDefault();
    const name = cleanNickname(draftName);
    if (!name) return;
    try {
      if (account()) await changeNickname(name);
      else await api.put('/profile', { visitorId: visitorId(), nickname: name });
      saveNickname(name); setNickname(name); setNaming(false); setError('');
    } catch (error) { setError(error.response?.data?.error || '닉네임을 변경하지 못했습니다.'); }
  };

  const deliver = async message => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setError('');
    setPending(prev => prev.map(m => m.clientId === message.clientId ? { ...m, status: 'sending' } : m));
    try {
      const { data } = await api.post('/lounge/messages', {
        visitorId: message.visitorId, nickname: message.nickname, text: message.text, clientId: message.clientId,
      }, { timeout: 90000, headers: membershipHeaders() });
      stick.current = true;
      take([data], false, false);
    } catch (err) {
      if (!acknowledged.current.has(message.clientId)) {
        setPending(prev => prev.map(m => m.clientId === message.clientId ? { ...m, status: 'failed' } : m));
        setError(err.response?.data?.error || '보내지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  };

  const send = e => {
    e.preventDefault();
    const body = text.trim(), id = visitorId();
    if (!body || inFlight.current || !id) return;
    const name = account()?.nickname || nickname || myNickname();
    const message = { clientId: crypto.randomUUID(), visitorId: id, visitor: me, nickname: name,
      text: body, at: new Date().toISOString(), status: 'sending' };
    setNickname(name);
    stick.current = true;
    setPending(prev => [...prev, message]);
    setText('');
    deliver(message);
  };

  const challenge = async person => {
    if (challenging || sending) return;
    setChallenging(true); setError('');
    try {
      const { TOPICS } = await import('../data/topicBank');
      const pool = [...TOPICS.questions];
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const { data } = await api.post('/duels', { questionIds: pool.slice(0, 10).map(q => q.id), open: false, title: '채팅 대결' }, { timeout: 90000 });
      setRoom(data.code);
      const name = displayName || myNickname();
      const message = { clientId: crypto.randomUUID(), visitorId: visitorId(), visitor: me, nickname: name,
        text: `⚔️ ${person.nickname}님, 10문제 대결 신청합니다! /duel/${data.code}`, at: new Date().toISOString(), status: 'sending' };
      setPending(prev => [...prev, message]);
      await deliver(message);
    } catch { setError('대결 방을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
    finally { setChallenging(false); }
  };

  if (!open) return null;

  return (
    <section className="lounge" aria-label="채팅">
      <header className="lounge-head">
        <div>
          <strong>공부방 채팅</strong>
          <span className="lounge-online"><i aria-hidden="true" />{online > 0 ? `${online}명 접속 중` : '접속 인원 확인 중'}</span>
        </div>
        <button type="button" className="lounge-close" onClick={onClose} aria-label="채팅 닫기">×</button>
      </header>

      <div className="lounge-tabs"><button aria-pressed={tab === 'public'} onClick={() => setTab('public')}>전체 채팅</button><button aria-pressed={tab === 'direct'} onClick={() => setTab('direct')}>1:1 대화 · 친구{directUnread > 0 ? ` (${directUnread})` : ''}</button></div>
      {tab === 'direct' ? <DirectChat key={identity} participants={participants} self={self} /> : <>

      <div className="lounge-participants" aria-label="사이트 접속자">
        <strong>사이트 접속 중 {participants.length}명</strong>
        {participants.map(person => <div key={person.id}><span>{person.nickname}{person.id === self ? ' (나)' : ''}</span>
          {person.id !== self && <button type="button" disabled={!self || challenging || sending} onClick={() => challenge(person)}>대결 신청</button>}
        </div>)}
        {room && <Link to={`/duel/${room}`} onClick={onClose}>내 대결 방 입장 →</Link>}
      </div>

      <div className="lounge-list" ref={listRef}
        onScroll={e => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40; }}>
        {!ready && <p className="lounge-empty">불러오는 중... 서버가 잠들어 있으면 1~2분 걸립니다</p>}
        {ready && messages.length === 0 && <p className="lounge-empty">아직 대화가 없습니다. 첫 인사를 남겨 보세요 👋</p>}
        {messages.map(m => (
          <div key={m.id} className={`lounge-msg${m.visitor === me ? ' mine' : ''}`}>
            <span className="lounge-meta">{m.visitor === me ? '나' : m.nickname} · {fmtAt(m.at)}</span>
            <span className="lounge-bubble"><ChatText text={m.text} /></span>
          </div>
        ))}
        {pending.map(m => <div key={m.clientId} className="lounge-msg mine">
          <span className="lounge-meta">나 · {m.status === 'failed' ? '전송 실패' : '전송 중…'}</span>
          <span className="lounge-bubble"><ChatText text={m.text} /></span>
          {m.status === 'failed' && <button type="button" disabled={sending} onClick={() => deliver(m)}>재시도</button>}
        </div>)}
      </div>

      {naming ? (
        <form className="lounge-name" onSubmit={saveName}>
          <input value={draftName} onChange={e => setDraftName(e.target.value)} maxLength={NICKNAME_MAX} placeholder="닉네임" autoFocus aria-label="닉네임" />
          <button type="submit">저장</button>
          <button type="button" onClick={() => setNaming(false)}>취소</button>
        </form>
      ) : (
        <div className="lounge-name">
          <span>{displayName ? <>닉네임 <b>{displayName}</b></> : '닉네임은 처음 보낼 때 자동으로 지어집니다.'}</span>
          <button type="button" onClick={openNaming}>{displayName ? '바꾸기' : '직접 정하기'}</button>
        </div>
      )}

      {error && <p className="lounge-error" role="alert">{error}</p>}
      <form className="lounge-form" onSubmit={send}>
        <input value={text} onChange={e => setText(e.target.value)} maxLength={TEXT_MAX} placeholder="메시지를 입력하세요" aria-label="메시지" />
        <button type="submit" disabled={sending || !text.trim()}>보내기</button>
      </form>
      <p className="lounge-rule">한국시간 00시에 전날 대화가 화면에서 사라집니다. 서로 존중하는 대화를 부탁드려요.</p>
      </>}
    </section>
  );
}
