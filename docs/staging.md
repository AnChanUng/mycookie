# 개발(스테이징) · 운영 환경

| 구분 | 브랜치 | 프론트엔드 | 백엔드 | DB |
| --- | --- | --- | --- | --- |
| 로컬 | 작업 브랜치 | `npm run dev` (리뉴얼 안내 꺼짐) | 로컬 실행 | 로컬 PostgreSQL |
| 스테이징 | `dev` | Vercel 미리보기 (`cs-study-platform-git-dev-anchanungs-projects.vercel.app`) | Render `cs-study-backend-staging` | Neon `staging` 브랜치 |
| 운영 | `master` | Vercel 운영 (`cs-study-platform.vercel.app`) | Render `cs-study-backend` | Neon 운영(main) |

- 프론트엔드는 빌드한 곳으로 환경을 정합니다(`vite.config.js`의 `deployEnv`). Vercel 운영과 Render 정적 사이트는 `production`, Vercel 미리보기는 `preview`, 그 밖은 `local`입니다.
- `preview` 빌드는 스테이징 백엔드를 호출하고, 리뉴얼 안내 없이 전체 화면을 보여 주며, 왼쪽 아래에 "스테이징 · 운영 데이터 아님" 표시가 붙습니다.
- 운영 빌드에는 운영 백엔드 주소만, 미리보기 빌드에는 스테이징 주소만 들어갑니다.

## 작업 흐름

1. 기능 브랜치에서 작업하고 이슈를 연결한 PR을 **`dev`로** 올립니다.
2. `dev`에 병합되면 스테이징(미리보기 사이트 → 스테이징 백엔드 → 스테이징 DB)에서 확인합니다.
3. 확인이 끝나면 `dev` → `master` PR로 운영에 배포하고, 기록용 태그와 Release를 붙입니다.

## 처음 한 번 설정하기 (대시보드)

### 1. Neon: 스테이징 DB 브랜치

1. Neon 콘솔 → 프로젝트 → **Branches** → **Create branch**
2. 이름 `staging`, 부모 `main`. 가능하면 **데이터 없이(Schema only)**를 고릅니다. 운영 사용자 데이터를 스테이징에 복사하지 않기 위해서입니다. 서버가 시작할 때 테이블을 만들기 때문에 빈 DB여도 됩니다.
3. 만든 브랜치의 **Connection string**(postgresql://…)을 복사합니다.

### 2. Render: 스테이징 백엔드

`render.yaml`에 `cs-study-backend-staging`(branch: `dev`)을 정의해 두었습니다.

- 블루프린트로 관리 중이면 Render → **Blueprints** → 이 저장소 → **Sync**로 새 서비스를 만듭니다.
- 블루프린트로 관리하지 않으면 **New → Web Service** → 이 저장소, **Branch `dev`**, **Root Directory `backend`**, **Runtime Docker**, **Instance Free**, 이름 `cs-study-backend-staging`으로 만듭니다.

환경변수:

| 키 | 값 |
| --- | --- |
| `DATABASE_URL` | 1번에서 복사한 Neon **staging** 연결 문자열 (운영 값 금지) |
| `ADMIN_KEY` | 운영과 **다른** 32자 이상 무작위 값 |
| `SLACK_ENABLED` | `false` |

서비스가 뜨면 주소(`https://cs-study-backend-staging-xxxx.onrender.com`)를 확인합니다.

### 3. Vercel: 미리보기가 스테이징을 쓰게

Vercel → 프로젝트 → **Settings → Environment Variables**

| 키 | 값 | 환경 |
| --- | --- | --- |
| `VITE_STAGING_API_URL` | `https://<2번 주소>/api/v1` | **Preview만** 선택 |

저장한 뒤 `dev` 미리보기를 다시 배포(Redeploy)합니다.

### 4. 정리해 두면 좋은 것

Render에 예전에 만든 중복 서비스(`cs-study-backend-21ay`, `cs-study-frontend-21ay`)와 Render DB(`cs-study-db`)가 보입니다. 쓰지 않는다면 지워 주세요. 켜져 있으면 무료 사용 시간을 함께 씁니다.

## Render 무료 사용 시간

Render 무료 플랜은 계정 전체에 **월 750시간**입니다. 예전에는 운영 백엔드를 24시간 깨워(월 약 720시간) 스테이징을 함께 돌리면 월말에 운영까지 멈출 수 있었습니다. 그래서 운영 깨우기를 한국 시간 08:00~02:00(월 약 540시간)으로 줄였고, 스테이징은 깨우지 않아 쓰지 않을 때는 잠듭니다. 새벽에는 운영 서버도 첫 요청에 1~2분이 걸릴 수 있습니다.
