import { useEffect, useId, useState } from 'react';
import TierBadge from './TierBadge';
import { TIER_NAMES } from '../membership';

// 순위 제목 옆 "등급 안내" 버튼. 누르면 순위 올리는 법과 등급별 기준표를 가운데 큰 창으로 보여 준다(웹 화면 기준)
// 숫자는 지금까지 푼 "서로 다른 문제"의 누적 개수. 기준은 백엔드 등급 계산과 같아야 한다
const DIVISIONS = ['Ⅴ', 'Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'];
const TIERS = [
  ['BRONZE', '처음 오면 누구나', ['0~4', '5~11', '12~24', '25~44', '45~49']],
  ['SILVER', '서로 다른 문제 50개 이상', ['50~59', '60~79', '80~99', '100~119', '120~149']],
  ['GOLD', '서로 다른 문제 150개 이상', ['150~169', '170~199', '200~229', '230~259', '260~299']],
  ['DIAMOND', '서로 다른 문제 300개 이상', ['300~349', '350~449', '450~649', '650~949', '950~999']],
  ['RUBY', '서로 다른 문제 1,000개 이상', ['1,000~1,099', '1,100~1,299', '1,300~1,699', '1,700~2,299', '2,300 이상']],
];
const STEPS = [
  ['문제를 풀어요', '전공노트 · 모의고사 · 대결 등 어디서 풀든 서로 다른 문제 수가 쌓여요. 같은 문제를 여러 번 풀면 1문제로 셉니다.'],
  ['로그인해 두세요', '로그인하면 여러 기기에서 푼 문제가 한 계정으로 합쳐져 순위에 반영돼요.'],
  ['시험으로 한 번에', '승급 시험에서 95점 이상이면 바로 한 단계 올라가고, 시험으로 얻은 등급은 유지돼요.'],
];

export default function TierGuide() {
  const [open, setOpen] = useState(false);
  const id = useId();

  // 창이 열려 있으면 Esc로 닫는다
  useEffect(() => {
    if (!open || typeof document === 'undefined' || !document.addEventListener) return undefined;
    const onKey = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return <div className="tier-guide">
    <button type="button" className="tier-guide-toggle" aria-label="티어 기준 보기" title="등급 기준과 순위 올리는 법"
      aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}
      onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>등급 안내</button>
    {open && <div className="tier-guide-backdrop" onClick={() => setOpen(false)}>
      <section id={id} className="tier-guide-panel" role="dialog" aria-modal="true" aria-label="티어 등급 기준" onClick={event => event.stopPropagation()}>
        <header className="tier-guide-head">
          <h2>등급 안내 · 순위 올리는 법</h2>
          <button type="button" className="tier-guide-x" aria-label="등급 안내 닫기" onClick={() => setOpen(false)}>×</button>
        </header>

        <p className="tier-guide-lede">순위는 <b>지금까지 푼 서로 다른 문제 수</b>로 정해져요. 많이 풀수록 순위와 등급이 함께 올라갑니다.</p>
        <ol className="tier-guide-steps">
          {STEPS.map(([title, desc], i) => <li key={title}><span className="tier-guide-no">{i + 1}</span><div><b>{title}</b><p>{desc}</p></div></li>)}
        </ol>

        <div className="tier-guide-table-wrap">
          <table className="tier-guide-table">
            <caption>등급별 기준 · 누적 문제 수</caption>
            <thead><tr><th scope="col">등급</th><th scope="col">되는 방법</th>{DIVISIONS.map(d => <th key={d} scope="col">{d}</th>)}</tr></thead>
            <tbody>{TIERS.map(([tier, how, ranges]) => <tr key={tier}>
              <th scope="row"><span className="tier-guide-name"><TierBadge tier={tier} />{TIER_NAMES[tier]}</span></th>
              <td className="tier-guide-how">{how}</td>
              {ranges.map((range, i) => <td key={DIVISIONS[i]} className="num">{range}</td>)}
            </tr>)}</tbody>
          </table>
        </div>

        <ul className="tier-guide-notes">
          <li>각 등급은 Ⅴ→Ⅳ→Ⅲ→Ⅱ→Ⅰ 순서로 올라가요. 숫자는 누적 개수라 등급을 부여받거나 승급해도 초기화되지 않습니다.</li>
          <li>등급은 푼 문제 수로만 정해요. 50문제부터 은 쿠키, 150문제부터 금 쿠키, 300문제부터 다이아 쿠키, 1,000문제부터 루비 쿠키입니다.</li>
          <li>교육생 배지는 내 계정의 본인 설정에서만 확인할 수 있어요.</li>
        </ul>
        <div className="tier-guide-foot"><button type="button" className="exam-btn sm" onClick={() => setOpen(false)}>닫기</button></div>
      </section>
    </div>}
  </div>;
}
