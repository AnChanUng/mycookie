import { Link } from 'react-router-dom';
import { COMPANIES, allQuestions, companyPath } from '../data/examQuestions';
import TrackIntro from '../components/TrackIntro';

// 기업별 인적성검사 문제은행. 기업마다 큰 카드 하나씩 보여 준다
const BANKS = COMPANIES.filter(c => c.category === 'aptitude' && c.ready);

// 우리 문제은행 없이 바깥 CBT로 보내는 기업. 새 탭으로 연다
const EXTERNAL = [
  {
    key: 'gsat',
    abbr: 'GSAT',
    name: '삼성 GSAT',
    meta: '삼성 직무적성검사. 링커리어 CBT에서 실전처럼 풀어 볼 수 있습니다.',
    minutes: 60,
    secs: [['20', '수리'], ['30', '추리']],
    site: '링커리어 CBT',
    url: 'https://cbt.linkareer.com/exam/detail/1230',
  },
];

// 인적성검사에 흔히 나오는 영역. 기업마다 이름은 조금씩 달라도 이 네 갈래로 묶인다
const AREAS = [
  { icon: '가', name: '언어', desc: '유의어 · 반의어 · 어휘 관계 · 맞춤법 · 독해' },
  { icon: '＋', name: '수리', desc: '속력 · 농도 · 일률 · 확률 · 수열 · 자료 계산' },
  { icon: '∴', name: '추리', desc: '명제 · 참거짓 · 배치 · 순서 · 규칙 찾기' },
  { icon: '✓', name: '문제해결', desc: '규정 적용 · 비용 비교 · 일정 · 우선순위' },
];

function progress(bank) {
  try {
    const d = JSON.parse(localStorage.getItem(`exam-progress:${bank.key}`) || 'null');
    if (!d) return null;
    const qs = allQuestions(bank);
    const last = (d.history || []).filter(h => h.mode === 'exam' || h.mode === 'set').at(-1);
    return {
      attempts: (d.history || []).length,
      solved: qs.filter(q => d.stats?.[q.id]).length,
      wrong: qs.filter(q => d.stats?.[q.id]?.last === 'w').length,
      last: last ? Math.round(last.score / last.total * 100) : null,
    };
  } catch {
    return null;
  }
}

export default function AptitudePage() {
  return (
    <div className="fade-in ssafy apt">
      <Link to="/" className="back-link">← 홈으로</Link>

      <section className="ssafy-hero">
        <div className="ssafy-hero-text">
          <span className="ssafy-eyebrow">직업기초 · 기업별 적성검사</span>
          <h1>NCS/인적성</h1>
          <p>기업별 문제를 풀고 영역별 정답률로 약한 곳을 확인하세요. 사이트 내 문제집은 시간 제한 없이 풀 수 있으며, SKCT와 삼성 GSAT는 외부 CBT로 연결됩니다.</p>
        </div>
        <div className="ssafy-hero-stats">
          <div className="ssafy-stat big"><b>{2 + BANKS.length + EXTERNAL.length}</b><span>연습할 수 있는 시험</span></div>
          <div className="ssafy-stat"><b>NCS</b><span>직업기초</span></div>
          <div className="ssafy-stat"><b>SKCT</b><span>SK</span></div>
          <div className="ssafy-stat"><b>GSAT</b><span>삼성</span></div>
        </div>
      </section>

      <TrackIntro track="aptitude" />

      <div className="apt-areas">
        {AREAS.map(a => (
          <div key={a.name} className="apt-area">
            <span className="apt-area-icon">{a.icon}</span>
            <div>
              <b>{a.name}</b>
              <span>{a.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="ssafy-grid">
        <Link to="/ncs" className="ssafy-card">
          <div className="ssafy-card-top"><span className="ssafy-tag">NCS</span></div>
          <h2>NCS 직업기초능력</h2>
          <p className="ssafy-desc">PSAT형 직업기초능력 모의고사 · 의사소통 · 수리 · 문제해결</p>
          <span className="ssafy-go">NCS 풀러 가기 →</span>
        </Link>
        <a href="https://cbt.linkareer.com/exam/detail/1231?tab=COMMUNITY" target="_blank" rel="noopener noreferrer" className="ssafy-card apt-ext">
          <div className="ssafy-card-top"><span className="ssafy-tag">SKCT</span><span className="ssafy-time">외부 사이트</span></div>
          <h2>SKCT</h2>
          <p className="ssafy-desc">SKCT 대비 연습을 링커리어 CBT에서 진행할 수 있습니다.</p>
          <div className="ssafy-foot"><div className="ssafy-progress"><div className="ssafy-progress-label">링커리어 CBT에서 새 탭으로 열립니다</div></div><span className="ssafy-go">SKCT 풀러 가기 ↗</span></div>
        </a>
        {BANKS.map(bank => {
          const qs = allQuestions(bank);
          const p = progress(bank);
          const pct = p ? Math.round(p.solved / qs.length * 100) : 0;
          const topics = [...new Set(qs.map(q => q.topic))];
          const secs = Object.entries(bank.sections);
          // 회차가 있으면 영역별 문항 수는 한 회분 기준으로 보여 준다
          const nSets = bank.sets?.length || 1;
          return (
            <Link key={bank.key} to={companyPath(bank)} className="ssafy-card">
              <div className="ssafy-card-top">
                <span className="ssafy-tag">{bank.abbr}</span>
                <span className="ssafy-time">⏱ {bank.minutes}분 · {nSets > 1 ? `${nSets}회분 ${qs.length}문항` : `${qs.length}문항`}</span>
              </div>
              <h2>{bank.name}</h2>
              <p className="ssafy-desc">{bank.meta}</p>

              <div className="ssafy-secs" style={{ gridTemplateColumns: `repeat(${secs.length}, 1fr)` }}>
                {secs.map(([k, s]) => (
                  <div key={k} className="ssafy-sec">
                    <b>{Math.round(bank.questions.filter(q => q.sec === k).length / nSets)}</b>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>

              <div className="ssafy-topics">
                {topics.slice(0, 10).map(t => <span key={t}>{t}</span>)}
                {topics.length > 10 && <span className="more">+{topics.length - 10}</span>}
              </div>

              <div className="ssafy-foot">
                <div className="ssafy-progress">
                  <div className="ssafy-progress-label">
                    {p
                      ? <>푼 문제 {p.solved}/{qs.length} · 응시 {p.attempts}회{p.last !== null && <> · 최근 {p.last}점</>} · 오답 {p.wrong}</>
                      : <>아직 풀지 않았어요 · {qs.length}문항</>}
                  </div>
                  <div className="ssafy-bar"><i style={{ width: `${pct}%` }} /></div>
                </div>
                <span className="ssafy-go">풀러 가기 →</span>
              </div>
            </Link>
          );
        })}

        {EXTERNAL.map(x => (
          <a key={x.key} href={x.url} target="_blank" rel="noopener noreferrer" className="ssafy-card apt-ext">
            <div className="ssafy-card-top">
              <span className="ssafy-tag">{x.abbr}</span>
              <span className="ssafy-time">⏱ {x.minutes}분 · 외부 사이트</span>
            </div>
            <h2>{x.name}</h2>
            <p className="ssafy-desc">{x.meta}</p>
            <div className="ssafy-secs" style={{ gridTemplateColumns: `repeat(${x.secs.length}, 1fr)` }}>
              {x.secs.map(([n, name]) => (
                <div key={name} className="ssafy-sec"><b>{n}</b><span>{name}</span></div>
              ))}
            </div>
            <div className="ssafy-foot">
              <div className="ssafy-progress">
                <div className="ssafy-progress-label">{x.site}에서 새 탭으로 열립니다</div>
              </div>
              <span className="ssafy-go">GSAT 풀러 가기 ↗</span>
            </div>
          </a>
        ))}
      </div>

      <p className="exam-note">
        풀이 기록과 오답은 이 브라우저에 저장됩니다. 문제는 응시 후기로 전해진 시험 구성을 따라 새로 만든 것이며 실제 문항의 복원이 아닙니다.
      </p>
    </div>
  );
}
