#!/usr/bin/env python3
"""이 글의 그림(SVG)을 만든다. 구조도(docs/architecture/build.py)의 그리기 함수를 그대로 쓴다.
  python3 docs/blog/2026-11-dev-workflow/figure.py <simple-icons/package/icons 경로>
PNG는 render.cjs로 만든다(같은 폴더의 README 참고). 그림 3(알림 예시)은 alerts.html을 그대로 찍는다.
"""
import sys
from pathlib import Path

here = Path(__file__).resolve().parent
src = (here.parents[2] / "docs/architecture/build.py").read_text()
helpers = src[: src.index("# ── 그룹")]          # 아이콘, tile, group, arrow 정의까지만
ns = {"__file__": str(here / "figure.py")}
sys.argv = [sys.argv[0], sys.argv[1] if len(sys.argv) > 1 else "package/icons"]
exec(helpers, ns)
ns["BRAND"].update({"git": "F05032", "googlegemini": "8E75B2", "redis": "FF4438", "apachekafka": "231F20"})
ns["GENERIC"]["shield"] = '<path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>'
ns["GENERIC"]["db"] = '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13"/><path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>'
tile, group, arrow, text, add, parts = ns["tile"], ns["group"], ns["arrow"], ns["text"], ns["add"], ns["parts"]


def box(x, y, w, h, title, sub, color):
    """왼쪽에 색 막대가 있는 설명 상자"""
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#fff" stroke="#E2E8F0" stroke-width="1.5" filter="url(#sh)"/>')
    add(f'<rect x="{x}" y="{y}" width="8" height="{h}" rx="4" fill="#{color}"/>')
    text(x + 24, y + h / 2 - (6 if sub else -5), title, 15, 700, "1E293B", "start")
    if sub:
        text(x + 24, y + h / 2 + 15, sub, 13, 500, "64748B", "start")


def save(name, w, h, shift=0):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" font-family="Pretendard, sans-serif">
<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity=".08"/></filter>
</defs>
<rect width="{w}" height="{h}" fill="#FFFFFF"/>
<g transform="translate(0,{shift})">
{chr(10).join(parts)}
</g>
</svg>
'''
    (here / f"images/{name}.svg").write_text(svg)
    parts.clear()
    print(here / f"images/{name}.svg")


# ── 그림 1. 전체 흐름 ─────────────────────────────────
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
arrow([(300, 308), (300, 490), (784, 490)], "새 이슈, 제보", (460, 490), color="7C3AED", dash=True)
arrow([(640, 308), (640, 470), (784, 470)], "리뷰 요청", (700, 452), color="7C3AED", dash=True)
text(760, 420, "CI 실패", 12, 600, "7C3AED")
add('<polyline points="805,308 805,454" fill="none" stroke="#7C3AED" stroke-width="1.8" stroke-dasharray="5 5" marker-end="url(#ah)"/>')
arrow([(1300, 308), (1300, 454)], "고위험 오류", (1350, 380), color="DC2626")
arrow([(1264, 490), (856, 490)], "요약 + 원본 증거", (1060, 478), color="DC2626")
save("fig-1-workflow", 1560, 560, -50)

# ── 그림 2. PR 위험도 판정 ────────────────────────────
tile("github", 100, 270, "PR")
tile("shield", 270, 270, "위험도 검사")
text(270, 360, "바뀐 파일 경로로 판정", 12, 600, "64748B")
arrow([(136, 270), (234, 270)])
rows = [
    (90, "낮음", "문서, 문제 데이터, 테스트", "16A34A", "CI 통과하면 자동 병합", None),
    (200, "중간", "그 외 백엔드, 화면 코드", "CA8A04", "관리자 승인", "관리자가 올린 PR은 바로 병합 가능"),
    (310, "높음", "로그인, 보안, 결제, DB 엔티티, 설정, 배포, CI", "DC2626", "작성자가 아닌 1명 승인", "승인이 들어오면 검사가 다시 돌아 통과"),
    (420, "운영", "dev → master", "475569", "관리자만 병합", "브랜치 규칙의 업데이트 제한"),
]
for y, level, files, color, cond, note in rows:
    box(420, y, 420, 76, level, files, color)
    box(940, y, 380, 76, cond, note, color)
    arrow([(306, 270), (370, 270), (370, y + 38), (418, y + 38)], color="94A3B8")
    arrow([(842, y + 38), (938, y + 38)])
save("fig-2-risk", 1360, 530, -20)

# ── 그림 4. 제보 처리 (Kafka) ─────────────────────────
tile("browser", 100, 250, "사용자 제보")
tile("springboot", 290, 250, "백엔드")
tile("db", 290, 450, "PostgreSQL")
tile("apachekafka", 500, 250, "Kafka")
tile("springboot", 710, 250, "소비자")
tile("github", 960, 160, "GitHub 이슈")
tile("mattermost", 960, 340, "Mattermost")
tile("apachekafka", 710, 450, "DLT")
arrow([(136, 250), (254, 250)])
arrow([(290, 318), (290, 414)], "1. 저장", (330, 366))
arrow([(326, 250), (464, 250)], "2. 이벤트", (395, 238))
arrow([(536, 250), (674, 250)])
arrow([(746, 240), (800, 240), (800, 160), (924, 160)], "이슈 생성", (860, 148))
arrow([(746, 260), (800, 260), (800, 340), (924, 340)], "알림", (860, 328))
arrow([(710, 318), (710, 414)], "3번 실패", (760, 366), color="DC2626")
text(710, 205, "실패 시 10초 간격 재시도", 12, 600, "DC2626")
arrow([(290, 216), (290, 110), (710, 110), (710, 186)], "Kafka가 멈추면 요청 안에서 바로 처리", (500, 110), color="94A3B8", dash=True)
text(960, 450, "이슈 번호, 알린 시각을 DB에 기록해", 13, 600, "475569")
text(960, 470, "다시 시도해도 두 번 처리하지 않음", 13, 600, "475569")
save("fig-4-feedback", 1120, 540, -40)

# ── 그림 5. 고위험 장애 알림 ──────────────────────────
group(50, 60, 640, 330, "백엔드", "6DB33F", "springboot", fill="#F7FBF2")
tile("archive", 150, 170, "ERROR 로그")
tile("shield", 340, 170, "고위험 판정")
tile("lock", 540, 170, "개인정보 가리기")
tile("redis", 340, 320, "Redis")
arrow([(186, 170), (304, 170)])
arrow([(376, 170), (504, 170)])
arrow([(340, 238), (340, 284)], "30분 쿨다운", (400, 262), both=True)
text(340, 130, "치명 오류 1건 또는 5분에 10건", 12, 600, "64748B")
group(50, 430, 640, 190, "홈서버", "475569", "laptop", fill="#F8FAFC")
tile("clock", 150, 525, "1분마다 확인")
tile("shield", 340, 525, "3번 연속 실패")
tile("archive", 540, 525, "상태, 로그 수집")
arrow([(186, 525), (304, 525)])
arrow([(376, 525), (504, 525)])
tile("googlegemini", 880, 345, "Gemini 요약")
tile("mattermost", 1160, 345, "Mattermost")
arrow([(576, 170), (760, 170), (760, 335), (844, 335)])
arrow([(576, 525), (760, 525), (760, 355), (844, 355)])
arrow([(916, 345), (1124, 345)], "요약 + 원본 증거", (1020, 333), color="DC2626")
text(880, 430, "실패하면 원본 증거만 보냄", 12, 600, "64748B")
save("fig-5-critical", 1260, 640, -20)
