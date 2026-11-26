import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CHANGELOG } from '../data/changelog';
import './StudyNotice.css';

// 첫 화면 공지. 공개 패치노트(changelog.js)의 한 버전을 골라 버전 번호와 바뀐 점을 보여 준다.
// 새 공지를 올리면 NOTICE의 날짜 · 버전 · 바로가기만 바꾼다. 날짜가 바뀌면 예전 공지에서 "다시 보지 않기"를 누른 사람에게도 한 번 열린다
const NOTICE = { date: '2026-11-26', version: '1.7.0', go: { to: '/shop', label: '상점 가기' } };
const DISMISSED_KEY = `study:notice:${NOTICE.date}:dismissed`;
const release = CHANGELOG.flatMap(y => y.months).find(m => m.version === NOTICE.version);

export default function StudyNotice() {
  const dialog = useRef(null);
  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISSED_KEY) === 'true'; } catch { /* Storage unavailable. */ }
    if (release && !dismissed && !dialog.current?.open) dialog.current?.showModal();
  }, []);
  if (!release) return null;
  const close = () => dialog.current?.close();
  const dismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, 'true'); } catch { /* Still allow closing. */ }
    close();
  };
  return (
    <dialog className="study-notice" ref={dialog} aria-labelledby="study-notice-title">
      <span className="study-notice-label">공지사항 · <time dateTime={NOTICE.date}>{NOTICE.date.replaceAll('-', '.')}</time></span>
      <h2 id="study-notice-title"><span className="study-notice-version">v{release.version}</span>{release.title}</h2>
      <ul className="study-notice-items">
        {release.items.slice(0, 3).map(item => <li key={item}>{item}</li>)}
      </ul>
      <div className="study-notice-links">
        <Link className="study-notice-go" to={NOTICE.go.to} onClick={dismiss}>{NOTICE.go.label} →</Link>
        <Link className="study-notice-more" to="/changelog" onClick={close}>패치노트 전체 보기</Link>
      </div>
      <div className="study-notice-actions">
        <button className="study-notice-dismiss" type="button" onClick={dismiss}>다시 보지 않기</button>
        <button className="study-notice-confirm" type="button" autoFocus onClick={close}>닫기</button>
      </div>
    </dialog>
  );
}
