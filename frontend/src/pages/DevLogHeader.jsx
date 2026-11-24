import { useEffect, useState } from 'react';
import api from '../api';
import { account } from '../sync';

// 개발 일지 맨 위 안내 줄(Grafana, Swagger, 홈서버 접속 방법 등). 서버에 저장하고,
// 저장소 주인(OWNER)만 "고치기"로 줄을 바꾸거나 지우거나 더할 수 있다. 서버에 못 닿으면 기본 줄을 보여 준다
const DEFAULT_LINES = [
  { label: 'Grafana', value: 'https://grafana.mycookie.dev' },
  { label: 'Swagger(API 문서, 개발 서버)', value: 'https://staging.mycookie.dev/api/docs' },
  { label: '홈서버', value: 'ssh@ip' },
];
const MAX_LINES = 12;
const auth = () => (account()?.token ? { Authorization: `Bearer ${account().token}` } : {});
const isLink = value => /^https?:\/\/\S+$/.test(value);

export default function DevLogHeader() {
  const [state, setState] = useState({ lines: DEFAULT_LINES, version: null, canEdit: false });
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/devlog/header', { headers: auth(), timeout: 15000 })
      .then(({ data }) => {
        if (alive && Array.isArray(data?.lines)) setState({ lines: data.lines, version: data.version ?? null, canEdit: !!data.canEdit });
      })
      .catch(() => { /* 서버에 못 닿으면 기본 줄을 그대로 보여 준다 */ });
    return () => { alive = false; };
  }, []);

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const { data } = await api.put('/devlog/header', { lines: draft, version: state.version }, { headers: auth(), timeout: 15000 });
      setState({ lines: data.lines, version: data.version ?? null, canEdit: true });
      setDraft(null);
    } catch (error) {
      setMessage(error?.response?.data?.error || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally { setBusy(false); }
  };
  const setLine = (i, patch) => setDraft(lines => lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  if (draft) return (
    <div className="dl-editor dl-header-editor">
      <ul className="dl-edit-items">
        {draft.map((line, i) => (
          <li key={i} className="dl-edit-line">
            <input aria-label={`${i + 1}번째 줄 이름`} placeholder="이름 (예: 홈서버)" maxLength={40} value={line.label}
              onChange={e => setLine(i, { label: e.target.value })} />
            <input aria-label={`${i + 1}번째 줄 내용`} placeholder="내용 (예: ssh 계정@주소)" maxLength={300} value={line.value}
              onChange={e => setLine(i, { value: e.target.value })} />
            <button type="button" className="dl-x" aria-label={`${i + 1}번째 줄 지우기`} onClick={() => setDraft(lines => lines.filter((_, j) => j !== i))}>✕</button>
          </li>
        ))}
      </ul>
      <button type="button" className="dl-add" disabled={draft.length >= MAX_LINES} onClick={() => setDraft(lines => [...lines, { label: '', value: '' }])}>+ 줄 추가</button>
      {message && <p className="dl-hint" role="alert">{message}</p>}
      <div className="dl-tools">
        <button type="button" className="dl-goal-btn" disabled={busy} onClick={save}>저장</button>
        <button type="button" className="dl-goal-btn" disabled={busy} onClick={() => { setDraft(null); setMessage(''); }}>취소</button>
      </div>
    </div>
  );

  return (
    <div className="dl-header-lines">
      {state.lines.map((line, i) => (
        <p className="ob-lead" key={i}>
          {line.label && <>{line.label}: </>}
          {isLink(line.value) ? <a href={line.value} target="_blank" rel="noopener noreferrer">{line.value}</a> : line.value}
        </p>
      ))}
      {state.canEdit && (
        <button type="button" className="dl-goal-btn dl-header-edit" onClick={() => setDraft(state.lines.map(l => ({ label: l.label || '', value: l.value || '' })))}>
          안내 줄 고치기
        </button>
      )}
    </div>
  );
}
