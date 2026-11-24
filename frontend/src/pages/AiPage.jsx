import { AI_SECTIONS, AI_QUESTIONS } from '../data/aiQuestions';
import { HubCard, HubFeature, HubHeader, HubSection } from '../components/Hub';

// 과목마다 붙이는 아이콘(글자 대신 그림으로 한눈에 구분)
const ICONS = { dl: '🧠', ml: '📈', bda: '🗂️' };

// AI 공부 첫 화면. 전체 문제집을 맨 위에 크게 두고, 아래에 과목별 칸을 둔다.
// 어느 칸을 눌러도 AI 문제집(/ai/ai)으로 가고, 거기서 과목을 골라 푼다
export default function AiPage() {
  const sections = Object.entries(AI_SECTIONS);
  return <div className="fade-in">
    <HubHeader eyebrow="AI 문제집" title="AI"
      desc="딥러닝 기초부터 머신러닝 모델링, 빅데이터 AI 실무까지 정답과 해설로 공부하세요."
      stats={[{ value: AI_QUESTIONS.length, label: '전체 문제' }, { value: sections.length, label: '과목' }, { value: '해설', label: '문제마다' }]} />
    <HubFeature to="/ai/ai" icon="✨" title="AI 전체 문제집" desc="세 과목을 섞어 풀거나, 과목을 골라 집중해서 풀 수 있어요."
      meta={`${AI_QUESTIONS.length}문제`} cta="전체 풀기" />
    <HubSection title="과목별로 풀기">
      {sections.map(([key, s]) => (
        <HubCard key={key} to="/ai/ai" icon={ICONS[key] || '📘'} badge={`${s.count}문제`} title={s.name} topics={s.sub}
          label={`${s.name} ${s.count}문제 풀기`} />
      ))}
    </HubSection>
  </div>;
}
