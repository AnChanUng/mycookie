// 기술 블로그(/tech-blogs)의 "나중에 읽기"와 "읽은 글"을 이 기기(localStorage)에 기억한다.
// 학습 기록이 아니라 읽을거리 표시라서 계정과 묶지 않는다. 같은 글은 원문 주소(url)로 구분한다
const KEYS = { saved: 'tech-blog:saved:v1', read: 'tech-blog:read:v1' };
const LIMIT = { saved: 200, read: 500 };

// 저장할 때 필요한 칸만 남긴다. 원문 주소가 http(s)가 아니면 담지 않는다
const pick = a => ({
  id: a.id, company: String(a.company || ''), source: String(a.source || ''), title: String(a.title || ''),
  url: a.url, summary: a.summary ? String(a.summary) : null, publishedAt: a.publishedAt || null,
});
const valid = a => a && typeof a.url === 'string' && /^https?:\/\//i.test(a.url) && typeof a.title === 'string' && a.title !== '';

export function loadShelf(kind) {
  try {
    const list = JSON.parse(localStorage.getItem(KEYS[kind]) || '[]');
    return Array.isArray(list) ? list.filter(valid) : [];
  } catch {
    return [];
  }
}

function store(kind, list) {
  const kept = list.slice(0, LIMIT[kind]);
  try { localStorage.setItem(KEYS[kind], JSON.stringify(kept)); } catch { /* 저장 공간이 없으면 이번 화면에서만 기억한다 */ }
  return kept;
}

// 맨 앞에 넣는다(이미 있으면 앞으로 옮긴다)
export function addToShelf(kind, article) {
  if (!valid(article)) return loadShelf(kind);
  return store(kind, [{ ...pick(article), at: Date.now() }, ...loadShelf(kind).filter(a => a.url !== article.url)]);
}

export function removeFromShelf(kind, url) {
  return store(kind, loadShelf(kind).filter(a => a.url !== url));
}

export function toggleShelf(kind, article) {
  return loadShelf(kind).some(a => a.url === article.url) ? removeFromShelf(kind, article.url) : addToShelf(kind, article);
}

export function clearShelf(kind) {
  return store(kind, []);
}

export const SHELF_KEYS = KEYS;
