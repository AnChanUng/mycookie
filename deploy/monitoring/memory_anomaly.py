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


def compare_errors(event, source, threshold, offline):
    detected = int(datetime.fromisoformat(event["detected"]).timestamp())
    start, end = detected - 900, detected + 900
    params = urlencode(dict(query=ERROR_QUERY, start=start * 10**9, end=end * 10**9, step=60))
    path = "/loki/api/v1/query_range?" + params
    link = "https://grafana.mycookie.dev/api/datasources/proxy/uid/loki" + path
    result = dict(grafana_query=link, threshold=threshold)
    if offline and not source:
        return dict(result, status="awaiting_log_export")
    try:
        matrix = read_matrix(source, "http://loki:3100" + path)
    except OSError as error:
        if source:
            raise
        return dict(result, status="loki_unavailable", reason=type(error).__name__)
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


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--memory-json", type=Path, help="Prometheus range-query export")
    parser.add_argument("--end", type=int, help="last five-minute bucket, Unix seconds (required for an export)")
    parser.add_argument("--errors-json", type=Path, help="Loki range-query export from grafana_query")
    parser.add_argument("--error-threshold", type=int, default=10)
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
        for event in report["events"]:
            event["errors"] = compare_errors(event, args.errors_json, args.error_threshold, bool(args.memory_json))
        print(json.dumps(dict(container=item["metric"].get("name"), unit="MiB",
                              start=utc(start), end=utc(end), **report), indent=2))


if __name__ == "__main__":
    main()
