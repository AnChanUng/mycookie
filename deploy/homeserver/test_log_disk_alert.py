import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import healthcheck


class LogDiskAlertTest(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.marker = Path(folder.name, "alerted")
        self.fs = SimpleNamespace(f_blocks=110, f_bfree=30, f_bavail=20, f_frsize=4096)
        for mock in (patch.object(healthcheck, "DISK_STATE", self.marker),
                     patch.object(healthcheck.subprocess, "check_output", return_value=folder.name),
                     patch.object(healthcheck.os, "statvfs", return_value=self.fs, create=True)):
            mock.start()
            self.addCleanup(mock.stop)

    @patch.object(healthcheck, "post")
    def test_crossing_recovery_and_repeat(self, post):
        healthcheck.check_log_disk("mock")
        post.assert_not_called()  # 80% exactly
        self.fs.f_bfree, self.fs.f_bavail = 29, 19
        healthcheck.check_log_disk("mock")
        healthcheck.check_log_disk("mock")
        post.assert_called_once()
        self.assertIn("81.00%", post.call_args.args[1]["text"])
        self.fs.f_bfree, self.fs.f_bavail = 30, 20
        healthcheck.check_log_disk("mock")
        self.fs.f_bfree, self.fs.f_bavail = 29, 19
        healthcheck.check_log_disk("mock")
        self.assertEqual(post.call_count, 2)

    @patch.object(healthcheck, "post", side_effect=[TimeoutError(), None])
    def test_failed_delivery_is_retried(self, post):
        self.fs.f_bfree, self.fs.f_bavail = 29, 19
        with self.assertRaises(TimeoutError):
            healthcheck.check_log_disk("mock")
        self.assertFalse(self.marker.exists())
        healthcheck.check_log_disk("mock")
        self.assertTrue(self.marker.exists())
