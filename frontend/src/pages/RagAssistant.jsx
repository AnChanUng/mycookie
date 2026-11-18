import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const BASE = '/private/chanung';
const SLOW = { timeout: 120000 };
const EXAMPLES = ['교착 상태가 생기는 네 가지 조건은?', 'JPA에서 save 없이 값만 바꿔도 업데이트되는 이유는?', 'TCP 연결을 끊을 때 TIME_WAIT을 두는 이유는?'];

// RAG 학습 도우미. 전공 학습 자료에서 근거를 찾아 답하고, 근거가 없으면 답하지 않는다.
// 답변 모델이 아직 없으면(503) 근거만 보여 주고, RAG 서버가 없으면(404) 안내만 한다
export default function RagAssistant() {
  const [question, setQuestion] = useState('');
  const [state, setState] = useState({ status: 'idle' }); // idle | loading | answer | evidence | unavailable | error

  const ask = async (q) => {
    const text = (q ?? question).trim();
    if (!text || state.status === 'loading') return;
    setQuestion(text);
    setState({ status: 'loading' });
    try {
      const { data } = await api.post('/rag/ask', { question: text }, SLOW);
      setState({ status: 'answer', data });
    } catch (err) {
      const code = err?.response?.status;
      if (code === 503) {
        try {
          const { data } = await api.get('/rag/search', { ...SLOW, params: { q: text } });
          setState({ status: 'evidence', data });
        } catch {
          setState({ status: 'error' });
        }
      } else if (code === 404) setState({ status: 'unavailable' });
      else setState({ status: 'error', message: err?.response?.data?.error });
    }
  };

  const data = state.data;
  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to={BASE} className="back-link">← 관리자 페이지</Link>
        <h1>RAG 학습 도우미</h1>
        <p>전공 학습 자료 109개에서 근거를 찾아 답합니다. 자료에 없는 내용은 답하지 않고, 답변 문장마다 근거가 있는지 다시 확인합니다.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); ask(); }} style={{ display: 'grid', gap: 8 }}>
        <label htmlFor="rag-question" style={{ fontWeight: 600 }}>질문</label>
        <textarea id="rag-question" rows={3} maxLength={500} value={question} onChange={e => setQuestion(e.target.value)}
          placeholder="예: 프로세스와 스레드는 메모리 측면에서 뭐가 달라?"
          onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) ask(); }}
          style={{ width: '100%', boxSizing: 'border-box', padding: 12, fontSize: 16, borderRadius: 12, border: '1px solid var(--glass-border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="submit" className="exam-btn primary" disabled={!question.trim() || state.status === 'loading'}>
            {state.status === 'loading' ? '찾는 중…' : '질문하기'}
          </button>
          <span style={{ fontSize: 13, opacity: 0.7 }}>{question.length}/500 · Ctrl+Enter로 보내기</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} aria-label="예시 질문">
          {EXAMPLES.map(x => <button key={x} type="button" className="exam-btn" onClick={() => ask(x)}>{x}</button>)}
        </div>
      </form>

      <div aria-live="polite" style={{ marginTop: 20 }}>
        {state.status === 'loading' && <p role="status">학습 자료에서 근거를 찾고 있습니다. 로컬 CPU에서는 재정렬에 수십 초가 걸릴 수 있습니다.</p>}
        {state.status === 'unavailable' && <Notice>RAG 서버가 아직 배포되지 않았습니다. 로컬에서 <code>rag</code> 프로필로 백엔드를 띄우면 쓸 수 있습니다.</Notice>}
        {state.status === 'error' && <Notice>{state.message || '답변을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요.'}</Notice>}
        {state.status === 'evidence' && (
          <>
            <Notice>답변 모델이 아직 연결되지 않아 찾은 근거만 보여 줍니다.</Notice>
            {data.refused ? <Notice strong>학습 자료에서 이 질문의 근거를 찾지 못했습니다.</Notice> : <Sources items={data.sources} />}
          </>
        )}
        {state.status === 'answer' && (
          <>
            <section style={card}>
              <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>{data.refused ? '답변 거부' : '답변'}</h2>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, margin: 0, wordBreak: 'keep-all' }}>{data.answer}</p>
            </section>
            {data.grounding?.claims?.length > 0 && (
              <section style={card}>
                <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>출처 검증</h2>
                <p style={{ fontSize: 13, margin: '0 0 10px', opacity: 0.8 }}>
                  문장 {data.grounding.claims.length}개 중 근거 확인 안 됨 {data.grounding.claims.filter(c => !c.supported).length}개
                  ({Math.round(data.grounding.unsupportedRatio * 100)}%)
                </p>
                <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 6 }}>
                  {data.grounding.claims.map((c, i) => (
                    <li key={i} style={{ lineHeight: 1.6 }}>
                      <span className={`exam-tag${c.supported ? '' : ' soon'}`} style={{ marginRight: 6 }}>{c.supported ? '근거 있음' : '근거 확인 안 됨'}</span>
                      {c.sentence}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!data.refused && <Sources items={data.sources} />}
          </>
        )}
      </div>
    </div>
  );
}

const card = { marginTop: 12, padding: '14px 16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-lg)' };

function Notice({ children, strong }) {
  return <p role="status" style={{ ...card, fontWeight: strong ? 700 : 400 }}>{children}</p>;
}

function Sources({ items = [] }) {
  if (!items.length) return null;
  return (
    <section style={card}>
      <h2 style={{ fontSize: 16, margin: '0 0 8px' }}>근거 자료</h2>
      <ol style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 10 }}>
        {items.map((s, i) => (
          <li key={i}>
            <div style={{ fontWeight: 600 }}>{s.title} · {s.section}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{s.source}{typeof s.score === 'number' ? ` · 관련도 ${s.score.toFixed(3)}` : ''}</div>
            {s.snippet && <p style={{ margin: '4px 0 0', fontSize: 14, lineHeight: 1.6, wordBreak: 'keep-all' }}>{s.snippet}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
