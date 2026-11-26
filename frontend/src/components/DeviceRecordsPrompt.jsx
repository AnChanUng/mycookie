import { useEffect, useRef, useState } from 'react';
import { setDeviceRecordsAsker } from '../sync';
import './DeviceRecordsPrompt.css';

// 다른 계정으로 로그인할 때 "이 기기에 남은 기록을 이 계정에 합칠까요?"를 사이트 모양 창으로 묻는다(sync.js claimDeviceRecords).
// 창을 그냥 닫으면(Esc) 합치지 않는다. 다른 사람 기록이 섞이지 않는 쪽이 안전하고, 앞 계정 기록은 서버에 남아 있다
export default function DeviceRecordsPrompt() {
  const [request, setRequest] = useState(null);
  const dialog = useRef(null);
  const answered = useRef(false);

  useEffect(() => {
    setDeviceRecordsAsker(({ solved, nickname }) => new Promise(resolve => {
      answered.current = false;
      setRequest({ solved, nickname, resolve });
    }));
    return () => setDeviceRecordsAsker(null);
  }, []);

  useEffect(() => {
    if (request && !dialog.current?.open) dialog.current?.showModal();
  }, [request]);

  const answer = merge => {
    if (!request || answered.current) return;
    answered.current = true;
    dialog.current?.close();
    request.resolve(merge);
    setRequest(null);
  };

  return (
    <dialog className="device-records" ref={dialog} aria-labelledby="device-records-title" onClose={() => answer(false)}>
      {request && <>
        <span className="device-records-label">이 기기 학습 기록</span>
        <h2 id="device-records-title">다른 계정 기록이 남아 있어요</h2>
        <p className="device-records-body">
          이 기기에 다른 계정으로 푼 기록이 <strong>{request.solved.toLocaleString()}문제</strong> 있어요.
          지금 로그인한 <strong>{request.nickname || '계정'}</strong>에 합칠까요?
        </p>
        <button type="button" className="device-records-merge" autoFocus onClick={() => answer(true)}>이 계정에 합치기</button>
        <button type="button" className="device-records-skip" onClick={() => answer(false)}>합치지 않기</button>
        <p className="device-records-note">합치지 않으면 이 기기에 남은 기록을 지우고 이 계정 기록만 불러와요. 다른 계정 기록은 그 계정에 그대로 있어요.</p>
      </>}
    </dialog>
  );
}
