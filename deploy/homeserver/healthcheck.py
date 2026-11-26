#!/usr/bin/env python3
"""1분마다 나의쿠키가 살아 있는지 확인하고, 죽으면 Mattermost로 알린다(devcookie-health.timer).

백엔드가 통째로 죽으면 스스로 알릴 수 없으므로 홈서버가 바깥에서 확인한다.
  - 내부: http://127.0.0.1:8080/api/v1/categories (nginx → 운영 백엔드)
  - 외부: https://mycookie.dev/ (Cloudflare 터널까지)
3번 연속(약 3분) 실패하면 컨테이너 상태와 백엔드 로그 끝부분을 모아 Gemini(무료)로 요약해 보낸다.
배포 중(devcookie-deploy 실행 중)에는 확인하지 않고, 되살아나면 복구 알림을 한 번 보낸다.
로그는 보내기 전에 이메일, IP, 토큰 같은 값을 가린다. 키와 웹훅은 /srv/devcookie/.env에서 읽는다.
"""
import json
import os
import re
import subprocess
import time
import urllib.request
from pathlib import Path

ROOT = Path("/srv/devcookie")
ENV = ROOT / ".env"
STATE = ROOT / ".health-state.json"
DISK_STATE = ROOT / ".windows-c-disk-alerted"
FAILS_BEFORE_ALERT = 3
CHECKS = [
    ("운영 백엔드(내부)", "http://127.0.0.1:8080/api/v1/categories"),
    ("외부 접속(mycookie.dev)", "https://mycookie.dev/"),
]
COMPOSE = ["docker", "compose", "--project-directory", str(ROOT),
           "-f", str(ROOT / "app/deploy/homeserver/docker-compose.yml"), "--env-file", str(ENV)]

MASKS = [
    (re.compile(r"(?i)(bearer\s+)[A-Za-z0-9._~+/=-]{8,}"), r"\1[토큰]"),
    (re.compile(r"(?i)((?:password|passwd|secret|token|api[_-]?key|authorization)[\"'\s:=]+)[^\s\"',&]+"), r"\1[가림]"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}"), "[JWT]"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "[이메일]"),
    (re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"), "[IP]"),
    (re.compile(r"(?i)(postgres(?:ql)?://[^:\s/]+:)[^@\s]+@"), r"\1[가림]@"),
    (re.compile(r"\b[A-Za-z0-9_-]{32,}\b"), "[긴값]"),
]

PROMPT = """당신은 나의쿠키(Spring Boot + PostgreSQL + Redis + Kafka, 노트북 한 대의 홈서버, Docker Compose) 운영 담당자입니다.
사이트가 3분 넘게 응답하지 않습니다. 아래 컨테이너 상태와 운영 백엔드 로그 끝부분을 보고, 당장 대응할 개발자가 30초 안에 읽을 요약을 한국어로 쓰세요.
반드시 아래 다섯 줄 형식만 쓰고, 증거에 없는 내용은 추측이라고 밝히세요.
- 무슨 일:
- 영향:
- 의심 원인:
- 먼저 볼 곳:
- 바로 할 조치:"""


def env(name):
    try:
        for line in ENV.read_text().splitlines():
            if line.startswith(name + "="):
                return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return ""


def mask(text):
    for pattern, repl in MASKS:
        text = pattern.sub(repl, text)
    return text


def alive(url):
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return 200 <= r.status < 400
    except Exception:
        return False


def run(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=30).stdout
    except Exception as e:
        return f"(실행 실패: {type(e).__name__})"


def post(url, payload, headers=None, timeout=20):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(), method="POST",
                                 headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode()


def summarize(evidence):
    key = env("GEMINI_API_KEY")
    if not key:
        return ""
    model = env("ALERT_GEMINI_MODEL") or "gemini-flash-lite-latest"
    try:
        raw = post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                   {"systemInstruction": {"parts": [{"text": PROMPT}]},
                    "contents": [{"role": "user", "parts": [{"text": evidence}]}],
                    "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024}},
                   {"x-goog-api-key": key})
        parts = json.loads(raw)["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()[:1500]
    except Exception as e:
        print(f"Gemini 요약 실패({type(e).__name__}), 원본만 보냅니다")
        return ""


def check_log_disk(webhook):
    mount = "/mnt/c"
    source = subprocess.check_output(
        ["findmnt", "--noheadings", "--mountpoint", mount, "--output", "SOURCE"],
        text=True, timeout=5, stderr=subprocess.DEVNULL).strip()
    if source.rstrip("\\/").upper() != "C:":
        raise ValueError("Windows C: mount unavailable")
    fs = os.statvfs(mount)
    used = fs.f_blocks - fs.f_bfree
    available = fs.f_bavail
    capacity = used + available  # df처럼 예약 블록은 일반 사용자의 가용 용량에서 제외한다.
    if capacity <= 0:
        raise ValueError("Invalid filesystem capacity")
    if used * 100 <= capacity * 90:
        DISK_STATE.unlink(missing_ok=True)
        return
    if DISK_STATE.exists():
        return
    gib = fs.f_frsize / (1024 ** 3)
    text = (f"#### :warning: 홈서버 Windows C: 드라이브 사용률 90% 초과\n"
            f"사용률 {100 * used / capacity:.2f}% · 사용 {used * gib:.1f} GiB · "
            f"남은 공간 {available * gib:.1f} GiB\n"
            f"확인 경로: `{mount}` · Windows 저장소 설정에서 어떤 항목의 용량이 큰지 확인하세요.")
    post(webhook, {"username": "나의쿠키", "text": text})
    DISK_STATE.touch()


def main():
    webhook = env("MATTERMOST_WEBHOOK_URL")
    if not webhook:
        return
    try:
        check_log_disk(webhook)
    except Exception as e:
        print(f"로그 디스크 확인 또는 알림 실패({type(e).__name__})")
    # 배포 중에는 백엔드가 잠깐 내려가므로 확인하지 않는다
    if run(["systemctl", "is-active", "devcookie-deploy.service"]).strip() in ("activating", "active"):
        return
    try:
        state = json.loads(STATE.read_text())
    except Exception:
        state = {"fails": 0, "alerted": False, "since": None}

    failed = [name for name, url in CHECKS if not alive(url)]
    now = time.time()
    if failed:
        state["fails"] += 1
        state["since"] = state["since"] or now
        if state["fails"] >= FAILS_BEFORE_ALERT and not state["alerted"]:
            ps = mask(run(COMPOSE + ["ps", "--format", "table {{.Service}}\t{{.Status}}"]))
            logs = mask(run(COMPOSE + ["logs", "--no-color", "--tail", "60", "backend-prod"]))[-6000:]
            evidence = f"실패한 확인: {', '.join(failed)}\n\n[컨테이너 상태]\n{ps}\n[backend-prod 로그 끝부분]\n{logs}"
            summary = summarize(evidence)
            minutes = max(1, round((now - state["since"]) / 60))
            text = f"#### :rotating_light: [긴급] 사이트 응답 없음 ({minutes}분째)\n실패: {', '.join(failed)}\n\n"
            if summary:
                text += f"**🤖 Gemini 요약** (AI 추측이 섞일 수 있어요)\n{summary}\n\n"
            text += f"**📎 컨테이너 상태**\n```\n{ps.strip()[:1500]}\n```\n"
            text += "바로 확인: `sudo /srv/devcookie/app/deploy/homeserver/compose.sh logs --tail 100 backend-prod`"
            grafana = env("GRAFANA_URL").rstrip("/")
            if grafana:
                text += f"\n[📊 Grafana에서 최근 30분 로그 보기]({grafana}/d/mycookie-logs?var-environment=prod&var-environment=shared&from=now-30m&to=now)"
            try:
                post(webhook, {"username": "나의쿠키", "text": text})
                state["alerted"] = True
            except Exception as e:
                print(f"알림 전송 실패({type(e).__name__})")
    else:
        if state["alerted"]:
            minutes = max(1, round((now - (state["since"] or now)) / 60))
            try:
                post(webhook, {"username": "나의쿠키", "text": f":white_check_mark: 사이트가 다시 응답해요 (약 {minutes}분 동안 문제)"})
            except Exception as e:
                print(f"복구 알림 전송 실패({type(e).__name__})")
        state = {"fails": 0, "alerted": False, "since": None}
    STATE.write_text(json.dumps(state))


if __name__ == "__main__":
    main()
