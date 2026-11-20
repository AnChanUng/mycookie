import { useEffect, useState } from 'react';
import api from '../api';
export default function CsChannelJoin() {
 const [channel,setChannel]=useState(null);
 useEffect(()=>{const controller=new AbortController();api.get('/cs-channel',{signal:controller.signal,timeout:10000}).then(r=>setChannel(r.data)).catch(()=>{});return ()=>controller.abort();},[]);
 if(!channel?.joinUrl || !/^https:\/\//.test(channel.joinUrl)) return null;
 return <section className="newsletter-subscribe"><h2>SSAFY CS 학습 채널</h2><p>웹 필수지식을 Mattermost 채널에서 함께 공부해요. 이메일 구독과 별도로 채널에 참여해 주세요.{!channel.enabled && ' 현재 정기 발송은 준비 중이거나 중지되어 있습니다.'}</p><a href={channel.joinUrl} target="_blank" rel="noopener noreferrer">CS 채널 참여하기 →</a></section>;
}
