#!/usr/bin/env python3
"""나의쿠키 인프라 구조도(architecture.svg)를 만든다.

브랜드 아이콘은 simple-icons(npm, CC0) 패키지의 SVG를 그대로 넣는다.
  npm pack simple-icons@13.21.0 && tar xzf simple-icons-*.tgz
  python3 docs/architecture/build.py <simple-icons/package/icons 경로>
PNG는 같은 폴더의 render.mjs로 만든다(Playwright, Pretendard 글꼴).
"""
import re
import sys
from pathlib import Path

ICONS = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("package/icons")
OUT = Path(__file__).with_name("architecture.svg")
W, H = 1680, 1185

BRAND = {  # simple-icons 이름: 색
    "cloudflare": "F38020", "nginx": "009639", "springboot": "6DB33F", "postgresql": "4169E1",
    "docker": "2496ED", "ubuntu": "E95420", "github": "181717", "githubactions": "2088FF",
    "tailscale": "242424", "googledrive": "1A73E8", "mattermost": "0058CC", "tistory": "000000",
    "google": "4285F4", "kakaotalk": "3C1E1E", "naver": "03C75A", "react": "149ECA", "rclone": "3F79AD", "redis": "FF4438", "apachekafka": "231F20",
}

# simple-icons에 없는 일반 기호(24x24, 선)
GENERIC = {
    "browser": '<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M2.5 8.5h19"/><circle cx="5.5" cy="6.3" r=".6"/><circle cx="7.8" cy="6.3" r=".6"/>',
    "person": '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6.5 8-6.5s7.2 2.3 8 6.5"/>',
    "clock": '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    "lock": '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v3"/>',
    "archive": '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M4.5 9v10a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
    "laptop": '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 19h20"/>',
    "windows": None,
}


def brand_path(name):
    svg = (ICONS / f"{name}.svg").read_text()
    return re.search(r'<path d="([^"]+)"', svg).group(1)


def glyph(name, x, y, size, color=None):
    """(x, y)를 중심으로 size 크기의 아이콘"""
    s = size / 24
    tx, ty = x - size / 2, y - size / 2
    if name == "windows":
        c = color or "0078D4"
        g = "".join(f'<rect x="{a}" y="{b}" width="10.5" height="10.5" fill="#{c}"/>' for a in (1.5, 12) for b in (1.5, 12))
        return f'<g transform="translate({tx} {ty}) scale({s})">{g}</g>'
    if name in GENERIC:
        c = color or "334155"
        return (f'<g transform="translate({tx} {ty}) scale({s})" fill="none" stroke="#{c}" stroke-width="1.7" '
                f'stroke-linecap="round" stroke-linejoin="round">{GENERIC[name]}</g>')
    c = color or BRAND[name]
    return f'<g transform="translate({tx} {ty}) scale({s})"><path d="{brand_path(name)}" fill="#{c}"/></g>'


parts = []
add = parts.append


def text(x, y, s, size=14, weight=500, color="1E293B", anchor="middle"):
    add(f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="#{color}" text-anchor="{anchor}">{s}</text>')


def tile(name, x, y, title, sub=None, icons=None):
    """AWS 구조도처럼 아이콘 칸 + 아래 이름"""
    add(f'<rect x="{x-34}" y="{y-34}" width="68" height="68" rx="14" fill="#fff" stroke="#E2E8F0" stroke-width="1.5" filter="url(#sh)"/>')
    if icons:
        for i, n in enumerate(icons):
            add(glyph(n, x - 18 + i * 18, y, 17))
    else:
        add(glyph(name, x, y, 36))
    text(x, y + 56, title, 14, 700)
    if sub:
        for i, line in enumerate(sub.split("\n")):
            text(x, y + 75 + i * 17, line, 12, 500, "64748B")


def group(x, y, w, h, label, color, icon=None, dash=False, fill="none"):
    d = ' stroke-dasharray="6 5"' if dash else ""
    add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="{fill}" stroke="#{color}" stroke-width="1.6"{d}/>')
    cw = 30 + len(label) * 8.6 + (22 if icon else 0)
    add(f'<rect x="{x}" y="{y}" width="{cw}" height="28" rx="12" fill="#{color}"/>')
    add(f'<rect x="{x}" y="{y+14}" width="14" height="14" fill="#{color}"/>')
    tx = x + 12
    if icon:
        add(f'<g opacity="1">{glyph(icon, x + 22, y + 14, 15, "FFFFFF")}</g>')
        tx += 22
    text(tx, y + 19, label, 13, 700, "FFFFFF", "start")


def arrow(points, label=None, at=None, color="64748B", dash=False, both=False, lw=1.8):
    p = " ".join(f"{a},{b}" for a, b in points)
    d = ' stroke-dasharray="5 5"' if dash else ""
    start = ' marker-start="url(#ah)"' if both else ""
    add(f'<polyline points="{p}" fill="none" stroke="#{color}" stroke-width="{lw}"{d} marker-end="url(#ah)"{start}/>')
    if label:
        lx, ly = at or ((points[0][0] + points[-1][0]) / 2, (points[0][1] + points[-1][1]) / 2 - 8)
        w = len(label) * 7.2 + 14
        add(f'<rect x="{lx - w/2}" y="{ly - 13}" width="{w}" height="19" rx="9.5" fill="#fff"/>')
        text(lx, ly + 1, label, 12, 600, "475569")


# ── 그룹 ─────────────────────────────────────────────
group(250, 110, 230, 380, "Cloudflare", "F38020", "cloudflare", fill="#FFF7ED")
group(250, 760, 230, 350, "GitHub", "24292F", "github", fill="#F8FAFC")
group(520, 50, 790, 1060, "홈서버", "475569", "laptop", fill="#F8FAFC")
group(540, 100, 750, 990, "Windows + WSL2 Ubuntu 24.04", "E95420", "ubuntu", dash=True)
group(560, 150, 710, 690, "Docker Compose", "2496ED", "docker", fill="#F0F7FF")
group(700, 195, 380, 210, "운영  mycookie.dev", "16A34A", dash=True, fill="#fff")
group(700, 430, 380, 210, "스테이징  staging.mycookie.dev", "CA8A04", dash=True, fill="#fff")
group(560, 875, 710, 190, "호스트 (systemd)", "64748B", "clock", fill="#fff")
group(1350, 110, 290, 960, "외부 서비스", "7C3AED", dash=True, fill="#FAF5FF")

# ── 아이콘 ───────────────────────────────────────────
tile("browser", 130, 250, "사용자")
tile("person", 130, 940, "개발자")

tile("cloudflare", 365, 190, "DNS, HTTPS")
tile("cloudflare", 365, 375, "Tunnel")

tile("github", 365, 845, "저장소")
tile("githubactions", 365, 1030, "GitHub Actions")

tile("cloudflare", 630, 410, "cloudflared")
tile("nginx", 790, 285, "nginx")
tile("springboot", 980, 285, "Spring Boot")
tile("nginx", 790, 520, "nginx")
tile("springboot", 980, 520, "Spring Boot")
tile("postgresql", 1185, 405, "PostgreSQL 18")
tile("redis", 840, 735, "Redis")
tile("apachekafka", 1030, 735, "Kafka")

tile("clock", 735, 980, "자동 배포")
tile("tailscale", 880, 980, "Tailscale")
tile("archive", 1015, 980, "백업")
tile("lock", 1185, 980, "암호화")

tile("mattermost", 1495, 205, "Mattermost")
tile("googledrive", 1495, 980, "Google Drive")

# ── 흐름 ─────────────────────────────────────────────
arrow([(166, 250), (329, 200)], "HTTPS", (245, 210))
arrow([(365, 278), (365, 339)])
arrow([(401, 375), (480, 375), (480, 410), (594, 410)], "Tunnel", (535, 398))
arrow([(666, 395), (700, 395), (700, 300), (754, 300)])
arrow([(666, 425), (700, 425), (700, 520), (754, 520)])
arrow([(826, 285), (942, 285)], "/api", (884, 275))
arrow([(826, 520), (942, 520)], "/api", (884, 510))
arrow([(1016, 285), (1100, 285), (1100, 390), (1149, 390)], "JPA", (1100, 340))
arrow([(1016, 520), (1100, 520), (1100, 420), (1149, 420)])
# 두 백엔드가 함께 쓰는 Redis, Kafka(키 앞머리, 토픽 이름으로 운영과 스테이징을 나눈다)
arrow([(840, 642), (840, 699)])
arrow([(1030, 642), (1030, 699)])

# 백엔드 → 외부 서비스
arrow([(980, 249), (980, 128), (1330, 128), (1330, 205), (1459, 205)], "웹훅", (1180, 128), color="7C3AED")

# 개발 흐름
arrow([(166, 930), (329, 855)], "push, PR", (245, 882))
arrow([(365, 933), (365, 994)], "CI", (392, 962))
arrow([(401, 845), (500, 845), (500, 980), (699, 980)], "git pull", (600, 968), color="2496ED", dash=True)
arrow([(735, 944), (735, 843)], "빌드, 재시작", (735, 862), color="2496ED", dash=True)
arrow([(130, 1008), (130, 1135), (880, 1135), (880, 1046)], "SSH", (500, 1135), color="475569", dash=True)

# 백업 흐름
arrow([(1221, 405), (1250, 405), (1250, 860), (1015, 860), (1015, 944)], "pg_dump", (1110, 860), color="16A34A")
arrow([(1051, 980), (1149, 980)])
arrow([(1221, 980), (1459, 980)], "rclone", (1340, 968), color="16A34A")

legend_y = 1172
for i, (c, dash, s) in enumerate([("64748B", False, "사용자 요청"), ("7C3AED", False, "외부 연동"),
                                   ("2496ED", True, "배포"), ("16A34A", False, "백업")]):
    x = 560 + i * 170
    d = ' stroke-dasharray="5 5"' if dash else ""
    add(f'<line x1="{x}" y1="{legend_y-4}" x2="{x+34}" y2="{legend_y-4}" stroke="#{c}" stroke-width="2"{d}/>')
    text(x + 42, legend_y, s, 12, 600, "475569", "start")

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif">
<defs>
  <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity=".08"/></filter>
</defs>
<rect width="{W}" height="{H}" fill="#FFFFFF"/>
{chr(10).join(parts)}
</svg>
'''
OUT.write_text(svg)
print(OUT)
