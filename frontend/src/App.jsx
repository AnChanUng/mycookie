import { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PracticeEntry from './components/PracticeEntry';
import Layout from './components/Layout';
import Home from './pages/Home';
import Landing from './pages/Landing';
import { RenewalNotice, RenewalShell } from './Renewal';
import { MAINTENANCE } from './maintenance';
import './App.css';
import './exam.css';

const PromotionExamPage = lazy(() => import('./pages/PromotionExamPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const BugHuntPage = lazy(() => import('./pages/BugHuntPage'));
const TechnicalInterviewPage = lazy(() => import('./pages/TechnicalInterviewPage'));
const ExperiencePage = lazy(() => import('./pages/ExperiencePage'));
const CompanyPrepPage = lazy(() => import('./pages/CompanyPrepPage'));
const DeloitteAiFocusPage = lazy(() => import('./pages/DeloitteAiFocusPage'));
const DeloitteLoyaltyPage = lazy(() => import('./pages/DeloitteLoyaltyPage'));
const ChanungPage = lazy(() => import('./pages/ChanungPage'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const QuestionPage = lazy(() => import('./pages/QuestionPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const AccountRetryPage = lazy(() => import('./pages/AccountRetryPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const CsHubPage = lazy(() => import('./pages/CsHubPage'));
const InterviewPracticePage = lazy(() => import('./pages/InterviewPracticePage'));
const CsNotesPage = lazy(() => import('./pages/CsNotesPage'));
const WebEssentialsPage = lazy(() => import('./pages/WebEssentialsPage'));
const WebPage = lazy(() => import('./pages/WebPage'));
const TechBlogsPage = lazy(() => import('./pages/TechBlogsPage'));
const MajorPage = lazy(() => import('./pages/MajorPage'));
const MajorExamPage = lazy(() => import('./pages/MajorExamPage'));
const ExamListPage = lazy(() => import('./pages/ExamListPage'));
const ExamCompanyPage = lazy(() => import('./pages/ExamCompanyPage'));
const PrivateChanungPage = lazy(() => import('./pages/PrivateChanungPage'));
const TopicPage = lazy(() => import('./pages/TopicPage'));
const AlgoPage = lazy(() => import('./pages/AlgoPage'));
const DuelPage = lazy(() => import('./pages/DuelPage'));
const CalcPage = lazy(() => import('./pages/CalcPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const NcsPage = lazy(() => import('./pages/NcsPage'));
const WeakPage = lazy(() => import('./pages/WeakPage'));
const SsafyPage = lazy(() => import('./pages/SsafyPage'));
const AptitudePage = lazy(() => import('./pages/AptitudePage'));
const CosProPage = lazy(() => import('./pages/CosProPage'));

function WebEssentialsRedirect() {
  const { hash, search } = useLocation();
  return <Navigate to={`/web-essentials${search}${hash}`} replace />;
}

function App() {
  if (MAINTENANCE) return (
    <BrowserRouter>
      <Routes>
        <Route path="private/chanung" element={<RenewalShell />}>
          <Route index element={<PrivateChanungPage />} />
          <Route path=":id" element={<PrivateChanungPage />} />
        </Route>
        <Route path="admin/cu" element={<Navigate to="/private/chanung/admin" replace />} />
        {/* 리뉴얼 기간에도 패치노트 · 약관은 공개한다 */}
        <Route element={<RenewalShell footer />}>
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="terms" element={<LegalPage kind="terms" />} />
          <Route path="privacy" element={<LegalPage kind="privacy" />} />
        </Route>
        <Route path="*" element={<RenewalNotice />} />
      </Routes>
    </BrowserRouter>
  );
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="all" element={<Home />} />
          <Route path="category/:slug" element={<CategoryPage />} />
          <Route path="question/:id" element={<QuestionPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="account/retry" element={<AccountRetryPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="cs" element={<CsHubPage />} />
          <Route path="interview" element={<InterviewPracticePage />} />
          <Route path="technical-interview" element={<TechnicalInterviewPage />} />
          <Route path="p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/technical" element={<TechnicalInterviewPage />} />
          <Route path="chanung" element={<PracticeEntry suffix="/companies" />} />
          <Route path="p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/companies" element={<CompanyPrepPage />} />
          <Route path="p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/ai-focus" element={<DeloitteAiFocusPage />} />
          <Route path="p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/loyalty" element={<DeloitteLoyaltyPage />} />
          <Route path="chanung/deloitte/loyalty" element={<PracticeEntry suffix="/loyalty" />} />
          <Route path="chanung/deloitte" element={<PracticeEntry />} />
          <Route path="chanung/deloitte/ai" element={<PracticeEntry suffix="/ai-focus" />} />
          <Route path="p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9" element={<ChanungPage />} />
          <Route path="chanung/experience" element={<PracticeEntry suffix="/experience" />} />
          <Route path="p/7b92e1c4-a6d8-4f03-9c51-26de8a740bf9/experience" element={<ExperiencePage />} />
          <Route path="chanung/company" element={<PracticeEntry />} />
          <Route path="ai-interview" element={<Navigate to="/" replace />} />
          <Route path="notes" element={<CsNotesPage />} />
          <Route path="web-essentials" element={<WebEssentialsPage />} />
          <Route path="notes/web-essentials" element={<WebEssentialsRedirect />} />
          <Route path="web" element={<WebPage />} />
          <Route path="tech-blogs" element={<TechBlogsPage />} />
          <Route path="web/:company" element={<ExamCompanyPage />} />
          <Route path="major" element={<MajorPage />} />
          <Route path="major/:company" element={<ExamCompanyPage />} />
          <Route path="major-exam" element={<MajorExamPage />} />
          <Route path="exam" element={<ExamListPage />} />
          <Route path="exam/category/:category" element={<ExamListPage />} />
          <Route path="exam/:company" element={<ExamCompanyPage />} />
          <Route path="ssafy" element={<SsafyPage />} />
          <Route path="ssafy/:company" element={<ExamCompanyPage />} />
          <Route path="aptitude" element={<AptitudePage />} />
          <Route path="aptitude/:company" element={<ExamCompanyPage />} />
          <Route path="aptitude/daou/cospro" element={<CosProPage />} />
          <Route path="aptitude/daou/cospro/:pid" element={<CosProPage />} />
          <Route path="computer-general" element={<Navigate to="/private/chanung" replace />} />
          <Route path="private/chanung" element={<PrivateChanungPage />} />
          <Route path="private/chanung/:id" element={<PrivateChanungPage />} />
          <Route path="topics" element={<TopicPage />} />
          <Route path="algo" element={<AlgoPage />} />
          <Route path="calc" element={<CalcPage />} />
          <Route path="promotion-exam" element={<PromotionExamPage />} />
          <Route path="bug-hunt" element={<BugHuntPage />} />
          <Route path="duel" element={<DuelPage />} />
          <Route path="duel/:code" element={<DuelPage />} />
          <Route path="ncs" element={<NcsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="weak" element={<WeakPage />} />
          <Route path="admin/cu" element={<Navigate to="/private/chanung/admin" replace />} />
          <Route path="changelog" element={<ChangelogPage />} />
          <Route path="terms" element={<LegalPage kind="terms" />} />
          <Route path="privacy" element={<LegalPage kind="privacy" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
