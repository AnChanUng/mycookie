import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';
import { account } from '../sync';
import './CookieAssistant.css';

export default function CookieAssistant() {
  const [enabled,setEnabled] = useState(false);
  const [open,setOpen] = useState(false);
  const [message,setMessage] = useState('');
  const [turns,setTurns] = useState([]);
  const [busy,setBusy] = useState(false);
  const [remaining,setRemaining] = useState(null);
  const input = useRef(null);
  const toggle = useRef(null);
  useEffect(() => {
    const request = new AbortController();
    api.get('/chatbot/status',{signal:request.signal}).then(r=>setEnabled(r.data.enabled)).catch(()=>{});
    return ()=>request.abort();
  },[]);
  useEffect(()=>{ if(open) input.current?.focus(); },[open]);
  function close(){ setOpen(false); toggle.current?.focus(); }
  async function send(event){
    event.preventDefault();
    const question=message.trim();
    if(!question || busy) return;
    setBusy(true); setMessage('');
    try {
      const token=account()?.token;
      const {data}=await api.post('/chatbot/ask',{message:question},{timeout:32000,headers:token?{Authorization:'Bearer '+token}:{}});
      setTurns(old=>[...old,{question,...data}]);
      setRemaining(data.remainingToday);
    } catch(error) {
      const limited=error.response?.status===429;
      setTurns(old=>[...old,{question,answer:limited?'오늘 질문 한도를 다 썼어요.':'답변을 받지 못했어요. 잠시 뒤 다시 시도해 주세요.'}]);
    } finally { setBusy(false); }
  }
  if(!enabled) return null;
  return <aside className="cookie-help" onKeyDown={e=>{if(e.key==='Escape') close();}}>
    <button
      ref={toggle}
      type="button"
      className="cookie-help-launcher"
      aria-label="쿠키 도우미 챗봇"
      title="쿠키 도우미 챗봇"
      aria-expanded={open}
      onClick={() => open ? close() : setOpen(true)}
    >
      <svg className="cookie-help-robot" width="38" height="38" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <path d="M20 12V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="6" r="2.7" className="cookie-help-robot-accent" />
        <rect x="4" y="18" width="32" height="11" rx="5.5" className="cookie-help-robot-accent" />
        <rect x="7" y="11" width="26" height="23" rx="9.5" className="cookie-help-robot-face" />
        <circle cx="15.5" cy="21" r="1.9" fill="currentColor" />
        <circle cx="24.5" cy="21" r="1.9" fill="currentColor" />
        <ellipse cx="12.5" cy="26" rx="2.2" ry="1.25" className="cookie-help-robot-cheek" />
        <ellipse cx="27.5" cy="26" rx="2.2" ry="1.25" className="cookie-help-robot-cheek" />
        <path d="M17.5 25.5a2.5 2.5 0 0 0 5 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
    {open && <section aria-label="쿠키 도우미">
      <header><strong>쿠키 도우미</strong><button disabled={busy} onClick={()=>setTurns([])}>새 대화</button><button onClick={close}>닫기</button></header>
      <small>개인정보는 입력하지 마세요.</small>
      <div className="cookie-turns" aria-live="polite">
      {!turns.length && ['트랜잭션 격리 수준이 뭐예요?','등급은 어떻게 올라가요?','대결은 어떻게 해요?','전공노트 사용법을 알려주세요.'].map(q=><button key={q} onClick={()=>{setMessage(q);input.current?.focus();}}>{q}</button>)}
      {turns.map((t,i)=><article key={i}><strong>{t.question}</strong>
        {t.sources && (!t.status || t.status==='ANSWERED') && <small>{t.grounded?'학습 자료 기반':'근거 미확인 · 틀릴 수 있어요'}</small>}
        <ReactMarkdown skipHtml components={{a:({children})=><span>{children}</span>,img:()=>null}}>{t.answer}</ReactMarkdown>
        {t.sources?.map(s=><details key={s.n}><summary>[{s.n}] {s.title}</summary>
          <p>{s.excerpt}</p><a href={s.url}>학습 메뉴 열기</a></details>)}</article>)}
      {busy && <p>자료를 찾아 답변을 작성하고 있어요…</p>}</div>
      <form onSubmit={send}><textarea ref={input} aria-label="질문" maxLength={500} value={message} onChange={e=>setMessage(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter' && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form.requestSubmit();}}}/>
        <button disabled={busy || !message.trim()}>질문 보내기</button></form>
      {remaining!==null && <small>오늘 남은 개인 질문 {remaining}회</small>}
    </section>}
  </aside>;
}
