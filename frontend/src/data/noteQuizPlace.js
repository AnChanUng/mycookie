// 노트 문제의 정답 위치를 문항 id로 정해 고르게 퍼뜨린다. 정답 보기를 id 해시가 가리키는 칸과 맞바꾼다.
// 같은 id는 항상 같은 배치가 되므로 기기·새로고침과 관계없이 보기 순서가 바뀌지 않는다
const hash = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

export function placeAnswer(q) {
  if (q.kind || !Array.isArray(q.o)) return q;
  const to = hash(q.id) % q.o.length;
  if (to === q.a) return q;
  const o = [...q.o];
  [o[q.a], o[to]] = [o[to], o[q.a]];
  return { ...q, o, a: to };
}
