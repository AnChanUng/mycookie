import { Link, Navigate, useParams } from 'react-router-dom';
import { COMPANIES, EXAM_CATEGORIES, SOURCE_KINDS, allQuestions, companyPath } from '../data/examQuestions';
import TrackIntro from '../components/TrackIntro';

function summary(company) {
  try {
    const raw = localStorage.getItem(`exam-progress:${company.key}`);
    if (!raw) return null;
    const d = JSON.parse(raw);
    const wrong = allQuestions(company).filter(q => d.stats?.[q.id]?.last === 'w').length;
    return { attempts: (d.history || []).length, wrong };
  } catch {
    return null;
  }
}

const NOTE = (
  <p className="exam-note">
    풀이 기록과 오답은 이 브라우저에 저장됩니다. 다른 기기로 옮기거나 브라우저 데이터를 지우기 전에는 위에서 JSON으로 내려받아 두세요.
  </p>
);

// /exam 은 분류(금융공기업 / 공기업)와 컴퓨터일반 선택, /exam/category/:category 는 그 분류의 기업 목록
export default function ExamListPage() {
  const { category: key } = useParams();
  if (!key) return <CategoryPicker />;
  const category = EXAM_CATEGORIES.find(c => c.key === key);
  if (!category || category.key === 'tech') return <Navigate to="/exam" replace />;
  if (category.hub) return <Navigate to={`/${category.hub}`} replace />;
  return <CompanyList category={category} />;
}

function CategoryPicker() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>기업별 기출문제</h1>
        <p>공기업 IT직무 전공필기 문제집 · 즉시 채점 · 오답노트 · 북마크</p>
      </div>
      <TrackIntro track="exam" />

      <div className="exam-category-grid">
        {EXAM_CATEGORIES.filter(cat => !cat.hub && cat.key !== 'tech').map(cat => (
          <CategoryCard key={cat.key} category={cat} />
        ))}
        {/* 문제 수는 문제은행 데이터를 다 읽어야 나오므로 여기서는 세지 않는다 */}
        <Link to="/topics" className="exam-company-card exam-category-card">
          <span className="exam-category-name">주제별 통합</span>
          <span className="exam-company-meta">기업 구분 없이 과목별로 모아 풀기</span>
          <span className="exam-category-count">8개 과목 · 20문제씩</span>
        </Link>
        <Link to="/calc" className="exam-company-card exam-category-card">
          <span className="exam-category-name">계산 무한 연습</span>
          <span className="exam-company-meta">숫자가 매번 바뀌는 계산 문제 · 그림 해설</span>
          <span className="exam-category-count">스케줄링 · 페이지 교체 · 서브넷 등 19종</span>
        </Link>
      </div>
    </div>
  );
}

function CategoryCard({ category }) {
  return (
    <Link to={`/exam/category/${category.key}`} className="exam-company-card exam-category-card">
      <span className="exam-category-name">{category.name}</span>
      <span className="exam-company-meta">{category.desc}</span>
      <span className="exam-category-count">{COMPANIES.filter(c => c.category === category.key).length}개 {category.unit || '기업'}</span>
    </Link>
  );
}


export function CompanyCard({ company }) {
  const s = company.ready ? summary(company) : null;
  const recall = company.source?.kind === 'recall';
  const inner = (
    <>
      <span className="exam-company-abbr">{company.abbr}</span>
      <span className="exam-company-name">{company.name}</span>
      {recall && <span className="exam-company-source">{company.source.label}</span>}
      <span className="exam-company-meta">{company.meta}</span>
      {/* 아직 안 푼 곳은 표시를 생략해 타일을 작게 유지한다 */}
      {(!company.ready || s?.attempts > 0) && (
        <span className={`exam-tag ${company.ready ? '' : 'soon'}`}>
          {!company.ready ? '준비 중' : `응시 ${s.attempts}회 · 오답 ${s.wrong}문제`}
        </span>
      )}
    </>
  );
  return company.ready ? (
    <Link to={companyPath(company)} className="exam-company-card">{inner}</Link>
  ) : (
    <div className="exam-company-card disabled">{inner}</div>
  );
}

// 복기 자료로 만든 문제은행과 출제범위만 보고 만든 예상문제집을 갈라서 보여 준다
function CompanyList({ category }) {
  const list = COMPANIES.filter(c => c.category === category.key);
  const groups = ['recall', 'predicted']
    .map(kind => ({ kind, ...SOURCE_KINDS[kind], items: list.filter(c => (c.source?.kind || 'predicted') === kind) }))
    .filter(g => g.items.length);

  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/exam" className="back-link">← 기업별 기출문제</Link>
        <h1>{category.name}</h1>
        <p>{category.desc}</p>
      </div>

      {groups.map(g => (
        <section key={g.kind} className="exam-group">
          <div className="section-title">{g.icon} {g.group} <span className="exam-group-count">{g.items.length}곳</span></div>
          <p className="exam-lede">{g.detail}</p>
          <div className="exam-company-grid compact">
            {g.items.map(c => <CompanyCard key={c.key} company={c} />)}
          </div>
        </section>
      ))}

      {NOTE}
    </div>
  );
}
