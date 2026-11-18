import { Link } from 'react-router-dom';
import { AI_SECTIONS, AI_QUESTIONS } from '../data/aiQuestions';

// AI 공부 첫 화면. 과목을 고르면 AI 문제집(/ai/ai)에서 바로 풀 수 있다
export default function AiPage() {
  return <div className="fade-in">
    <div className="page-header">
      <Link to="/" className="back-link">← 홈으로</Link>
      <h1>AI</h1>
      <p>딥러닝 기초부터 머신러닝 모델링, 빅데이터 AI 실무까지 {AI_QUESTIONS.length}문제를 정답과 해설로 공부하세요.</p>
    </div>
    <div className="exam-sections">
      <Link to="/ai/ai" className="exam-section">
        <span className="t">AI 전체 문제집</span>
        <span className="d">세 과목을 섞어 풀거나 과목별로 골라 풀기</span>
        <span className="d">{AI_QUESTIONS.length}문제 · 풀이 기록 저장 →</span>
      </Link>
      {Object.entries(AI_SECTIONS).map(([key, s]) => (
        <Link key={key} to="/ai/ai" className="exam-section">
          <span className="t">{s.name}</span>
          <span className="d">{s.sub}</span>
          <span className="d">{s.count}문제 →</span>
        </Link>
      ))}
    </div>
  </div>;
}
