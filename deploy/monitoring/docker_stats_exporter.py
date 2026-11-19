#!/usr/bin/env python3
"""컨테이너별 CPU, 메모리를 Prometheus 형식으로 내보낸다(docker stats와 같은 값).

cAdvisor는 최신 Docker의 이미지 저장 방식(containerd snapshotter)에서 컨테이너를 읽지 못해서,
Docker API(/containers/{id}/stats)를 직접 읽는다. 표준 라이브러리만 쓴다.
  GET :9101/metrics
"""
import http.client
import json
import re
import socket
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

SOCK = "/var/run/docker.sock"
PROJECTS = ("devcookie", "mycookie-monitoring")


class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self):
        super().__init__("localhost", timeout=20)

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.settimeout(20)
        self.sock.connect(SOCK)


def docker(path):
    conn = UnixHTTPConnection()
    try:
        conn.request("GET", path)
        return json.loads(conn.getresponse().read())
    finally:
        conn.close()


def labels(name):
    m = re.fullmatch(r"(devcookie|mycookie-monitoring)-(.+)-\d+", name)
    if not m:
        return None
    project, service = m.groups()
    env = "monitoring" if project == "mycookie-monitoring" else "shared"
    m2 = re.fullmatch(r"(backend|frontend)-(prod|staging)", service)
    if m2:
        service, env = m2.groups()
    return {"name": name, "service": service, "environment": env}


def one(container):
    name = container["Names"][0].lstrip("/")
    lab = labels(name)
    if lab is None:
        return None
    s = docker(f"/containers/{container['Id']}/stats?stream=false")
    mem = s.get("memory_stats", {})
    usage = mem.get("usage", 0)
    cache = mem.get("stats", {}).get("inactive_file", mem.get("stats", {}).get("total_inactive_file", 0))
    working = max(0, usage - cache)               # docker stats와 같은 계산
    limit = mem.get("limit", 0)
    cpu, pre = s.get("cpu_stats", {}), s.get("precpu_stats", {})
    cpu_delta = cpu.get("cpu_usage", {}).get("total_usage", 0) - pre.get("cpu_usage", {}).get("total_usage", 0)
    sys_delta = cpu.get("system_cpu_usage", 0) - pre.get("system_cpu_usage", 0)
    cpus = cpu.get("online_cpus") or len(cpu.get("cpu_usage", {}).get("percpu_usage", []) or [1])
    cpu_pct = (cpu_delta / sys_delta) * cpus * 100 if sys_delta > 0 and cpu_delta > 0 else 0.0
    return lab, working, limit, cpu_pct


def render():
    containers = [c for c in docker("/containers/json") if any(c["Names"][0].lstrip("/").startswith(p + "-") for p in PROJECTS)]
    with ThreadPoolExecutor(max_workers=8) as pool:
        rows = [r for r in pool.map(lambda c: _safe(one, c), containers) if r]
    out = [
        "# HELP mycookie_container_memory_bytes 컨테이너 메모리 사용량(캐시 제외, docker stats와 같음)",
        "# TYPE mycookie_container_memory_bytes gauge",
        "# HELP mycookie_container_memory_limit_bytes 컨테이너 메모리 한도(mem_limit)",
        "# TYPE mycookie_container_memory_limit_bytes gauge",
        "# HELP mycookie_container_cpu_percent 컨테이너 CPU 사용률(코어 1개 = 100)",
        "# TYPE mycookie_container_cpu_percent gauge",
        "# HELP mycookie_container_up 실행 중인 컨테이너",
        "# TYPE mycookie_container_up gauge",
    ]
    for lab, working, limit, cpu in rows:
        l = ",".join(f'{k}="{v}"' for k, v in lab.items())
        out += [f"mycookie_container_memory_bytes{{{l}}} {working}",
                f"mycookie_container_memory_limit_bytes{{{l}}} {limit}",
                f"mycookie_container_cpu_percent{{{l}}} {cpu:.3f}",
                f"mycookie_container_up{{{l}}} 1"]
    return "\n".join(out) + "\n"


def _safe(fn, arg):
    try:
        return fn(arg)
    except Exception as e:  # 컨테이너 하나가 실패해도 나머지는 내보낸다
        print(f"stats 실패: {type(e).__name__}", flush=True)
        return None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_response(404); self.end_headers(); return
        try:
            body = render().encode()
            self.send_response(200)
        except Exception as e:
            body = f"# error {type(e).__name__}\n".encode()
            self.send_response(500)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", 9101), Handler).serve_forever()
