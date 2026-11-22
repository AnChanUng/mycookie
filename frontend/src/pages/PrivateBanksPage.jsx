import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CompanyExam } from './ExamCompanyPage';
import RoleGate from '../components/RoleGate';
import { canOpenPrivateBanks } from '../useRoles';
import { PRIVATE_BANKS_PATH } from '../privatePath';
import './CsNotesPage.css';

// 비공개 문제집(/private/banks). 주소는 숨기지 않고 계정으로 막는다: 찬웅(OWNER)이거나 서버 환경변수(PRIVATE_BANK_NICKNAMES)에 적은 계정만 열린다
// 문제 데이터는 권한을 확인한 뒤에만 따로 불러와 공개 화면 번들과 분리한다
// 주소 상수는 privatePath.js에 둔다(계정 메뉴가 이 화면 코드를 같이 불러오지 않게)
const bankPath = (id) => `${PRIVATE_BANKS_PATH}/${encodeURIComponent(id)}`;

export default function PrivateBanksPage() {
  return <RoleGate allow={canOpenPrivateBanks} title="비공개 문제집">
    <PrivateBanks />
  </RoleGate>;
}

function PrivateBanks() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let alive = true;
    import('../data/privateBanks')
      .then(m => { if (alive) setData(m); })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);

  if (loadError) return <div className="fade-in"><p role="alert">문제집을 불러오지 못했습니다. 새로고침해 주세요.</p></div>;
  if (!data) return <div className="fade-in"><p role="status">문제집을 불러오는 중…</p></div>;

  if (id) {
    const found = data.findPrivateBank(id);
    if (!found) return <div className="fade-in"><p role="alert">찾을 수 없는 문제집입니다. <Link to={PRIVATE_BANKS_PATH}>비공개 문제집 목록</Link></p></div>;
    return <CompanyExam company={found.bank} back={{ to: PRIVATE_BANKS_PATH, label: '← 비공개 문제집' }} />;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <Link to="/" className="back-link">← 홈으로</Link>
        <h1>비공개 문제집</h1>
        <p>복기 문제집과 컴퓨터일반 문제집을 모았습니다.</p>
      </div>
      {data.PRIVATE_GROUPS.map(group => (
        <section key={group.key} style={{ marginTop: 24 }}>
          <div className="section-title">{group.name}</div>
          {group.desc && <p className="exam-lede">{group.desc}</p>}
          <div className="exam-company-grid">
            {group.banks.map(bank => {
              const bankId = data.privateBankId(group, bank);
              return <Link key={bankId} to={bankPath(bankId)} className="exam-company-card">
                <span className="exam-company-abbr">{bank.abbr}</span>
                <span className="exam-company-name">{bank.name}</span>
                {bank.source?.label && <span className="exam-company-source">{bank.source.label}</span>}
                <span className="exam-company-meta">{bank.meta}</span>
              </Link>;
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
