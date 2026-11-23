// 첫 로딩 대기 화면(index.html의 #boot-splash). 화면이 다 준비된 뒤 한 번에 보여 줘서 레이아웃이 밀리지 않게 한다.
// - 화면 조각(첫 페이지 코드)이 다 불러와지고(splashReady) 글꼴이 준비되고, 첫 화면이 기다려 달라고 한 데이터(holdSplash)가 오면 사라진다
// - 무엇이 늦어도 최대 MAX_MS 뒤에는 사라진다(서버가 느려도 사이트는 열려야 한다)
const MAX_MS = 5000;
let holds = 0;
let ready = false;
let done = false;

function el() {
  return typeof document === 'undefined' ? null : document.getElementById('boot-splash');
}

function progress(value) {
  const bar = el()?.querySelector('.boot-bar i');
  if (bar) bar.style.width = `${value}%`;
}

function finish() {
  if (done) return;
  done = true;
  const splash = el();
  if (!splash) return;
  progress(100);
  splash.classList.add('boot-out');
  setTimeout(() => splash.remove(), 350);
}

function tryFinish() {
  if (done || !ready || holds > 0) return;
  const fonts = typeof document !== 'undefined' && document.fonts?.ready ? document.fonts.ready : Promise.resolve();
  fonts.then(finish, finish);
}

/** 첫 화면에 꼭 필요한 데이터를 기다리게 한다. 끝나거나 실패하면 대기를 푼다. */
export function holdSplash(promise) {
  if (done || !el()) return;
  holds += 1;
  progress(75);
  Promise.resolve(promise).catch(() => {}).finally(() => { holds -= 1; tryFinish(); });
}

/** 첫 페이지 화면 코드가 다 그려졌다. */
export function splashReady() {
  if (ready) return;
  ready = true;
  progress(85);
  tryFinish();
}

if (typeof window !== 'undefined') {
  progress(45);
  setTimeout(finish, MAX_MS);
}
