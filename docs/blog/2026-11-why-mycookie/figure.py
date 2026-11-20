#!/usr/bin/env python3
"""그림 1(나의쿠키가 커 온 과정)을 만든다. 그리기 함수는 docs/blog/2026-11-dev-workflow/figure.py와 같다.
  python3 docs/blog/2026-11-why-mycookie/figure.py <simple-icons/package/icons 경로>
"""
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
src = (here.parents[2] / "docs/architecture/build.py").read_text()
ns = {"__file__": str(here / "figure.py")}
sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else "package/icons"]
exec(src[: src.index("# ── 그룹")], ns)
text, add, arrow, parts = ns["text"], ns["add"], ns["arrow"], ns["parts"]


def stage(x, y, w, h, when, title, lines, color):
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#fff" stroke="#E2E8F0" stroke-width="1.5" filter="url(#sh)"/>')
    add(f'<rect x="{x}" y="{y}" width="{w}" height="8" rx="4" fill="#{color}"/>')
    text(x + 24, y + 44, when, 14, 700, color, "start")
    text(x + 24, y + 76, title, 19, 800, "0F172A", "start")
    for i, line in enumerate(lines):
        text(x + 24, y + 112 + i * 26, line, 14.5, 500, "475569", "start")


W, H = 1460, 270
stages = [
    ("고민", "어디까지 공부해야 할까", ["자료는 흩어져 있고", "공부 기록은 남지 않음", "AI는 어디서부터?"], "94A3B8"),
    ("9월", "우리 반 문제집", ["SSAFY 16기 대전 4반에서 시작", "기업별 전공필기 예상문제", "모의고사, 오답노트"], "2563EB"),
    ("10월", "함께 공부하는 기능", ["1:1 대결과 단체전", "등급과 승급 시험", "오늘의 CS, 기술면접"], "7C3AED"),
    ("11월", "누구나 쓰는 나의쿠키", ["개발자 취업 준비 전반으로", "mycookie.dev 정식 오픈", "홈서버, 개발 워크플로"], "16A34A"),
]
x = 30
for when, title, lines, color in stages:
    stage(x, 40, 320, 190, when, title, lines, color)
    if x > 30:
        arrow([(x - 34, 135), (x - 4, 135)])
    x += 355

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Pretendard, sans-serif">
<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity=".08"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="#FFFFFF"/>
{chr(10).join(parts)}
</svg>
'''
(here / "images/fig-1-timeline.svg").write_text(svg)
print(here / "images/fig-1-timeline.svg")
