"""Run from the home server. Keep observation runs and first-seen events in SQLite."""

import json
import sqlite3
import subprocess
import sys
from pathlib import Path


def save(connection, reports):
    with connection:
        connection.execute("""CREATE TABLE IF NOT EXISTS runs (
            container TEXT NOT NULL, end_utc TEXT NOT NULL, assessed INTEGER, missing INTEGER,
            PRIMARY KEY (container, end_utc))""")
        connection.execute("""CREATE TABLE IF NOT EXISTS events (
            container TEXT NOT NULL, detected_utc TEXT NOT NULL, evidence TEXT NOT NULL,
            PRIMARY KEY (container, detected_utc))""")
        for report in reports:
            container = report["container"]
            connection.execute("INSERT OR REPLACE INTO runs VALUES (?, ?, ?, ?)",
                               (container, report["end"], report["assessed_windows"], report["missing_windows"]))
            for event in report["events"]:
                connection.execute("INSERT OR IGNORE INTO events VALUES (?, ?, ?)",
                                   (container, event["detected"], json.dumps(event)))


def main():
    detector = Path(__file__).with_name("memory_anomaly.py")
    with detector.open("rb") as source:
        result = subprocess.run(
            ["docker", "exec", "-i", "mycookie-monitoring-stats-1", "python", "-", "--observation"],
            stdin=source, stdout=subprocess.PIPE, check=True, timeout=850)
    reports = [json.loads(line) for line in result.stdout.splitlines()]
    if not reports:
        sys.exit("No container observations returned")
    with sqlite3.connect(sys.argv[1]) as connection:
        save(connection, reports)
    print("Recorded observation through", reports[0]["end"])


if __name__ == "__main__":
    main()
