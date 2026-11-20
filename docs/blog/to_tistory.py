#!/usr/bin/env python3
"""블로그 원고(post.md)를 티스토리 HTML 편집기에 붙여 넣을 tistory.html로 바꾼다.
  python3 docs/blog/to_tistory.py docs/blog/<글 폴더> [그림 주소 앞부분]
- 스타일은 인라인으로 넣는다(티스토리 스킨과 상관없이 같은 모양).
- 그림 주소 앞부분을 주면 그림이 그 주소로 바로 들어간다(공개 저장소의 raw 주소, 커밋 해시로 고정).
  주지 않으면 자리 표시(`[이미지 업로드: 파일명]`)로 남기고, 티스토리에서 직접 올린다.
- 맨 위 제목(#)과 태그 인용(> 태그:)은 티스토리 입력칸에 따로 넣으므로 본문에서 뺀다.
"""
import re
import sys
from pathlib import Path

import markdown

P = 'style="font-size:17px;line-height:1.85;"'
STYLES = {
    "<h2>": '<h2 style="font-size:25px;margin:48px 0 16px;">',
    "<h3>": '<h3 style="font-size:20px;margin:32px 0 12px;">',
    "<p>": f"<p {P}>",
    "<ul>": '<ul style="font-size:17px;line-height:1.85;">',
    "<ol>": '<ol style="font-size:17px;line-height:1.85;">',
    "<table>": '<table style="width:100%;border-collapse:collapse;font-size:15px;">',
    "<th>": '<th style="border:1px solid #ddd;padding:8px;background:#f6f6f6;text-align:left;">',
    "<td>": '<td style="border:1px solid #ddd;padding:8px;vertical-align:top;">',
    "<blockquote>": '<blockquote style="border-left:4px solid #ddd;margin:16px 0;padding:4px 16px;color:#555;">',
    "<pre>": '<pre style="background:#f6f8fa;padding:14px;border-radius:6px;overflow-x:auto;font-size:14px;line-height:1.6;">',
    "<code>": '<code style="background:#f2f2f2;padding:1px 5px;border-radius:4px;font-size:0.9em;">',
}


def convert(folder: Path, image_base: str = ""):
    md = (folder / "post.md").read_text()
    lines = md.splitlines()
    body = [l for l in lines if not l.startswith("# ") and not l.startswith("> 태그")]
    md = "\n".join(body).strip()
    # 그림: ![설명](images/파일) → 자리 표시, 바로 다음 줄의 *캡션*은 회색 가운데 정렬
    if image_base:
        md = re.sub(r"!\[([^\]]*)\]\(images/([^)]+)\)",
                    lambda m: f'<p style="text-align:center;"><img src="{image_base.rstrip("/")}/{m.group(2)}" alt="{m.group(1)}" style="max-width:100%;"></p>', md)
    else:
        md = re.sub(r"!\[[^\]]*\]\(images/([^)]+)\)", r'<p style="text-align:center;">[이미지 업로드: \1]</p>', md)
    html = markdown.markdown(md, extensions=["tables", "fenced_code"])
    html = re.sub(r"<p><p style=\"text-align:center;\">(.*?)</p></p>", r'<p style="text-align:center;">\1</p>', html)
    html = re.sub(r"<p><em>(그림 [^<]*)</em></p>", r'<p style="text-align:center;font-size:14px;color:#777;">\1</p>', html)
    # 코드 블록 안의 <code>는 배경을 따로 주지 않는다
    html = re.sub(r"<pre><code[^>]*>", "<pre><code>", html)
    for tag, styled in STYLES.items():
        if tag == "<code>":
            html = re.sub(r"(?<!<pre>)<code>", styled, html)
        else:
            html = html.replace(tag, styled)
    (folder / "tistory.html").write_text(html + "\n")
    print(folder / "tistory.html")


if __name__ == "__main__":
    convert(Path(sys.argv[1]), sys.argv[2] if len(sys.argv) > 2 else "")
