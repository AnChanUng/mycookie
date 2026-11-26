import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import memory_anomaly as detector
import observe_memory as observer


class MemoryDetectionTest(unittest.TestCase):
    def replay(self, tail):
        values = [390 + i % 3 for i in range(72)] + tail
        return detector.analyze({i * 300: n for i, n in enumerate(values) if n is not None},
                                0, (len(values) - 1) * 300)

    def test_normal_and_brief_peak(self):
        self.assertEqual(self.replay([391] * 10)["events"], [])
        self.assertEqual(self.replay([490, 391, 390])["events"], [])

    def test_sustained_peak(self):
        event, = self.replay([490] * 6)["events"]
        self.assertEqual(event["detected"], detector.utc(73 * 300))

    def test_gap_resets_evidence(self):
        report = self.replay([490, None, 490, 490])
        self.assertEqual(report["missing_windows"], 1)
        self.assertEqual(report["events"], [])


class ApiEvidenceTest(unittest.TestCase):
    detected = 1795439100

    def test_latest_completed_deployment_per_service_at_detection(self):
        event = dict(detected="2026-11-23T13:05+00:00")
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder, "prod-deployments.tsv")
            reports = [dict(events=[event])]
            observer.attach_deployments(reports, path)
            self.assertEqual(event["latest_deployments"], {})
            path.write_text("".join(f"2026-11-23T13:{minute}:00Z\t{service}\t{key * 40}\n"
                                    for minute, service, key in [("04", "backend", "a"), ("06", "backend", "b"),
                                                                 ("05", "frontend", "c"), ("00", "backend", "d")]))
            observer.attach_deployments(reports, path)
            self.assertEqual(event["latest_deployments"]["backend"]["commit"], "a" * 40)
            self.assertEqual(event["latest_deployments"]["frontend"]["commit"], "c" * 40)

    def summarize(self, matrix):
        with patch.object(detector, "read_matrix", return_value=matrix):
            return detector.api_at_detection({"detected": detector.utc(self.detected)}, None, False)

    def series(self, group, values):
        return {"metric": {"http_class": group}, "values": values}

    def test_previous_bucket_does_not_mix_into_detection(self):
        result = self.summarize([
            self.series("2", [(self.detected - 300, "149"), (self.detected, "36")]),
            self.series("4", [(self.detected - 300, "4")]),
        ])
        self.assertEqual((result["requests_in_5m"], result["responses_5xx_in_5m"]), (36, 0))
        self.assertEqual(result["status"], "no_5xx_observed")

    def test_missing_bucket_is_unknown(self):
        for matrix in ([], [self.series("2", [(self.detected - 300, "36")])]):
            with self.subTest(matrix=matrix):
                result = self.summarize(matrix)
                self.assertEqual(result["status"], "no_observed_requests")
                self.assertIsNone(result["responses_5xx_in_5m"])

    def test_server_errors_included_in_total(self):
        result = self.summarize([self.series("2", [(self.detected, "8")]),
                                 self.series("5", [(self.detected, "2")])])
        self.assertEqual((result["requests_in_5m"], result["responses_5xx_in_5m"]), (10, 2))
        self.assertEqual(result["status"], "5xx_observed")

    def test_independent_cli_without_prometheus_and_repeat_save(self):
        t = self.detected
        # 1/2 is low volume, 3/100 is below the rate threshold, 3/60 meets both.
        rows = [self.series("5", [(t-600, "1"), (t-300, "3"), (t, "3")]),
                self.series("2", [(t-600, "1"), (t-300, "97"), (t, "57")])]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder, "api.json")
            path.write_text(json.dumps({"status": "success", "data": {"resultType": "matrix", "result": rows}}))
            output = subprocess.check_output([sys.executable, detector.__file__, "--api-observation",
                                              "--api-json", str(path), "--end", str(t)])
        report = json.loads(output)
        self.assertEqual(report["observed_windows"], 3)
        event, = report["events"]
        self.assertEqual(event, dict(detected=detector.utc(t), requests=60, failures=3, percent=5))
        with sqlite3.connect(":memory:") as db:
            observer.save_api(db, report)
            observer.save_api(db, report)
            self.assertEqual(db.execute("SELECT count(first_recorded_utc) FROM api_events").fetchone(), (1,))

    def test_missing_api_logs_and_unavailable_loki(self):
        with patch.object(detector, "read_matrix", return_value=[]):
            result = detector.api_observation(self.detected, None)
            self.assertEqual(result["status"], "no_observed_requests")
            self.assertFalse(result["events"])
        with patch.object(detector, "read_matrix", side_effect=TimeoutError):
            self.assertEqual(detector.api_observation(self.detected, None)["status"], "loki_unavailable")
