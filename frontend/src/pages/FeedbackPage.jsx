import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api, { recentFailures } from '../api';
import { BUG_FIELDS, EMPTY, bugContent, failureTime } from '../feedbackForm';
import { account } from '../sync';
import { visitorId } from '../track';
import './FeedbackPage.css';

// 건의사항 · 버그 제보. 보내면 운영자의 GitHub 저장소에 [기능개발] · [버그] 이슈로 올라간다
const KINDS = [
  { key: 'feature', name: '기능 제안', desc: '있으면 좋겠는 기능, 바꾸면 좋을 점', placeholder: '어떤 기능이 있으면 좋을까요? 어떤 상황에서 쓰고 싶은지 함께 적어 주시면 좋아요.' },
  { key: 'bug', name: '버그 제보', desc: '안 되거나 이상하게 보이는 곳' },
];
export default function FeedbackPage() {
  const location = useLocation();
  // 다른 화면에서 들어왔으면 그 화면 주소를 함께 보낸다(버그 재현용)
  const from = typeof location.state?.from === 'string' ? location.state.from : null;
  const [kind, setKind] = useState(new URLSearchParams(location.search).get('kind') === 'bug' ? 'bug' : 'feature');
  const [form, setForm] = useState(EMPTY);
  const [attach, setAttach] = useState(true);
  const failures = kind === 'bug' ? recentFailures() : [];
  const bug = kind === 'bug';
  const filled = form.title.trim() && (bug ? BUG_FIELDS.every(f => form[f.key].trim()) : form.content.trim());
  const content = bug ? bugContent(form, attach ? failures : []) : form.content.trim();
  // done: 보낸 뒤 결과. issue는 이슈 제목 앞 순번(#순번), issueUrl은 GitHub 이슈 주소(못 만들었으면 둘 다 없다)
  const [state, setState] = useState({ busy: false, done: null, error: '' });
  const current = KINDS.find(k => k.key === kind);

  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, done: null, error: '' });
    try {
      const headers = account() ? { Authorization: `Bearer ${account().token}` } : {};
      const { data } = await api.post('/feedback', { kind, title: form.title.trim(), content, visitorId: visitorId(), path: from }, { headers, timeout: 90000 });
      const issue = Number.isInteger(data?.issue) && data.issue > 0 ? data.issue : null;
      const issueUrl = typeof data?.issueUrl === 'string' && data.issueUrl.startsWith('https://github.com/') ? data.issueUrl : null;
      setState({ busy: false, done: { issue, issueUrl }, error: '' });
      setForm(EMPTY);
    } catch (error) {
      setState({ busy: false, done: null, error: error?.response?.data?.error || '보내지 못했습니다. 잠시 후 다시 시도해 주세요.' });
    }
  }

  return <div className="fb fade-in">
    <header className="page-header">
      <Link to={from || '/'} className="back-link">← {from ? '보던 화면으로' : '홈으로'}</Link>
      <h1>건의 · 제보</h1>
      <p>보내 주신 내용은 바로 개발 목록에 올라가요. 하나씩 확인해서 고치거나 만들게요.</p>
    </header>

    {state.done ? <div className="fb-card fb-done" role="status">
      {state.done.issue && <span className="fb-issue" aria-label={`이슈 번호 ${state.done.issue}번`}>#{state.done.issue}</span>}
      <b>{state.done.issue ? '접수됐어요. 고마워요!' : '잘 받았어요. 고마워요!'}</b>
      <p>확인한 뒤 다음 업데이트에 반영할게요. 반영된 내용은 패치노트에서 볼 수 있어요.</p>
      <div className="fb-actions">
        <button type="button" className="fb-submit" onClick={() => setState({ busy: false, done: null, error: '' })}>하나 더 보내기</button>
        {state.done.issueUrl && <a href={state.done.issueUrl} target="_blank" rel="noopener noreferrer" className="fb-link">GitHub에서 진행 상황 보기 ↗<span className="sr-only">(새 탭에서 열림)</span></a>}
        <Link to="/changelog" className="fb-link">패치노트 보기</Link>
      </div>
    </div> : <form className="fb-card" onSubmit={submit}>
      <div className="fb-kinds" role="radiogroup" aria-label="종류">
        {KINDS.map(k => <button key={k.key} type="button" role="radio" aria-checked={kind === k.key}
          className={`fb-kind${kind === k.key ? ' on' : ''}`} onClick={() => setKind(k.key)}>
          <b>{k.name}</b><span>{k.desc}</span>
        </button>)}
      </div>
      <label className="fb-field"><span>제목</span>
        <input maxLength={80} required value={form.title} placeholder={kind === 'bug' ? '예: 모의고사 채점 결과가 0점으로 나와요' : '예: 오답만 모아 시험 보기'}
          onChange={e => setForm({ ...form, title: e.target.value })} />
      </label>
      {bug ? BUG_FIELDS.map(f => <label key={f.key} className="fb-field"><span>{f.label}</span>
        <textarea className="fb-short" rows={f.rows} maxLength={600} required value={form[f.key]} placeholder={f.placeholder}
          onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
      </label>) : <label className="fb-field"><span>내용</span>
        <textarea rows={7} maxLength={2000} required value={form.content} placeholder={current.placeholder}
          onChange={e => setForm({ ...form, content: e.target.value })} />
        <small className="fb-count">{form.content.length} / 2000</small>
      </label>}
      {bug && failures.length > 0 && <div className="fb-attach">
        <label><input type="checkbox" checked={attach} onChange={e => setAttach(e.target.checked)} /> 최근 30분 동안 이 기기에서 실패한 요청 {failures.length}개를 함께 보내기</label>
        {attach && <ul aria-label="함께 보낼 요청 오류">{failures.map((f, i) => <li key={i}><code>{f.method} {f.path}</code> → {f.status} <span>{failureTime(f.at)}</span></li>)}</ul>}
      </div>}
      <p className="fb-note">이 내용은 운영자의 GitHub 저장소에 이슈로 등록돼요. 이름, 연락처 같은 개인정보는 적지 말아 주세요.{from && <> 보던 화면 주소(<code>{from}</code>)가 함께 전달돼요.</>}</p>
      {state.error && <p className="fb-error" role="alert">{state.error}</p>}
      <button className="fb-submit" disabled={state.busy || !filled}>{state.busy ? '보내는 중…' : '보내기'}</button>
    </form>}
  </div>;
}
