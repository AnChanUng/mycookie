#!/usr/bin/env python3
"""그림 1(개발 워크플로)을 만든다. 구조도(docs/architecture/build.py)의 그리기 함수를 그대로 쓴다.
  python3 docs/blog/2026-11-dev-workflow/figure.py <simple-icons/package/icons 경로>
"""
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
src = (here.parents[2] / "docs/architecture/build.py").read_text()
helpers = src[: src.index("# ── 그룹")]          # 아이콘, tile, group, arrow 정의까지만
ns = {"__file__": str(here / "figure.py")}
sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else "package/icons"]
exec(helpers, ns)
ns["BRAND"].update({"git": "F05032", "googlegemini": "8E75B2"})
ns["GENERIC"]["shield"] = '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'
tile, group, arrow, text, add = ns["tile"], ns["group"], ns["arrow"], ns["text"], ns["add"]
W, H = 1560, 560

tile("browser", 110, 150, "사용자 제보")
tile("person", 110, 330, "개발자")
tile("github", 300, 240, "이슈")
tile("git", 470, 240, "작업 브랜치")
tile("github", 640, 240, "PR (dev로)")
group(730, 150, 290, 190, "PR 검사", "2088FF", "githubactions", fill="#F0F7FF")
tile("githubactions", 805, 240, "CI")
tile("shield", 945, 240, "위험도 검사")
tile("laptop", 1120, 240, "스테이징 (dev)")
tile("laptop", 1300, 240, "운영 (master)")
tile("mattermost", 820, 490, "Mattermost")
tile("googlegemini", 1300, 490, "Gemini 요약")

arrow([(146, 160), (264, 230)], "Kafka", (205, 178))
arrow([(146, 320), (264, 250)])
arrow([(336, 240), (434, 240)])
arrow([(506, 240), (604, 240)])
arrow([(676, 240), (769, 240)])
arrow([(841, 240), (909, 240)])
arrow([(981, 240), (1084, 240)], "병합", (1054, 228))
arrow([(1156, 240), (1264, 240)], "관리자만", (1210, 228))
text(905, 132, "낮음: 자동 병합 | 중간: 관리자 승인 | 높음: 1명 승인", 13, 600, "2563EB")

# 사람이 할 일이 생기는 것만 Mattermost로
arrow([(300, 308), (300, 490), (784, 490)], "새 이슈, 제보", (460, 490), color="7C3AED", dash=True)
arrow([(640, 308), (640, 470), (784, 470)], "리뷰 요청", (700, 452), color="7C3AED", dash=True)
text(760, 420, "CI 실패", 12, 600, "7C3AED")
add('<polyline points="805,308 805,454" fill="none" stroke="#7C3AED" stroke-width="1.8" stroke-dasharray="5 5" marker-end="url(#ah)"/>')
arrow([(1300, 308), (1300, 454)], "고위험 오류", (1350, 380), color="DC2626")
arrow([(1264, 490), (856, 490)], "요약 + 원본 증거", (1060, 478), color="DC2626")

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Pretendard, sans-serif">
<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity=".08"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="#FFFFFF"/>
<g transform="translate(0,-50)">
{chr(10).join(ns["parts"])}
</g>
</svg>
'''
(here / "images/fig-1-workflow.svg").write_text(svg)
print(here / "images/fig-1-workflow.svg")
