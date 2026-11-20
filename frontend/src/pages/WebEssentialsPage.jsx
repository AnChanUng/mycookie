import { useEffect, useSyncExternalStore } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { WEB_ESSENTIALS, WEB_NOTE_SOURCES } from '../data/webEssentials';
import { LEVELS, levelOf } from '../data/webEssentialLevels';
import { account, onAccountChange } from '../sync';
import useNotesProgress from '../hooks/useNotesProgress';
import NoteAnswer from '../components/NoteAnswer';
import './CsNotesPage.css';
import './WebEssentialsPage.css';

const topics = ['웹 통신', '데이터와 저장소', '동시성과 실행 모델', '보안', '테스트', '설계', '개발과 운영', '학습 방향', 'Spring'];
const entries = WEB_ESSENTIALS.items;
const sections = topics.map((title, index) => ({ id: `web-topic-${index + 1}`, title, items: entries.filter(entry => entry.topic === title) }));
const numbers = new Map(sections.flatMap(section => section.items).map((entry, index) => [entry.id, index + 1]));
const tokenSnapshot = () => account()?.token || '';

export default function WebEssentialsPage() {
  const token = useSyncExternalStore(onAccountChange, tokenSnapshot, () => '');
  return <WebChannel key={token} user={token ? account() : null} />;
}

function WebChannel({ user }) {
  const { hash } = useLocation();
  const [params, setParams] = useSearchParams();
  const { data, status, toggle, retry, disabled } = useNotesProgress(user);
  const completed = entries.filter(entry => data[entry.id]?.done).length;
  // 레벨 고르기(?level=1). 비어 있으면 전체
  const level = LEVELS.some(l => String(l.level) === params.get('level')) ? Number(params.get('level')) : 0;
  const shown = sections.map(section => ({ ...section, items: level ? section.items.filter(e => levelOf(e.id) === level) : section.items })).filter(section => section.items.length);
  const pick = next => setParams(next ? { level: String(next) } : {}, { replace: true });
  const count = lv => entries.filter(e => levelOf(e.id) === lv);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
  }, [hash]);
  const statusText = {
    guest: '학습 완료 기록은 로그인 후 계정에 저장됩니다.', loading: '계정 기록을 불러오는 중…',
    saving: '계정에 저장하는 중…', saved: '계정에 저장됨',
    error: '서버 연결에 실패했습니다. 변경된 체크는 이 기기에 보관되며 재시도하면 저장됩니다.',
    expired: '로그인이 만료되었습니다. 내 계정에서 다시 로그인해 주세요.',
  }[status];

  return <div className="cs-notes web-channel">
    <header className="notes-heading">
      <div><h1>웹 필수지식</h1><p>정리한 질문과 모범답안 {entries.length}개를 한곳에 모았습니다.</p></div>
      <div className="notes-progress"><strong>학습 완료 {completed} / {entries.length}</strong><progress value={completed} max={entries.length} aria-label="웹 필수지식 학습 완료" /></div>
    </header>
    <div className="web-levels" role="tablist" aria-label="레벨">
      <button type="button" role="tab" aria-selected={!level} className={!level ? 'on' : ''} onClick={() => pick(0)}><b>전체</b><small>{entries.length}문답</small></button>
      {LEVELS.map(l => {
        const items = count(l.level), done = items.filter(e => data[e.id]?.done).length;
        return <button key={l.level} type="button" role="tab" aria-selected={level === l.level} className={level === l.level ? 'on' : ''} onClick={() => pick(l.level)}>
          <b>Lv.{l.level} {l.name}</b><small>{l.desc}</small><small className="web-level-count">{done} / {items.length} 완료</small>
        </button>;
      })}
    </div>
    <div className="notes-save-status" role="status">{statusText} {status === 'error' && <button type="button" onClick={retry}>다시 저장</button>}</div>
    <div className="web-channel-layout">
    <nav className="web-channel-toc" aria-label="웹 필수지식 목차">
      <h2>목차</h2>
      {shown.map(section => <div key={section.id} className="web-toc-group">
        <Link className="web-toc-topic" to={`/web-essentials#${section.id}`} aria-current={hash === `#${section.id}` ? 'location' : undefined}>{section.title}<small>{section.items.length}</small></Link>
        <ul>{section.items.map(entry => <li key={entry.id}>
          <Link to={`/web-essentials#${entry.id}`} className={data[entry.id]?.done ? 'is-done' : ''} aria-current={hash === `#${entry.id}` ? 'location' : undefined}>
            <span>{data[entry.id]?.done ? '✓' : numbers.get(entry.id)}</span>{entry.title}
          </Link>
        </li>)}</ul>
      </div>)}
    </nav>
    <div className="web-channel-content">
    {shown.map(section => <section key={section.id} id={section.id} className="web-channel-topic" aria-labelledby={`${section.id}-title`}>
      <h2 id={`${section.id}-title`}>{section.title}<small>{section.items.length}문답</small></h2>
      {section.items.map(entry => <article key={entry.id} id={entry.id} className="notes-detail-card">
        <div className="notes-detail-top"><span>Q{numbers.get(entry.id)} <em className={`web-level-badge lv${levelOf(entry.id)}`}>Lv.{levelOf(entry.id)} {LEVELS[levelOf(entry.id) - 1].name}</em></span><label><input type="checkbox" aria-label={`${entry.title} 학습 완료`} checked={!!data[entry.id]?.done} disabled={disabled} onChange={() => toggle(entry.id)} /> 학습 완료</label></div>
        <h3 className="notes-question">{entry.question}</h3>
        <NoteAnswer entry={entry} />
      </article>)}
    </section>)}
    </div>
    </div>
    <details className="notes-sources"><summary>참고 글과 작성 기준</summary><p>{WEB_ESSENTIALS.description}</p><a href={WEB_NOTE_SOURCES[0].url} target="_blank" rel="noreferrer">{WEB_NOTE_SOURCES[0].title} ↗</a><p>2026.10.28 최초 작성, 2026.10.29 쿠키·세션·JWT 문답 추가. 개념별 참고 문서는 각 모범답안 아래에 연결했습니다.</p></details>
  </div>;
}
