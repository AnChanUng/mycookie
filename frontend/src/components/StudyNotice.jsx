import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './StudyNotice.css';

// 첫 화면 공지. 새 공지를 올리면 맨 위 내용과 키의 날짜를 바꾼다.
// 날짜가 바뀌면 예전 공지에서 "다시 보지 않기"를 누른 사람에게도 새 공지가 한 번 열린다
const DISMISSED_KEY = 'study:notice:2026-11-26:dismissed';
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
      <span className="study-notice-label">공지사항 · <time dateTime="2026-11-26">2026.11.26</time></span>
      <h2 id="study-notice-title">포인트 상점이 열렸어요</h2>
      <p className="study-notice-body">출석 · 문제 풀이 · 승급 · 오늘의 퀘스트로 포인트를 모아 프로필 아이콘 · 테두리 · 카드 테마를 살 수 있어요.</p>
      <Link className="study-notice-go" to="/shop" onClick={dismiss}>상점 가기 →</Link>
      <div className="study-notice-update">
        <time dateTime="2026-10-15">2026.10.15</time>
        <p>면접·전공필기 대비, 키워드별 답변을 준비하는 <strong>전공노트</strong>가 추가되었습니다.</p>
      </div>
      <div className="study-notice-actions">
        <button className="study-notice-dismiss" type="button" onClick={dismiss}>다시 보지 않기</button>
        <button className="study-notice-confirm" type="button" autoFocus onClick={close}>닫기</button>
      </div>
    </dialog>
  );
}
