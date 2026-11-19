# 브랜치 규칙 (GitHub Rulesets)

Settings → Rules → Rulesets → **New ruleset ▾ → Import a ruleset**에서 이 폴더의 JSON을 하나씩 가져온다.

| 파일 | 브랜치 | 내용 |
|---|---|---|
| `dev.json` | `dev` | PR로만 병합, 삭제와 강제 푸시 금지, CI 2개와 `위험도 검사` 통과 필수 |
| `master.json` | `master` | 위와 같고, 추가로 **관리자만 병합 가능**(`update` 제한) |

- 위험도별 승인 조건(낮음 자동, 중간 AI 리뷰, 높음 사람 1명)은 `위험도 검사`(`.github/workflows/pr-risk.yml`)가 판정한다. 그래서 규칙의 필수 승인 수는 0이다.
- 관리자(Repository admin)는 긴급 장애 때 규칙을 건너뛸 수 있다(`bypass_actors`).
- 자동 병합을 쓰려면 Settings → General → Pull Requests에서 **Allow auto-merge**를 켠다.
- 비공개 저장소는 GitHub Pro 이상이어야 규칙이 강제된다.
