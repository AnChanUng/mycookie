import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './StudyNotice.css';

// 첫 화면 공지. 화면 가운데에 짧게 한 가지 소식만 띄운다.
// 새 공지를 올리면 NOTICE를 바꾼다. 날짜가 바뀌면 예전 공지에서 "다시 보지 않기"를 누른 사람에게도 한 번 열린다
const NOTICE = { date: '2026-11-26', title: '포인트 상점이 열렸어요', go: { to: '/shop', label: '상점 가기' } };
const DISMISSED_KEY = `study:notice:${NOTICE.date}:dismissed`;

export default function StudyNotice() {
  const dialog = useRef(null);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISSED_KEY) === 'true'; } catch { /* Storage unavailable. */ }
    if (!dismissed && !dialog.current?.open) dialog.current?.showModal();
  }, []);
  const close = () => dialog.current?.close();
  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch { /* Still allow closing. */ }
    close();
  };
  return (
    <dialog className="study-notice" ref={dialog} aria-labelledby="study-notice-title">
      <span className="study-notice-label">공지사항 · <time dateTime={NOTICE.date}>{NOTICE.date.replaceAll('-', '.')}</time></span>
      <h2 id="study-notice-title">{NOTICE.title}</h2>
      <Link className="study-notice-go" to={NOTICE.go.to} onClick={dismiss}>{NOTICE.go.label}</Link>
      <div className="study-notice-actions">
        <button className="study-notice-dismiss" type="button" onClick={dismiss}>다시 보지 않기</button>
        <button className="study-notice-confirm" type="button" autoFocus onClick={close}>닫기</button>
      </div>
    </dialog>
  );
}
