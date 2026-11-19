import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FOCUS_QUESTIONS } from '../data/deloitteAiFocus';
import { CHANUNG_QUESTIONS } from '../data/chanung';
import { ANSWER_CORES } from '../data/answerCores';
import './CompanyPrep.css';
const BASE='/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9';
const concepts=CHANUNG_QUESTIONS.filter(q=>q.id==='cu-rag'||q.id.endsWith('-concept')).map(q=>({...q,category:'AI 기초 · '+q.topic,cores:ANSWER_CORES[q.id]||[]}));
const all=[...FOCUS_QUESTIONS,...concepts];
// 검사 스크립트가 쓰는 함수라 화면 파일에서 함께 내보낸다
// eslint-disable-next-line react-refresh/only-export-components
export function selectFocus(category,query){const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);return all.filter(q=>(category==='전체'||q.category===category)&&words.every(w=>[q.question,q.answer,...q.cores].join(' ').toLowerCase().includes(w)));}
function CoreText({text,cores}){const phrases=[...cores].sort((a,b)=>b.length-a.length);const parts=[];let at=0;while(at<text.length){let start=text.length,match='';for(const p of phrases){const i=text.indexOf(p,at);if(i>=0&&i<start){start=i;match=p;}}if(start>at)parts.push(text.slice(at,start));if(!match)break;parts.push(<span className="prep-core" key={at+match}>{match}</span>);at=start+match.length;}return parts;}
export default function DeloitteAiFocusPage(){
 const [category,setCategory]=useState('전체'),[query,setQuery]=useState(''),[open,setOpen]=useState(new Set());
 const visible=selectFocus(category,query);
 const categories=[...new Set(all.map(q=>q.category))];
 function toggle(id){setOpen(prev=>{const next=new Set(prev);next.has(id)?next.delete(id):next.add(id);return next;});}
 return <div className="company-prep ai-focus-page">
 <header><p className="prep-eyebrow">DELOITTE ANJIN · IT AI ENGINEER</p><h1>AI 직무 집중 준비</h1><p>파란 핵심어로 먼저 답하고, 말하기 예시를 열어 빠진 내용을 확인하세요.</p><nav className="prep-links"><Link to={BASE}>딜로이트 면접 연습</Link><Link to={BASE+'/companies'}>기업 선택</Link><Link to={BASE+'/experience'}>경험 정리</Link></nav></header>
 <details className="prep-jd"><summary>JD에서 무엇을 준비해야 하나요?</summary><p>공식 공고의 LLM 기반 데이터 분석·처리, AI 로직·시스템 구축, 테스트·배포·운영, 인프라 구성과 우대 역량인 클라우드·Secure Coding·협업을 기준으로 예상 질문을 구성했습니다.</p><p>아래 답변은 접근 방법의 예시입니다. 계획형 답변을 실제 수행한 경험처럼 말하지 말고, 본인이 구현한 범위를 연결해 설명하세요. 안진의 실제 내부 시스템·정책을 단정한 내용은 아닙니다.</p><a href="https://join.deloitte.co.kr/WiseRecruit2/User/RecruitView.aspx?ridx=5231" target="_blank" rel="noreferrer">공식 채용공고 · 2026.11.03 확인 ↗</a></details>
 <div className="prep-focus-layout"><aside><h2>준비 영역</h2><nav aria-label="AI 준비 영역">{['전체',...categories].map(c=><button key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}>{c}<span>{c==='전체'?all.length:all.filter(q=>q.category===c).length}</span></button>)}</nav></aside>
 <section className="prep-question-list" aria-label="AI 직무 질문"><label className="prep-search">질문·핵심어 검색<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="예: RAG, 보안, 테스트, 임베딩" /></label>
 <div className="prep-toolbar"><p role="status">{visible.length}개 질문 · 실무 예상 {FOCUS_QUESTIONS.length} / AI 기초 {concepts.length}</p><button onClick={()=>setOpen(new Set())}>답변 모두 숨기기</button></div>
 {!visible.length&&<p>검색 결과가 없습니다. 다른 핵심어로 찾아보세요.</p>}
 {visible.map(q=><article className="prep-question" key={q.id}><span className="prep-topic">{q.category}</span><h2>{q.question}</h2><p className="prep-core">{q.cores.join(' → ')}</p><button className="prep-answer-toggle" aria-expanded={open.has(q.id)} aria-controls={'focus-'+q.id} onClick={()=>toggle(q.id)}>{open.has(q.id)?'답변 숨기기':'답변 보기'}</button>
 {open.has(q.id)&&<div id={'focus-'+q.id} className="prep-answer"><h3>말하기 예시</h3><p><CoreText text={q.answer} cores={q.cores}/></p>{q.followup&&<p className="prep-followup">꼬리질문 · {q.followup}</p>}</div>}</article>)}</section></div></div>;
}
