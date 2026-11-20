import { Link } from 'react-router-dom';

const AWS_BOOKING = 'https://aws.amazon.com/ko/certification/certification-prep/testing/';
const DATAQ = 'https://www.dataq.or.kr/';
const CERTIFICATIONS = [
  { name: '정보처리기사', description: '소프트웨어 개발 · 데이터베이스 · 정보시스템 기본기', provider: 'Q-Net', href: 'https://www.q-net.or.kr/rcv001.do?id=rcv00103&gSite=Q&gId=' },
  { name: '빅데이터분석기사', description: '데이터 전처리 · 분석 · 모델링', provider: '데이터자격검정', href: DATAQ },
  { name: '정보보안기사', description: '시스템 · 네트워크 · 애플리케이션 보안', provider: 'KCA 국가기술자격검정', href: 'https://www.cq.or.kr/' },
  { name: 'SQLD', description: 'SQL 개발자 · 데이터 모델링과 SQL 기본기', provider: '데이터자격검정', href: DATAQ },
  { name: 'ADsP', description: '데이터분석 준전문가 · 분석 기획과 통계 기초', provider: '데이터자격검정', href: DATAQ },
  { name: 'AICE Associate', description: 'Python 기반 데이터 분석 · AI 모델링', provider: 'AICE', href: 'https://aice.study/certi/examSchedule' },
  { name: 'AWS SAA-C03', description: 'Solutions Architect – Associate · 클라우드 아키텍처 설계', provider: 'AWS Certification', href: AWS_BOOKING },
  { name: 'AWS DVA-C03', description: 'Developer – Associate · AWS 애플리케이션 개발', provider: 'AWS Certification', href: AWS_BOOKING },
];
const ADDITIONAL = [
  { name: '리눅스마스터 2급', description: '서버 운영을 준비한다면 · Linux 명령어와 시스템 관리', provider: 'KAIT 자격검정', href: 'https://www.ihd.or.kr/' },
  { name: '네트워크관리사 2급', description: '인프라 분야에 관심 있다면 · 네트워크 구축과 운영', provider: '한국정보통신자격협회', href: 'https://www.icqa.or.kr/cn/index.php' },
  { name: 'AWS AI Practitioner · AIF-C01', description: '클라우드 AI 입문 · AI 개념과 AWS AI 서비스 이해', provider: 'AWS Certification', href: AWS_BOOKING },
];

function CertificateCards({ items }) {
  return <div className="exam-sections">
    {items.map(item => <a key={item.name} href={item.href} target="_blank" rel="noopener noreferrer"
      className="exam-section" aria-label={`${item.name} 공식 접수 사이트 (새 탭에서 열림)`}>
      <span className="t">{item.name}</span>
      <span className="d">{item.description}</span>
      <span className="d">{item.provider} · 공식 접수 사이트 <span aria-hidden="true">↗</span></span>
    </a>)}
  </div>;
}

export default function CertificationsPage() {
  return <div className="fade-in">
    <div className="page-header">
      <Link to="/" className="back-link">← 홈으로</Link>
      <h1>추천 자격증</h1>
      <p>개발·데이터·AI·클라우드 분야의 자격증을 모았어요. 관심 있는 자격증을 누르면 공식 접수 사이트가 새 탭에서 열려요.</p>
    </div>
    <CertificateCards items={CERTIFICATIONS} />
    <section style={{ marginTop: 28 }} aria-labelledby="additional-certifications">
      <h2 id="additional-certifications" className="section-title">함께 살펴볼 추천 자격증</h2>
      <CertificateCards items={ADDITIONAL} />
    </section>
  </div>;
}
