import { useEffect, useState } from 'react';
import api from '../api';
import './CsChannelAdmin.css';
const errorText = e => e?.response?.data?.error || '요청을 처리하지 못했습니다. 다시 확인해 주세요.';
export default function CsChannelAdmin({ headers }) {
 const [data,setData]=useState(null), [message,setMessage]=useState(''), [preview,setPreview]=useState(''), [busy,setBusy]=useState(false);
 const authKey=JSON.stringify(headers);
 useEffect(()=>{
  const controller=new AbortController();
  api.get('/admin/cs-channel',{headers:JSON.parse(authKey),signal:controller.signal,timeout:15000})
   .then(r=>setData(r.data)).catch(e=>{if(!controller.signal.aborted)setMessage(errorText(e));});
  return ()=>controller.abort();
 },[authKey]);
 const refresh=async()=>{const r=await api.get('/admin/cs-channel',{headers,timeout:15000});setData(r.data);};
 async function action(path) {
  setBusy(true);setMessage('');
  try {
   const {data:result}=await api.post('/admin/cs-channel/'+path,{}, {headers,timeout:30000});
   setMessage('발송 상태: '+result.status);await refresh();
  } catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 }
 async function save(e){
  e.preventDefault();setBusy(true);setMessage('');
  try {
   const r=await api.put('/admin/cs-channel',{enabled:data.enabled,index:data.index,joinUrl:data.joinUrl,version:data.version},{headers,timeout:15000});
   setData(r.data);setPreview('');setMessage('설정을 저장했습니다.');
  }catch(e){setMessage(errorText(e));}finally{setBusy(false);}
 }
 return <section className="cs-channel-admin" aria-labelledby="cs-admin-title">
  <h2 id="cs-admin-title">CS 구독 채널 운영</h2>
  <p>보민 담당 · 웹 필수지식 선정, 미리보기, 테스트 수신, 발송 결과를 여기서 확인합니다. 발송은 평일 오전 8시 30분입니다.</p>
  {message && <p role="status">{message}</p>}
  {!data ? <button onClick={()=>refresh().catch(e=>setMessage(errorText(e)))}>새로고침</button> : <>
   {!data.configured && <p role="alert">CS 전용 웹훅을 서버에 설정해야 발송할 수 있습니다.</p>}
   <form onSubmit={save}>
    <label>채널 참여 링크<input type="url" maxLength={1000} placeholder="https://…" value={data.joinUrl} onChange={e=>setData({...data,joinUrl:e.target.value})} disabled={busy}/></label>
    <label>발송할 지식<select value={data.index} disabled={busy} onChange={e=>setData({...data,index:Number(e.target.value)})}>
     {data.catalog.map((item,index)=><option key={item.id} value={index}>{item.title}</option>)}
    </select></label>
    <label className="cs-enabled"><input type="checkbox" checked={data.enabled} disabled={busy || !data.configured} onChange={e=>setData({...data,enabled:e.target.checked})}/>자동 발송 활성화</label>
    <button disabled={busy}>설정 저장</button>
   </form>
   <p>콘텐츠와 링크를 저장한 다음 미리보기·테스트 발송으로 확인하세요. 이메일 구독과 채널 참가는 각각 신청합니다.</p>
   <div className="cs-channel-actions">
    <button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await api.get('/admin/cs-channel/preview',{headers,timeout:15000});setPreview(r.data.text);}catch(e){setMessage(errorText(e));}finally{setBusy(false);}}}>미리보기</button>
    <button disabled={busy || !data.configured} onClick={()=>action('test')}>테스트 발송</button>
    <button disabled={busy || !data.configured || !data.enabled} onClick={()=>action('send')}>오늘 지식 발송</button>
   </div>
   {preview && <pre className="cs-preview">{preview}</pre>}
   <h3>최근 발송 결과</h3>
   <p>성공한 일일 발송은 중복 전송하지 않습니다. 수신 여부가 불명확한 UNKNOWN 상태는 채널에서 직접 확인합니다.</p>
   {data.deliveries.length===0 ? <p>아직 발송 기록이 없습니다.</p> : <ul className="cs-deliveries">{data.deliveries.map(d=><li key={d.id}>
    <b>{d.id.startsWith('test-')?'테스트':d.id}</b> · {d.status} · {d.attempts}회{d.error && <p>{d.error}</p>}
    {d.status==='FAILED' && <button disabled={busy} onClick={()=>action('retry/'+encodeURIComponent(d.id))}>재시도</button>}
   </li>)}</ul>}
  </>}
 </section>;
}
