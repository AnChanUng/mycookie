// 채팅 창 두 곳이 함께 쓰는 시각 · 묶음 · 반응 계산

// 서버가 받아 주는 반응 이모지와 같은 순서다
export const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

const p2 = n => String(n).padStart(2, '0');
export function clock(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${p2(d.getMinutes())}`;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function dayLabel(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return '오늘';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return '어제';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
}

// 목록용 짧은 시각: 오늘이면 시각, 아니면 날짜
export function shortWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? clock(iso) : `${d.getMonth() + 1}.${d.getDate()}`;
}

const GROUP_GAP = 5 * 60 * 1000;
// 같은 사람이 5분 안에 이어 보낸 글은 한 묶음으로 보여 준다. 날이 바뀌면 구분선을 넣는다
export function layout(list, authorOf) {
  return list.map((m, i) => {
    const prev = list[i - 1], next = list[i + 1];
    const day = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString();
    const joined = (a, b) => a && b && authorOf(a) === authorOf(b)
      && new Date(b.at) - new Date(a.at) < GROUP_GAP
      && new Date(a.at).toDateString() === new Date(b.at).toDateString();
    return { m, day, first: !joined(prev, m), last: !joined(m, next) };
  });
}

// 반응 목록을 켜고 끈 결과를 미리 그린다
export function toggled(items = [], emoji) {
  const has = items.find(r => r.emoji === emoji);
  const next = has
    ? items.map(r => r.emoji === emoji ? { ...r, count: r.count + (r.mine ? -1 : 1), mine: !r.mine } : r)
    : [...items, { emoji, count: 1, mine: true }];
  return next.filter(r => r.count > 0).sort((a, b) => REACTIONS.indexOf(a.emoji) - REACTIONS.indexOf(b.emoji));
}
