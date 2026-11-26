"""Isolated, dependency-free regression tests for the AHA CI security guard."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

FILE = Path(__file__).resolve().parents[2] / "scripts/security/check-github-actions.py"
spec = importlib.util.spec_from_file_location("aha_ci_guard", FILE)
guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(guard)

SHA = "11d5960a326750d5838078e36cf38b85af677262"
SAFE = (
    "name: AHA guard fixture\n"
    "on:\n  pull_request:\n"
    "permissions:\n  contents: read\n"
    "jobs:\n  test:\n    runs-on: ubuntu-24.04\n"
    "    steps:\n      - uses: actions/checkout@" + SHA + "\n"
    "        with:\n          persist-credentials: false\n"
)


class WorkflowGuardTests(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name)
        self.workflow = self.root / ".github/workflows/guard.yml"
        self.workflow.parent.mkdir(parents=True)
        self.workflow.write_text(SAFE, encoding="utf-8")
        self.package = self.root / "frontend/package.json"
        self.package.parent.mkdir()
        self.package.write_text(json.dumps({"scripts": {"test": "node test.js"}}), encoding="utf-8")

    def test_safe_fixture_passes(self):
        self.assertEqual(guard.scan(self.root), [])

    def test_mutable_action_tag_rejected(self):
        self.workflow.write_text(SAFE.replace(SHA, "v4"), encoding="utf-8")
        self.assertTrue(any("unpinned" in issue for issue in guard.scan(self.root)))

    def test_persisted_git_credentials_rejected(self):
        self.workflow.write_text(SAFE.replace("persist-credentials: false", "persist-credentials: true"), encoding="utf-8")
        self.assertTrue(any("persisted credentials" in issue for issue in guard.scan(self.root)))

    def test_postinstall_hook_rejected(self):
        self.package.write_text(json.dumps({"scripts": {"postinstall": "node injected.js"}}), encoding="utf-8")
        self.assertTrue(any("postinstall" in issue for issue in guard.scan(self.root)))

    def test_pull_request_target_rejected(self):
        self.workflow.write_text(SAFE.replace("pull_request:", "pull_request_target:"), encoding="utf-8")
        self.assertTrue(any("pull_request_target" in issue for issue in guard.scan(self.root)))

    def test_secrets_json_dump_rejected(self):
        self.workflow.write_text(SAFE + "\n# $" + "{{ toJSON(secrets) }}\n", encoding="utf-8")
        self.assertTrue(any("secrets JSON dump" in issue for issue in guard.scan(self.root)))

    def test_piped_installer_rejected(self):
        self.workflow.write_text(SAFE + "\n# curl https://example.com/install.sh | bash\n", encoding="utf-8")
        self.assertTrue(any("piped shell installer" in issue for issue in guard.scan(self.root)))


if __name__ == "__main__":
    unittest.main()
