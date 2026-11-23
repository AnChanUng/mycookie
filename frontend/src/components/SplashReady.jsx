import { useEffect } from 'react';
import { splashReady } from '../splash';

// Suspense 안에 페이지와 나란히 두면, 페이지 코드가 다 불러와져 그려진 뒤에 첫 로딩 대기 화면을 걷어 낸다
export default function SplashReady() {
  useEffect(() => { splashReady(); }, []);
  return null;
}
