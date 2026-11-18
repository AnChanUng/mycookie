# 나의쿠키 디자인 시스템

파일: `frontend/src/styles/ds.css` (전역으로 불러옴, `main.jsx`)

새 화면은 **이 파일의 토큰과 `ds-` 클래스만으로** 만든다. 색은 화면 모드(화이트 · 다크 · 크림 …)의 변수를 받아 쓰므로 어떤 테마에서도 맞는다.

## 원칙
- 토스 스타일: 큰 글씨, 넉넉한 여백, 둥근 카드, 한 화면에 하나의 주인공(강조 카드)
- 웹 우선(데스크톱 12칸 그리드) + 반응형(태블릿 · 휴대폰 2칸)
- 움직임은 짧고 부드럽게, `prefers-reduced-motion`이면 끈다
- 포커스 링(3px 브랜드색)은 지우지 않는다

## 토큰
| 분류 | 토큰 | 값 |
|---|---|---|
| 바탕 · 면 | `--ds-bg` `--ds-surface` `--ds-surface-2` `--ds-surface-3` | 테마의 bg-secondary / bg-primary / … |
| 선 · 글자 | `--ds-line` `--ds-text` `--ds-text-2` `--ds-text-3` | 테마 변수 |
| 브랜드 | `--ds-brand` `--ds-brand-soft` | 테마 강조색, 12% 투명 |
| 의미 색 | `--ds-cookie` `--ds-red` `--ds-green` `--ds-yellow` (+ `-soft`) | 쿠키 갈색 · 오답 · 정답 · 강조 |
| 강조 면 | `--ds-grad-brand` `--ds-grad-night` `--ds-grad-cookie` | 파랑→보라, 밤하늘, 쿠키 |
| 글자 크기 | `--ds-fs-caption` 12 · `small` 13 · `body` 15 · `lead` 17 · `title` 19 · `h3` 22 · `h2` 24~30 · `h1` 28~40 | px |
| 간격 | `--ds-s1`…`--ds-s10` | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 |
| 둥글기 | `--ds-r-sm` 12 · `md` 16 · `lg` 22 · `xl` 28 · `full` | px |
| 그림자 | `--ds-shadow-sm` `md` `lg` | 다크 모드에서 진하게 |
| 움직임 | `--ds-ease` `--ds-fast` .15s · `--ds-base` .25s | |

## 부품
| 클래스 | 쓰임 | 변형 |
|---|---|---|
| `ds-card` | 모든 카드(링크면 떠오름) | `--brand` `--night` `--soft` `--flat` |
| `ds-section-head` | 카드 안 제목 + 오른쪽 링크 | |
| `ds-eyebrow` `ds-h1` `ds-h2` `ds-title` `ds-caption` | 글자 단계 | `ds-text-2/3`, `ds-clamp-2/3` |
| `ds-btn` | 버튼 | `--primary` `--secondary` `--ghost` `--white` `--sm` |
| `ds-chip` | 알약 링크 · 상태 | `--soft` |
| `ds-badge` | 작은 꼬리표 | `--glass` `--red` `--green` `--live`(깜빡이는 점) |
| `ds-icon` | 아이콘 상자 | `--sm` `--cookie` `--red` `--green` |
| `ds-list` + `ds-list-item` | 아이콘 · 이름 · 오른쪽 값 목록 | |
| `ds-stat` | 큰 숫자 + 설명 | |
| `ds-tile` | 아이콘 + 이름 타일 | |
| `ds-bar` | 진행 막대(`<i style="width">`) | |
| `ds-rise` | 떠오르며 등장(`--d`로 순서) | |

## 예시
```jsx
<Link to="/cs" className="ds-card ds-card--brand">
  <span className="ds-badge ds-badge--glass">오늘의 CS</span>
  <h2 className="ds-h2">Deadlock</h2>
  <p className="ds-text-2 ds-clamp-2">설명…</p>
</Link>
```

## 적용 현황
- 메인(`/`): 적용 완료
- 다음: 대결 → 실전 → 전공노트 · 웹 필수지식 → 내 학습 · CS·면접 허브
