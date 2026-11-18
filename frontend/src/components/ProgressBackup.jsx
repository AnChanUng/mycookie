import { useRef, useState, useSyncExternalStore } from 'react';
import { BANKS, PRIVATE_BANK_KEYS } from '../data/examQuestions';
import { mergeProgress, syncAllProgress } from '../hooks/useExamProgress';
import { account, onAccountChange, signIn, signOut } from '../sync';

const localKey = (company) => `exam-progress:${company}`;
// 백업·동기화 대상. 주제별 통합 문제집은 문제은행 목록에 없지만 기록은 따로 쌓이므로 함께 챙긴다
const KEYS = [...BANKS.map(b => b.key), ...PRIVATE_BANK_KEYS, 'topics', 'bug-hunt'];

function readAll() {
  const out = {};
  for (const key of KEYS) {
    try {
      const raw = localStorage.getItem(localKey(key));
      if (raw) out[key] = JSON.parse(raw);
    } catch {
      /* skip unreadable entry */
    }
  }
  return out;
}

const fmtDate = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

const nicknameOf = () => account()?.nickname || '';
const errorText = (err) => err?.response?.data?.error
  || (err?.response ? '요청을 처리하지 못했습니다.' : '서버에 연결하지 못했습니다. 서버가 깨어나는 중일 수 있으니 잠시 뒤에 다시 시도해 주세요.');

// 닉네임 + 비밀번호로 로그인해 두면 풀이 기록이 서버에도 저장되어 다른 기기에서 이어서 볼 수 있다
function ProgressSync() {
  const nickname = useSyncExternalStore(onAccountChange, nicknameOf);
  const [form, setForm] = useState({ nickname: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const syncAll = async () => {
    const n = await syncAllProgress(KEYS);
    setMsg(n ? `${n}개 문제은행 기록을 서버와 맞췄습니다.` : '아직 맞출 풀이 기록이 없습니다.');
  };
  const run = async (job) => {
    setBusy(true);
    setMsg('서버에 연결하는 중입니다…');
    try { await job(); } catch (err) { setMsg(errorText(err)); } finally { setBusy(false); }
  };
  const enter = (mode) => run(async () => {
    await signIn(mode, form.nickname.trim(), form.password);
    setForm({ nickname: '', password: '' });
    await syncAll();
  });

  return (
    <div className="exam-backup">
      <div className="exam-backup-text">
        <strong>기기 간 동기화</strong>
        <span>{nickname
          ? `${nickname} 계정으로 로그인되어 있습니다. 문제를 풀 때마다 기록이 서버에 저장되고, 같은 계정으로 로그인한 다른 기기와 합쳐집니다.`
          : '닉네임과 비밀번호를 정해 로그인하면 폰과 PC에서 같은 오답·북마크·응시 이력을 볼 수 있습니다. 로그인하지 않아도 지금처럼 쓸 수 있습니다.'}</span>
      </div>
      {nickname ? (
        <div className="exam-backup-actions">
          <button type="button" className="exam-btn sm" disabled={busy} onClick={() => run(syncAll)}>지금 동기화</button>
          <button type="button" className="exam-btn sm" disabled={busy} onClick={() => run(async () => { await signOut(); setMsg('로그아웃했습니다. 이 브라우저의 기록은 그대로 남아 있습니다.'); })}>로그아웃</button>
        </div>
      ) : (
        <form className="exam-sync-form" onSubmit={e => { e.preventDefault(); enter('login'); }}>
          <input type="text" placeholder="닉네임" autoComplete="username" maxLength={20} value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} />
          <input type="password" placeholder="비밀번호" autoComplete="current-password" maxLength={72} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          <button type="submit" className="exam-btn sm primary" disabled={busy || !form.nickname.trim() || !form.password}>로그인</button>
          <button type="button" className="exam-btn sm" disabled={busy || !form.nickname.trim() || !form.password} onClick={() => enter('register')}>새 계정 만들기</button>
        </form>
      )}
      {msg && <div className="exam-backup-msg">{msg}</div>}
    </div>
  );
}

// 풀이 기록 전체를 JSON 파일로 내려받거나 다시 합쳐 넣는다
export default function ProgressBackup() {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');

  const download = () => {
    const data = readAll();
    const companies = Object.keys(data);
    if (!companies.length) { setMsg('아직 저장된 풀이 기록이 없습니다.'); return; }
    const payload = { app: 'cs-exam-progress', version: 1, exportedAt: new Date().toISOString(), progress: data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-progress-${fmtDate()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const wrong = companies.reduce((n, k) => n + Object.values(data[k].stats || {}).filter(s => s.last === 'w').length, 0);
    setMsg(`${companies.length}개 문제은행 기록(현재 오답 ${wrong}문제)을 내려받았습니다.`);
  };

  const restore = async (file) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      if (parsed?.app !== 'cs-exam-progress' || !parsed.progress) throw new Error('format');
      let merged = 0;
      for (const [key, incoming] of Object.entries(parsed.progress)) {
        if (!KEYS.includes(key)) continue;
        const k = localKey(key);
        let current = null;
        try { current = JSON.parse(localStorage.getItem(k)); } catch { /* treat as empty */ }
        // 기존 기록을 덮어쓰지 않고 합친다 (문제별로는 더 최근 풀이, 응시 이력은 합집합)
        const next = mergeProgress(current || { stats: {}, history: [], marks: {}, updatedAt: 0 }, incoming);
        localStorage.setItem(k, JSON.stringify({ ...next, updatedAt: Date.now() }));
        merged++;
      }
      setMsg(`${merged}개 문제은행 기록을 합쳤습니다.`);
      if (account()) syncAllProgress(KEYS).catch(() => {});
    } catch {
      setMsg('이 사이트에서 내려받은 백업 파일이 아닙니다.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
    <ProgressSync />
    <div className="exam-backup">
      <div className="exam-backup-text">
        <strong>풀이 기록 백업</strong>
        <span>오답·북마크·응시 이력은 이 브라우저에 저장됩니다. 파일로 남겨 두면 기기를 바꾸거나 브라우저 데이터가 지워져도 되돌릴 수 있습니다.</span>
      </div>
      <div className="exam-backup-actions">
        <button type="button" className="exam-btn sm" onClick={download}>JSON으로 내려받기</button>
        <button type="button" className="exam-btn sm" onClick={() => fileRef.current?.click()}>백업 파일 합치기</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={e => restore(e.target.files?.[0])} />
      </div>
      {msg && <div className="exam-backup-msg">{msg}</div>}
    </div>
    </>
  );
}
