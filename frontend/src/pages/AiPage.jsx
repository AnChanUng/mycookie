import { Link } from 'react-router-dom';
import { AI_SECTIONS, AI_QUESTIONS } from '../data/aiQuestions';
import './AiPage.css';

// 과목마다 붙이는 아이콘(글자 대신 그림으로 한눈에 구분)
const ICONS = { dl: '🧠', ml: '📈', bda: '🗂️' };

// AI 공부 첫 화면. 전체 문제집을 맨 위에 크게 두고, 아래에 과목별 칸을 둔다.
// 어느 칸을 눌러도 AI 문제집(/ai/ai)으로 가고, 거기서 과목을 골라 푼다
export default function AiPage() {
  const sections = Object.entries(AI_SECTIONS);
  return <div className="fade-in ai-hub">
    <div className="page-header ai-hub-head">
      <Link to="/" className="back-link">← 홈으로</Link>
      <p className="ds-eyebrow">AI 문제집</p>
      <h1>AI</h1>
      <p>딥러닝 기초부터 머신러닝 모델링, 빅데이터 AI 실무까지 정답과 해설로 공부하세요.</p>
      <ul className="ai-hub-stats" aria-label="문제집 요약">
        <li><b>{AI_QUESTIONS.length}</b><span>전체 문제</span></li>
        <li><b>{sections.length}</b><span>과목</span></li>
        <li><b>해설</b><span>문제마다</span></li>
      </ul>
    </div>

    <Link to="/ai/ai" className="ai-hub-feature">
      <span className="ds-icon ai-hub-feature-icon" aria-hidden="true">✨</span>
      <span className="ai-hub-feature-body">
        <span className="ai-hub-feature-title">AI 전체 문제집</span>
        <span className="ai-hub-feature-desc">세 과목을 섞어 풀거나, 과목을 골라 집중해서 풀 수 있어요.</span>
      </span>
      <span className="ai-hub-feature-count">{AI_QUESTIONS.length}문제</span>
      <span className="ds-btn ds-btn--primary ai-hub-feature-cta">전체 풀기 <span aria-hidden="true">→</span></span>
    </Link>

    <h2 className="ai-hub-section-title">과목별로 풀기</h2>
    <div className="ai-hub-grid">
      {sections.map(([key, s]) => (
        <Link key={key} to="/ai/ai" className="ai-hub-card" aria-label={`${s.name} ${s.count}문제 풀기`}>
          <span className="ai-hub-card-top">
            <span className="ds-icon" aria-hidden="true">{ICONS[key] || '📘'}</span>
            <span className="ds-badge">{s.count}문제</span>
          </span>
          <span className="ai-hub-card-title">{s.name}</span>
          <span className="ai-hub-topics">
            {s.sub.split('·').map(t => t.trim()).filter(Boolean).map(t => <span key={t} className="ai-hub-topic">{t}</span>)}
          </span>
          <span className="ai-hub-card-go">풀러 가기 <span aria-hidden="true">→</span></span>
        </Link>
      ))}
    </div>
  </div>;
}
