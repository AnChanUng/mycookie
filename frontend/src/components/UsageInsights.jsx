import { usageInsights, USAGE_PAGES, clickName } from '../usageInsights';
import './UsageInsights.css';

const count = value => Number(value || 0).toLocaleString('ko-KR');
const criteria = [
  ['인기 기능','선택 기간의 클릭 이벤트 수','자주 쓰는 진입점을 더 찾기 쉽게 배치','클릭 수는 사람 수·만족도가 아닙니다.'],
  ['관심 페이지','선택 기간의 조회수와 고유 브라우저 수','이용이 많은 화면부터 사용성 점검','페이지 순위는 상위 20개 집계입니다.'],
  ['반복 열람','같은 페이지 조회수 ÷ 해당 페이지 브라우저 수','탐색이 반복되는지 실제 사용 흐름 확인','재학습·새로고침·자동화 방문도 포함됩니다.'],
  ['개선 검토','조회 20회 이상이고 브라우저당 조회 3회 이상','화면 동선과 안내를 점검할 후보로 사용','내부 검토 기준이며 업계 표준이나 오류 판정이 아닙니다.'],
  ['불편 제보','제보 API의 미처리 건수·다빈도 문제','제보 탭에서 내용과 오류 근거 확인','제보는 전체 기간 기준이며 선택 기간 집계와 다릅니다.'],
  ['아직 측정하지 않는 것','세션 이탈률·체류 시간·버튼 노출 대비 클릭률','세션·노출 측정이 갖춰진 뒤 계산','현재 로그만으로 이탈 이유나 만족도를 단정하지 않습니다.'],
];

export default function UsageInsights({ data, reports, onReports }) {
  const {clicks,pages,candidates,clickTotal} = usageInsights(data);
  const top = clicks.slice(0,8), max = Math.max(1,...top.map(row=>row.count));
  return <section className="usage-insights" aria-label="이용 분석">
    <header className="ui-heading"><div><span>PRODUCT INSIGHTS</span><h2>사람들이 찾는 기능, 먼저 살펴볼 화면</h2><p>최근 {data.days}일의 행동 기록과 제보를 함께 확인하세요.</p></div><b>관찰 → 가설 → 확인</b></header>
    <div className="ui-kpis">
      {[['페이지 조회',count(data.range?.views),'반복 조회 포함'],['수집된 클릭',count(clickTotal),'계측된 링크·동작만'],['풀이 완료',count(data.range?.exams),'완료 이벤트 건수'],['미처리 제보',reports?count(reports.open):'—','전체 기간 · 제보 기준']].map(([title,value,note])=><article key={title}><span>{title}</span><strong>{value}</strong><small>{note}</small></article>)}
    </div>
    <div className="ui-grid">
      <section className="ui-panel"><header><h3>많이 클릭한 기능</h3><small>선택 기간 · 동작 횟수</small></header>
        {top.length?<ol className="ui-ranking">{top.map((row,index)=><li key={`${row.path}:${row.detail}`}><span className="ui-rank">{index+1}</span><div><div className="ui-rank-label"><strong>{clickName(row.detail)}</strong><b>{count(row.count)}</b></div><small>{USAGE_PAGES[row.path] || row.path}</small><progress value={row.count} max={max} aria-label={`${clickName(row.detail)} 클릭 ${row.count}회`} /></div></li>)}</ol>:<p className="ui-empty">선택 기간의 클릭 기록이 없습니다. 주요 공개 링크와 계측된 버튼부터 기록이 쌓입니다.</p>}
        <p className="ui-footnote">새 클릭 계측은 배포 후부터 수집됩니다. 과거 기록을 복원하거나 모든 버튼을 추적하지 않습니다.</p>
      </section>
      <section className="ui-panel"><header><h3>먼저 검토할 항목</h3><small>확정된 문제 대신 확인할 가설</small></header>
        {reports == null?<p className="ui-footnote">제보 자료를 불러오지 못했습니다. 제보 탭에서 다시 확인해 주세요.</p>:reports.open>0?<button type="button" className="ui-report" onClick={onReports}><strong>미처리 제보 {count(reports.open)}건</strong><span>내용과 재현 조건 확인 →</span></button>:<p className="ui-footnote">현재 미처리 제보가 없습니다.</p>}
        {candidates.slice(0,4).map(row=><article className="ui-candidate" key={row.path}><strong>{USAGE_PAGES[row.path] || row.path}</strong><p>조회 {count(row.count)}회 · 브라우저당 {row.repeat.toFixed(1)}회</p><small>재학습인지 탐색 반복인지 확인하세요. 이 수치만으로 불편을 판단할 수 없습니다.</small></article>)}
        {!candidates.length&&<p className="ui-empty">반복 열람 기준에 해당하는 화면이 없습니다. 데이터가 적거나 사용성이 좋다는 뜻으로 단정하지 마세요.</p>}
      </section>
    </div>
    <section className="ui-panel"><header><h3>관심이 모이는 페이지</h3><small>조회 상위 최대 20개 · 선택 기간</small></header><div className="exam-table-wrap"><table className="exam-table"><thead><tr><th>페이지</th><th>조회</th><th>브라우저</th><th>브라우저당 조회</th></tr></thead><tbody>{pages.map(row=><tr key={row.path}><td>{USAGE_PAGES[row.path]||row.path}</td><td>{count(row.count)}</td><td>{count(row.visitors)}</td><td>{row.repeat===null?'—':row.repeat.toFixed(1)}</td></tr>)}</tbody></table>{!pages.length&&<p className="ui-empty">페이지 조회 기록이 없습니다.</p>}</div></section>
    <details className="ui-panel ui-criteria" open><summary>지표를 읽는 기준표</summary><div className="exam-table-wrap"><table className="exam-table"><thead><tr><th>지표</th><th>계산·판단 기준</th><th>다음 행동</th><th>해석할 때 주의</th></tr></thead><tbody>{criteria.map(row=><tr key={row[0]}>{row.map((cell,index)=><td key={index}>{cell}</td>)}</tr>)}</tbody></table></div><p className="ui-footnote">익명 브라우저 ID 기준으로 기기·브라우저가 바뀌면 다른 방문자로 집계될 수 있습니다. 일별 합계를 기간 고유 방문자로 더하지 않습니다.</p></details>
  </section>;
}
