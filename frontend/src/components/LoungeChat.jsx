import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { visitorId } from '../track';
import { NICKNAME_MAX, cleanNickname, myNickname, saveNickname, savedNickname } from '../nickname';
import { account, changeNickname, onAccountChange } from '../sync';
import { membershipHeaders } from '../membership';
import DirectChat from './DirectChat';
import { Avatar, DayDivider, EmojiButton, ReactionChips, ReactionPicker, SendIcon } from './chatUi';
import { clock, layout } from './chatFormat';
import './Chat.css';
import { usePublicLooks } from '../profileStore';
import { ProfileName } from './ProfilePopover';

const accountSnapshot = () => `${account()?.token || ''}:${account()?.nickname || ''}`;

const POLL_OPEN = 3000;
const POLL_CLOSED = 30000;
const TEXT_MAX = 200;
// 대화 기록은 2026년 11월 22일(한국 시간) 0시부터 계속 보여 준다. 날이 바뀌어도 지우지 않는다
const HISTORY_START = Date.parse('2026-11-22T00:00:00+09:00');
const inHistory = m => new Date(m.at).getTime() >= HISTORY_START;

// 대결 초대 글에 든 /duel/방번호 는 누르면 바로 들어가는 참가 버튼으로 보여 준다
function ChatText({ text }) {
  const m = text.match(/^(.*?)\s*\/duel\/([A-Za-z0-9]{6})\b(.*)$/s);
  if (!m) return text;
  return <>{m[1]} <Link to={`/duel/${m[2].toUpperCase()}`} className="lounge-join">참가하기 →</Link>{m[3]}</>;
}
const KEEP = 200;
const SEEN_KEY = 'lounge:seen';

// 서버는 반응을 이모지 → 누른 사람(방문자 ID 앞 8자) 목록으로 보낸다
const reactionList = (m, me) => Object.entries(m.reactions || {})
  .map(([emoji, who]) => ({ emoji, count: who.length, mine: who.includes(me) }));

const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };
const writeSeen = (id) => { try { localStorage.setItem(SEEN_KEY, String(id)); } catch { /* storage unavailable */ } };

// 접속해 있는 사람들이 함께 쓰는 채팅 창. 닫혀 있을 때도 가끔 새 글을 확인해 헤더에 알림 점을 띄운다
export default function LoungeChat({ open, online, onClose, onOnline, onUnread, directUnread = 0, directTarget = null }) {
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
  // 프로필 카드에서 1:1 대화를 누르면 친구 · 1:1 대화 탭으로 넘어간다
  const [lastTarget, setLastTarget] = useState(null);
  if (directTarget && directTarget !== lastTarget) { setLastTarget(directTarget); setTab('direct'); }
  const [unseen, setUnseen] = useState(0);
  const inputRef = useRef(null);
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
        .filter(inHistory).sort((a, b) => a.id - b.id).slice(-KEEP);
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
    source.onerror = () => setStreaming(false); // EventSource reconnects; polling covers the gap.
    return () => { source.close(); setStreaming(false); };
  }, [open, take, onOnline]);

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

  // 맨 아래를 보고 있을 때만 새 글을 따라 내려간다
  // 위로 올려 읽는 중에 새 글이 오면 '새 메시지' 버튼에 개수를 띄운다
  const seenCount = useRef(0);
  useEffect(() => {
    const list = listRef.current;
    const added = messages.length - seenCount.current;
    seenCount.current = messages.length;
    if (open && list && stick.current) list.scrollTop = list.scrollHeight;
    else if (open && added > 0) setUnseen(n => n + added);
  }, [messages, pending, open, ready, tab]);
  const toBottom = () => {
    const list = listRef.current;
    stick.current = true; setUnseen(0);
    if (list) list.scrollTop = list.scrollHeight;
  };

  // 반응은 먼저 화면에 그리고, 서버가 돌려준 결과로 맞춘다
  const react = async (message, emoji) => {
    const id = visitorId();
    if (!id) return;
    const had = (message.reactions?.[emoji] || []).includes(me);
    setMessages(prev => prev.map(m => {
      if (m.id !== message.id) return m;
      const who = m.reactions?.[emoji] || [];
      const next = had ? who.filter(v => v !== me) : [...who, me];
      const reactions = { ...(m.reactions || {}) };
      if (next.length) reactions[emoji] = next; else delete reactions[emoji];
      return { ...m, reactions };
    }));
    try {
      const { data } = await api.post(`/lounge/messages/${message.id}/reactions`, { visitorId: id, emoji }, { timeout: 20000 });
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, reactions: data.reactions } : m));
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, reactions: message.reactions } : m));
      setError(err.response?.data?.error || '반응을 남기지 못했습니다.');
    }
  };
  const addEmoji = e => { setText(t => (t + e).slice(0, TEXT_MAX)); inputRef.current?.focus(); };

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

  const looks = usePublicLooks([...messages.map(m => m.nickname), ...participants.map(p => p.nickname)]);
  if (!open) return null;

  const others = participants.filter(p => p.id !== self);
  const rows = layout(messages, m => `${m.visitor}:${m.nickname}`);
  return (
    <section className="lounge" aria-label="채팅">
      <header className="lounge-head">
        <div className="lounge-title">
          <strong>공부방 채팅</strong>
          <span className="lounge-online"><i aria-hidden="true" />{online > 0 ? `${online}명 접속 중` : '접속 인원 확인 중'}</span>
        </div>
        <button type="button" className="lounge-close" onClick={onClose} aria-label="채팅 닫기">×</button>
      </header>

      <div className="lounge-tabs" role="tablist">
        <button type="button" role="tab" aria-pressed={tab === 'public'} aria-selected={tab === 'public'} onClick={() => setTab('public')}>전체 채팅</button>
        <button type="button" role="tab" aria-pressed={tab === 'direct'} aria-selected={tab === 'direct'} onClick={() => setTab('direct')}>
          친구 · 1:1 대화{directUnread > 0 && <span className="lounge-tab-badge">{directUnread > 99 ? '99+' : directUnread}</span>}
        </button>
      </div>
      {tab === 'direct' ? <DirectChat key={identity} participants={participants} self={self} openWith={directTarget} /> : <>

      <div className="lounge-participants" aria-label="사이트 접속자">
        <div className="lounge-participants-head">
          <strong>지금 접속 중 <em>{participants.length}</em></strong>
          {room && <Link to={`/duel/${room}`} onClick={onClose}>내 대결 방 입장 →</Link>}
        </div>
        <div className="lounge-people">
          {participants.length === 0 && <span className="lounge-people-empty">접속자를 확인하는 중…</span>}
          {participants.filter(p => p.id === self).map(p => (
            <div key={p.id} className="lounge-person me"><Avatar name={p.nickname} online small look={looks[p.nickname]} /><span><ProfileName nickname={p.nickname} /> (나)</span></div>
          ))}
          {others.map(person => (
            <div key={person.id} className="lounge-person">
              <Avatar name={person.nickname} online small look={looks[person.nickname]} />
              <span title={person.nickname}><ProfileName nickname={person.nickname} /></span>
              <button type="button" disabled={!self || challenging || sending} onClick={() => challenge(person)}>대결 신청</button>
            </div>
          ))}
        </div>
      </div>

      <div className="lounge-list-wrap">
        <div className="lounge-list" ref={listRef}
          onScroll={e => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            if (stick.current) setUnseen(0);
          }}>
          {!ready && <p className="lounge-empty">불러오는 중... 서버가 잠들어 있으면 1~2분 걸립니다</p>}
          {ready && messages.length === 0 && <p className="lounge-empty"><span aria-hidden="true">👋</span>아직 대화가 없습니다. 첫 인사를 남겨 보세요</p>}
          {rows.map(({ m, day, first, last }) => {
            const mine = m.visitor === me;
            return (
              <div key={m.id} className="lounge-row-wrap">
                {day && <DayDivider at={m.at} />}
                <div className={`lounge-msg${mine ? ' mine' : ''}${first ? ' first' : ''}${last ? ' last' : ''}`}>
                  {!mine && (first ? <Avatar name={m.nickname} look={looks[m.nickname]} /> : <span className="chat-avatar-gap" />)}
                  <div className="lounge-msg-body">
                    {!mine && first && <span className="lounge-meta"><ProfileName nickname={m.nickname} /></span>}
                    <div className="lounge-line">
                      <span className="lounge-bubble"><ChatText text={m.text} /></span>
                      {last && <time className="lounge-time" dateTime={m.at}>{clock(m.at)}</time>}
                      <ReactionPicker onPick={emoji => react(m, emoji)} />
                    </div>
                    <ReactionChips items={reactionList(m, me)} onToggle={emoji => react(m, emoji)} />
                  </div>
                </div>
              </div>
            );
          })}
          {pending.map(m => <div key={m.clientId} className="lounge-msg mine last pending">
            <div className="lounge-msg-body">
              <div className="lounge-line">
                <span className="lounge-bubble"><ChatText text={m.text} /></span>
              </div>
              <span className={`lounge-status${m.status === 'failed' ? ' failed' : ''}`}>{m.status === 'failed' ? '전송 실패' : '전송 중…'}
                {m.status === 'failed' && <button type="button" disabled={sending} onClick={() => deliver(m)}>재시도</button>}
              </span>
            </div>
          </div>)}
        </div>
        {unseen > 0 && <button type="button" className="lounge-jump" onClick={toBottom}>새 메시지 {unseen}개 ↓</button>}
      </div>

      {error && <p className="lounge-error" role="alert">{error}</p>}
      <form className="lounge-form" onSubmit={send}>
        <EmojiButton onPick={addEmoji} />
        <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} maxLength={TEXT_MAX} placeholder="메시지 보내기" aria-label="메시지" />
        <button type="submit" className="chat-send" disabled={sending || !text.trim()} aria-label="보내기"><SendIcon /></button>
      </form>

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
      </>}
    </section>
  );
}
