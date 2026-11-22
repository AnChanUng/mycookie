// 관리자 페이지 주소. 들어올 때는 /private/chanung 을 쓰고, 화면 안에서는 주소창에 메뉴 이름이 드러나지 않게
// 알아보기 어려운 주소(/x/…/YWRtaW4 같은 base64url)로 바꿔 보여 준다.
// 주소를 숨기는 것일 뿐 보안 장치는 아니다(잠금 비밀번호 · 관리자 키가 실제 보호를 맡는다)
export const PRIVATE_ENTRY = '/private/chanung';
export const PRIVATE_BASE = '/x/c7e19b4f2d';

const toBase64Url = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function encodePrivateId(id) {
  return toBase64Url(id);
}

export function decodePrivateId(code) {
  try {
    const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** 관리자 화면 주소. id가 없으면 첫 화면(목록). */
export const privatePath = (id) => (id ? `${PRIVATE_BASE}/${encodePrivateId(id)}` : PRIVATE_BASE);

// 비공개 문제집(찬웅과 지정한 계정만). 주소는 숨기지 않고 계정으로 막는다(pages/PrivateBanksPage.jsx)
export const PRIVATE_BANKS_PATH = '/private/banks';
