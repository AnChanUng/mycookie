// 고정된 공개 화면 이름만 수집한다. 쿼리·해시·사용자별 경로·클릭한 문구는 보내지 않는다.
export const USAGE_PAGES = {'/':'홈','/notes':'전공노트','/web-essentials':'웹노트','/interview':'면접 연습','/exam':'전공필기','/topics':'주제별 문제','/duel':'대결','/web':'웹 개발','/study-coach':'학습 코치','/algo':'코딩테스트','/certifications':'자격증','/ncs':'NCS','/stats':'내 학습','/rank':'순위','/shop':'상점','/feedback':'건의·제보'};
export const USAGE_ACTIONS = {record_start:'녹음 시작',record_stop:'녹음 종료',random_question:'랜덤 질문',reveal_answer:'답안 확인'};
const canonical = path => {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')) return null;
  const clean = path.split(/[?#]/)[0];
  if (Object.hasOwn(USAGE_PAGES, clean)) return clean;
  return ['/exam/','/topics/','/duel/'].find(prefix => clean.startsWith(prefix))?.slice(0,-1) || null;
};
export function navigationSignal(source, destination) {
  const path = canonical(source), target = canonical(destination);
  return path && target && path !== target ? {path, detail:`open:${target}`} : null;
}
export function installUsageClicks(target, location, emit) {
  const click = event => {
    const source = canonical(location.pathname);
    if (!source) return;
    const action = event.target?.closest?.('[data-usage-action]');
    if (action && !action.disabled && Object.hasOwn(USAGE_ACTIONS, action.dataset.usageAction)) {
      emit('click', source, action.dataset.usageAction);
      return;
    }
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor) return;
    try {
      const destination = new URL(anchor.href, location.origin);
      if (destination.origin !== location.origin) return;
      const signal = navigationSignal(source, destination.pathname);
      if (signal) emit('click', signal.path, signal.detail);
    } catch { /* 잘못된 URL은 집계하지 않는다 */ }
  };
  // Link가 이동시키기 전에 출발 경로를 읽고, 해제 시 같은 capture 옵션을 사용한다.
  target.addEventListener?.('click', click, true);
  return () => target.removeEventListener?.('click', click, true);
}
export function usageInsights(data = {}) {
  const number = n => Number.isFinite(Number(n)) && Number(n) >= 0 ? Number(n) : 0;
  const clicks = (data.clicks || []).map(row => ({...row,count:number(row.range)})).filter(row=>row.count>0).sort((a,b)=>b.count-a.count);
  const pages = (data.pages || []).map(row => ({...row,count:number(row.count),visitors:number(row.visitors),repeat:number(row.visitors)?number(row.count)/number(row.visitors):null})).sort((a,b)=>b.count-a.count);
  // 운영자가 검토할 가설이며 사용성 오류나 불만의 판정이 아니다.
  const candidates = pages.filter(row=>row.count>=20 && row.repeat>=3).sort((a,b)=>b.repeat-a.repeat);
  return {clicks,pages,candidates,clickTotal:clicks.reduce((sum,row)=>sum+row.count,0)};
}
export function clickName(detail = '') {
  if (typeof detail !== 'string') return '이름 없는 동작';
  return detail.startsWith('open:') ? `${USAGE_PAGES[detail.slice(5)] || '공개 화면'} 열기` : USAGE_ACTIONS[detail] || detail || '이름 없는 동작';
}
