import unittest
from unittest.mock import patch

import memory_anomaly as detector


class ApiEvidenceTest(unittest.TestCase):
    detected = 1795439100

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
