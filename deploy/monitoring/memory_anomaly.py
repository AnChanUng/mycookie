"""Replay seven days of production backend memory and print sustained rises (UTC)."""

import argparse
import json
import math
import statistics
import sys
import time
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen


STEP = 300
HISTORY = 72  # Six hours of consecutive five-minute means
ALPHA = 0.3
METRIC = 'mycookie_container_memory_bytes{environment="prod",service="backend"}'
QUERY = (
    f'(avg_over_time({METRIC}[5m]) / 1048576) '
    f'and (count_over_time({METRIC}[5m]) >= 8)'
)


def utc(timestamp):
    return datetime.fromtimestamp(timestamp, timezone.utc).isoformat(timespec="minutes")


def analyze(values, start, end):
    history = deque(maxlen=HISTORY)
    smoothed = None
    streak = 0
    events = []
    assessed = missing = 0
    for timestamp in range(start, end + 1, STEP):
        value = values.get(timestamp, math.nan)
        if not math.isfinite(value):
            missing += 1
            history.clear()
            smoothed = None
            streak = 0
            continue
        smoothed = value if smoothed is None else ALPHA * value + (1 - ALPHA) * smoothed
        if len(history) == HISTORY:
            assessed += 1
            mean = statistics.mean(history)
            sigma = statistics.pstdev(history)
            threshold = mean + max(20, 3 * sigma)
            if smoothed > threshold and value > threshold:
                streak += 1
                if streak == 1:
                    first_value = value
                elif streak == 2:
                    events.append(dict(first=utc(timestamp - STEP), detected=utc(timestamp),
                                       last=utc(timestamp), mean=round(mean, 1),
                                       threshold=round(threshold, 1), peak=round(max(first_value, value), 1)))
                else:
                    events[-1]["last"] = utc(timestamp)
                    events[-1]["peak"] = max(events[-1]["peak"], round(value, 1))
            else:
                streak = 0
        history.append(value)
    return dict(assessed_windows=assessed, missing_windows=missing, events=events)


LOG_SELECTOR = '{environment="prod",service="backend"}'
ERROR_SELECTOR = '{environment="prod",service="backend",level="ERROR"}'
# Only report zero where Loki saw backend logs in that window.
ERROR_QUERY = (f'sum(count_over_time({ERROR_SELECTOR}[5m])) or '
               f'(0 * sum(count_over_time({LOG_SELECTOR}[5m])))')
API_QUERY = ('sum by (http_class) (count_over_time({environment="prod",service="frontend"} '
             '| regexp `"[^" ]+ /api/[^" ]* HTTP/[0-9.]+" (?P<http_class>[1-5])[0-9]{2} ` '
             '| http_class!="" [5m]))')


def read_matrix(source, url):
    if source:
        with source.open(encoding="utf-8-sig") as stream:
            data = json.load(stream)
    else:
        with urlopen(url, timeout=60) as response:
            data = json.load(response)
    if data.get("status") != "success" or data["data"]["resultType"] != "matrix":
        raise ValueError("Expected a successful range query (matrix)")
    return data["data"]["result"]


def loki_range(query, start, end, step, source, offline):
    params = urlencode(dict(query=query, start=start * 10**9, end=end * 10**9, step=step))
    path = "/loki/api/v1/query_range?" + params
    link = "https://grafana.mycookie.dev/api/datasources/proxy/uid/loki" + path
    result = dict(grafana_query=link)
    if offline and not source:
        return dict(result, status="awaiting_log_export"), None
    try:
        matrix = read_matrix(source, "http://loki:3100" + path)
    except OSError as error:
        if source:
            raise
        return dict(result, status="loki_unavailable", reason=type(error).__name__), None
    return result, matrix


def compare_errors(event, source, threshold, offline):
    detected = int(datetime.fromisoformat(event["detected"]).timestamp())
    start, end = detected - 900, detected + 900
    result, matrix = loki_range(ERROR_QUERY, start, end, 60, source, offline)
    result["threshold"] = threshold
    if matrix is None:
        return result
    if len(matrix) > 1:
        raise ValueError("Expected a single aggregate ERROR count")
    values = {int(t): float(n) for row in matrix for t, n in row["values"]}
    observed = [(t, values[t]) for t in range(start, end + 1, 60)
                if t in values and math.isfinite(values[t])]
    matches = [t for t, count in observed if count >= threshold]
    result.update(observed_minutes=len(observed), expected_minutes=31,
                  peak_errors_in_5m=max((n for _, n in observed), default=None))
    if matches:
        result.update(status="threshold_observed", first_observed=utc(matches[0]),
                      minutes_from_memory_detection=(matches[0] - detected) // 60)
    else:
        result["status"] = "below_threshold" if len(observed) == 31 else "insufficient_log_coverage"
    return result


def api_at_detection(event, source, offline):
    detected = int(datetime.fromisoformat(event["detected"]).timestamp())
    # Request two evaluations; use only the five-minute bucket ending at detection.
    result, matrix = loki_range(API_QUERY, detected - STEP, detected, STEP, source, offline)
    result.update(requests_in_5m=None, responses_5xx_in_5m=None)
    if matrix is None:
        return result
    counts = {}
    for row in matrix:
        group = row["metric"].get("http_class")
        if group not in ("1", "2", "3", "4", "5"):
            raise ValueError("Expected Loki API counts grouped by http_class")
        for timestamp, value in row["values"]:
            if int(timestamp) == detected:
                count = float(value)
                if not count.is_integer() or count < 0 or group in counts:
                    raise ValueError("Invalid API response count at detection")
                counts[group] = int(count)
    total = sum(counts.values())
    if not total:
        return dict(result, status="no_observed_requests")
    failures = counts.get("5", 0)
    return dict(result, requests_in_5m=total, responses_5xx_in_5m=failures,
                status="5xx_observed" if failures else "no_5xx_observed")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--memory-json", type=Path, help="Prometheus range-query export")
    parser.add_argument("--end", type=int, help="last five-minute bucket, Unix seconds (required for an export)")
    parser.add_argument("--errors-json", type=Path, help="Loki range-query export from grafana_query")
    parser.add_argument("--api-json", type=Path, help="Loki Nginx API counts grouped by http_class")
    parser.add_argument("--error-threshold", type=int, default=10)
    parser.add_argument("--observation", action="store_true",
                        help="emit one JSON line per container and enrich detections from the last day")
    args = parser.parse_args()
    if args.memory_json and args.end is None:
        parser.error("--memory-json requires --end to preserve missing buckets")
    if args.error_threshold < 1 or (args.end is not None and args.end % STEP):
        parser.error("threshold must be positive and end must align to five minutes")
    end = args.end if args.end is not None else int(time.time()) // STEP * STEP - STEP
    start = end - 7 * 86400 + STEP
    params = urlencode(dict(query=QUERY, start=start, end=end, step=STEP))
    series = read_matrix(args.memory_json, "http://prometheus:9090/api/v1/query_range?" + params)
    if not series:
        sys.exit("No eligible prod backend samples in the seven-day range.")
    for item in series:
        values = {int(ts): float(value) for ts, value in item["values"]}
        report = analyze(values, start, end)
        if args.observation:
            # Allow fifteen minutes after detection for the subsequent ERROR-count windows.
            report["events"] = [event for event in report["events"]
                                if utc(end - 86400) < event["detected"] <= utc(end - 900)]
        for event in report["events"]:
            event["errors"] = compare_errors(event, args.errors_json, args.error_threshold, bool(args.memory_json))
            event["api"] = api_at_detection(event, args.api_json, bool(args.memory_json))
        print(json.dumps(dict(container=item["metric"].get("name"), unit="MiB",
                              start=utc(start), end=utc(end), **report), indent=None if args.observation else 2))


if __name__ == "__main__":
    main()
