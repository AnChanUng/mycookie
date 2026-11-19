import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EXPERIENCES, EXPERIENCE_CATEGORIES } from '../data/experiences';
import './ExperiencePage.css';

const BASE = '/p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9';
// 검사 스크립트가 쓰는 함수라 화면 파일에서 함께 내보낸다
// eslint-disable-next-line react-refresh/only-export-components
export function filterExperiences(category, query, org) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return EXPERIENCES.filter(e => (category === '전체' || e.category === category)
    && (org === '전체' || e.org === org)
    && words.every(word => [e.title,e.org,e.category,...e.tags,...e.core,e.situation,e.role,e.why,...e.actions,e.result,e.lesson,...e.questions].join(' ').toLocaleLowerCase().includes(word)));
}
export default function ExperiencePage() {
  const [category,setCategory] = useState('전체');
  const [query,setQuery] = useState('');
  const [org,setOrg] = useState('전체');
  const [expanded,setExpanded] = useState(new Set());
  const visible = filterExperiences(category,query,org);
  function toggle(id) { setExpanded(prev => { const next=new Set(prev); next.has(id)?next.delete(id):next.add(id); return next; }); }
  function reset() { setCategory('전체');setQuery('');setOrg('전체'); }
  return <main className="experience-page">
    <header className="experience-heading">
      <div><p className="experience-eyebrow">INTERVIEW EXPERIENCE BOOK</p><h1>경험을 꺼내는 연습</h1><p>문장을 외우기보다, <span className="experience-core">왜 · 어떻게 · 결과</span>를 연결해 말해 보세요.</p></div>
      <Link to={BASE}>면접 연습으로</Link>
    </header>
    <section className="experience-guide" aria-label="활용 방법">
      <span>01 질문에 맞는 경험 찾기</span><span>02 파란 핵심어로 먼저 말하기</span><span>03 상세 내용으로 빠진 근거 확인</span>
    </section>
    <div className="experience-layout">
      <aside className="experience-sidebar">
        <h2>카테고리</h2>
        <nav aria-label="경험 카테고리">{['전체',...EXPERIENCE_CATEGORIES].map(c=><button type="button" key={c} aria-pressed={category===c} onClick={()=>setCategory(c)}><span>{c}</span><span>{c==='전체'?EXPERIENCES.length:EXPERIENCES.filter(e=>e.category===c).length}</span></button>)}</nav>
        <p>같은 경험을 다른 질문에 쓸 수 있습니다. <span className="experience-core">갈등 해결 · 책임감 · 실패 개선 · 리더십</span>으로 검색해 보세요.</p>
        <details><summary>자료 확인 메모</summary><p>2026.11.03 기준 Notion 제출 자료·마스터자소서, GitHub 문서·일부 코드, 기존 면접 답변을 정리했습니다. 성과 수치는 본인 자료의 기록이며 이번에 재측정한 값은 아닙니다. 저장소의 팀 기능과 본인의 기여는 구분해 주세요.</p></details>
      </aside>
      <div className="experience-content">
        <div className="experience-search">
          <label>경험·역량 검색<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="예: 갈등 해결, 세마포어, Spring AI" /></label>
          <label>회사·프로젝트<select value={org} onChange={e=>setOrg(e.target.value)}><option>전체</option>{[...new Set(EXPERIENCES.map(e=>e.org))].map(o=><option key={o}>{o}</option>)}</select></label>
        </div>
        <div className="experience-toolbar"><p role="status">{visible.length}개 경험 <span> / 전체 {EXPERIENCES.length}개</span></p><div><button type="button" onClick={()=>setExpanded(new Set(visible.map(e=>e.id)))}>모두 펼치기</button><button type="button" onClick={()=>setExpanded(new Set())}>모두 접기</button></div></div>
        {!visible.length&&<div className="experience-empty"><h2>조건에 맞는 경험이 없습니다.</h2><p>키워드를 줄이거나 카테고리를 변경해 보세요.</p><button type="button" onClick={reset}>필터 초기화</button></div>}
        {EXPERIENCE_CATEGORIES.map(c=>{
          const group=visible.filter(e=>e.category===c);
          return group.length>0&&<section className="experience-group" key={c} aria-label={c}><h2>{c} <span>{group.length}</span></h2>
            {group.map(e=><article className="experience-card" key={e.id} id={e.id}>
              <div className="experience-meta"><span>{e.org}</span><span>{e.tags.join(' · ')}</span></div>
              <h3><button type="button" aria-expanded={expanded.has(e.id)} aria-controls={'detail-'+e.id} onClick={()=>toggle(e.id)}>{e.title}<span aria-hidden="true">{expanded.has(e.id)?'−':'+'}</span></button></h3>
              <p className="experience-core">{e.core.join(' → ')}</p>
              <p className="experience-preview">{e.situation}</p>
              {expanded.has(e.id)&&<div id={'detail-'+e.id} className="experience-detail">
                <dl>
                  <dt>S · 상황</dt><dd>{e.situation}</dd>
                  <dt>T · 내 역할</dt><dd>{e.role}</dd>
                  <dt>WHY · 선택 이유</dt><dd>{e.why}</dd>
                  <dt>A · 어떻게 했나</dt><dd><ol>{e.actions.map(a=><li key={a}>{a}</li>)}</ol></dd>
                  <dt>R · 결과</dt><dd>{e.result}</dd>
                  <dt>배운 점 · 정리</dt><dd>{e.lesson}</dd>
                </dl>
                <section className="experience-prompts"><h4>예상 꼬리질문</h4><ol>{e.questions.map((q,i)=><li key={q}><span>질문 {i+1}</span>{q}</li>)}</ol></section>
                <details className="experience-check"><summary>면접 전 확인할 내용 · {e.check.length}개</summary><ul>{e.check.map(t=><li key={t}>{t}</li>)}</ul></details>
                <footer className="experience-sources"><span>출처</span>{e.sources.map(s=>s.url.startsWith('/')?<Link key={s.url} to={s.url}>{s.label}</Link>:<a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.label} ↗</a>)}</footer>
              </div>}
            </article>)}
          </section>;
        })}
      </div>
    </div>
  </main>;
}
