import { useEffect, useRef, useState } from 'react';
import api from '../api';
import { account } from '../sync';
import { InterviewRecorder, toWav } from '../interviewAudio';

export default function InterviewAudio({ questionId, recording, saveRecording, gradingDisabled = false, gradingHint = '', onBusyChange, studio = false }) {
  const [phase, setPhase] = useState('idle');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState('checking');
  const [url, setUrl] = useState('');
  const recorder = useRef(null);
  const controller = useRef(null);
  const live = useRef(true);
  const busy = phase !== 'idle';
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    live.current = true;
    const statusController = new AbortController();
    api.get('/interview-ai/status', { timeout: 90000, signal: statusController.signal })
      .then(({ data }) => setAvailability(data.available ? 'ready' : 'unconfigured'))
      .catch(() => { if (!statusController.signal.aborted) setAvailability('unreachable'); });
    return () => { live.current = false; statusController.abort(); recorder.current?.dispose(); controller.current?.abort(); };
  }, []);
  useEffect(() => {
    if (!recording?.blob) return;
    const objectUrl = URL.createObjectURL(recording.blob); setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [recording?.blob]);
  const update = patch => saveRecording(questionId, { ...recording, ...patch });
  const start = async () => {
    if (busy) return;
    setError(''); setSeconds(0); setPhase('permission');
    const session = new InterviewRecorder({
      onReady: () => { if (live.current) setPhase('recording'); },
      onTime: value => { if (live.current) setSeconds(value); },
      onComplete: blob => {
        if (!live.current) return;
        if (blob.size) saveRecording(questionId, { blob, transcript: '', transcribed: false, result: null });
        else setError('녹음 내용이 없습니다. 마이크를 확인해 주세요.');
        setPhase('idle');
      },
      onError: e => { if (live.current) { setError(e.message); setPhase('idle'); } },
    });
    recorder.current = session;
    try { await session.start(); }
    catch (e) { if (live.current && recorder.current === session && !session.disposed) { setError(e.name === 'NotAllowedError' ? '마이크 권한이 거부되었습니다. 브라우저 사이트 설정에서 마이크를 허용해 주세요.' : e.name === 'NotFoundError' ? '마이크를 찾지 못했습니다.' : e.message); setPhase('idle'); } }
  };
  const request = async mode => {
    if (busy || (mode === 'grading' && gradingDisabled)) return;
    const user = account();
    if (!user) { setError('AI 음성 인식과 채점은 로그인 후 사용할 수 있습니다.'); return; }
    setError(''); setPhase(mode); controller.current = new AbortController();
    const options = { timeout: 120000, signal: controller.current.signal, headers: { Authorization: `Bearer ${user.token}` } };
    try {
      if (mode === 'transcribing') {
        const wav = await toWav(recording.blob);
        if (!live.current) return;
        const form = new FormData(); form.append('audio', wav, 'answer.wav');
        const { data } = await api.post('/interview-ai/transcribe', form, options);
        if (live.current) update({ transcript: data.transcript, transcribed: true, result: null });
      } else {
        const { data } = await api.post('/interview-ai/grade', { questionId, transcript: recording.transcript }, options);
        if (live.current) update({ result: data });
      }
    } catch (e) {
      if (live.current) setError(e.response?.data?.error || (e.response?.status === 404 ? 'AI 기능의 서버 배포를 기다리고 있습니다. 녹음은 내려받아 보관할 수 있습니다.' : e.message === 'Network Error' ? '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' : e.message));
    } finally { if (live.current) setPhase('idle'); }
  };
  const aiDisabled = busy || !account() || availability === 'unconfigured';
  const result = recording?.result;
  const extension = recording?.blob?.type.includes('mp4') ? 'm4a' : recording?.blob?.type.includes('ogg') ? 'ogg' : 'webm';
  return <section className={`interview-audio${studio ? ' audio-studio' : ''}`} data-phase={phase} aria-label="음성 답변 연습">
    {studio && <div className="audio-studio-heading"><div><span className="audio-studio-label">VOICE PRACTICE</span><h3>{phase === 'recording' ? '편하게 말씀해 주세요' : recording?.blob ? '내 답변을 다시 들어 보세요' : '내 목소리로 답해 보세요'}</h3><p>{phase === 'recording' ? '결론을 먼저, 경험과 근거를 이어서 말씀해 주세요.' : '생각이 정리되면 녹음을 시작하세요. 최대 3분까지 담을 수 있어요.'}</p></div><div className="audio-studio-clock" aria-label={`녹음 시간 ${seconds}초`}><span className="audio-state-dot" /><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span><small>/ 03:00</small></div></div>}
    <div className="chanung-actions">
      {(!studio || phase !== 'recording') && <button type="button" className={studio ? 'exam-btn audio-record-start' : 'exam-btn sm'} disabled={busy} onClick={start}>{studio && <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg>}{recording?.blob ? '다시 녹음' : '녹음 시작'}</button>}
      {phase === 'permission' && <button type="button" className="exam-btn sm" onClick={() => { recorder.current?.dispose(); setPhase('idle'); }}>요청 취소</button>}
      {phase === 'recording' && <button type="button" className={studio ? 'exam-btn audio-record-stop' : 'exam-btn sm'} onClick={() => { setPhase('stopping'); recorder.current?.stop(); }}>녹음 종료</button>}
      <span aria-live="polite">{phase === 'recording' ? `녹음 중 ${seconds}초 / 180초` : phase === 'permission' ? '마이크 권한 확인 중…' : phase === 'stopping' ? '녹음 정리 중…' : phase === 'transcribing' ? '음성 인식 중…' : phase === 'grading' ? '채점 중…' : ''}</span>
    </div>
    {recording?.blob && url && <div className="audio-playback"><audio controls src={url} aria-label="내 답변 다시 듣기" /><a href={url} download={`${questionId}.${extension}`}>녹음 다운로드</a></div>}
    {!account() && <p className="audio-hint">녹음·재생은 바로 이용할 수 있습니다. {gradingDisabled ? 'AI 음성 인식은' : 'AI 인식·채점은'} 로그인해 주세요.</p>}
    {availability === 'unreachable' && <p className="audio-hint">AI 서버 상태를 확인하지 못했습니다. 녹음 후 다시 요청할 수 있습니다.</p>}
    {recording?.blob && <button type="button" className="exam-btn sm" disabled={aiDisabled} onClick={() => request('transcribing')}>녹음 내용 인식</button>}
    {recording?.transcribed && <>
      <label className="chanung-label" htmlFor="audio-transcript">{studio && gradingDisabled ? '인식된 답변 · 잘못 들린 부분을 수정해 보세요' : '인식된 답변 · 잘못 들린 부분을 수정한 뒤 채점하세요'}</label>
      <textarea id="audio-transcript" rows={5} maxLength={12000} disabled={busy} value={recording.transcript} onChange={e => update({ transcript: e.target.value, result: null })} />
      {!(studio && gradingDisabled) && <button type="button" className="exam-btn sm" disabled={aiDisabled || gradingDisabled || !recording.transcript.trim()} onClick={() => request('grading')}>확인한 답변으로 채점</button>}
    </>}
    {gradingDisabled && gradingHint && <p className="audio-hint">{gradingHint}</p>}
    {gradingDisabled && !gradingHint && !studio && <p className="audio-hint">저장된 버전에서는 녹음·재생·음성 인식을 사용할 수 있습니다. AI 채점은 최신 답변 기준이므로 최신 버전에서 이용하세요.</p>}
    {error && <p role="alert" className="audio-error">{error}</p>}
    {result && <section className="audio-result" aria-label="음성 답변 채점 결과"><h3>연습 점수 {result.total} / 100</h3>
      <ul><li>핵심 내용 {result.relevance}/40</li><li>정확성 {result.accuracy}/30</li><li>구성 {result.structure}/20</li><li>명료성 {result.clarity}/10</li></ul>
      {[['점수 근거', 'feedback'], ['잘한 점', 'strengths'], ['보완할 점', 'improvements'], ['개선 답변 예시', 'example']].map(([label, key]) => <div key={key}><h4>{label}</h4><p>{result[key]}</p></div>)}
    </section>}
  </section>;
}
