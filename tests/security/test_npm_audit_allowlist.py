#!/usr/bin/env python3
"""Synthetic security regression tests; never downloads npm packages."""
import importlib.util
import pathlib
import unittest

path = pathlib.Path(__file__).resolve().parents[2] / "scripts/security/check-npm-audit-allowlist.py"
spec = importlib.util.spec_from_file_location("audit_policy", path)
policy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(policy)

def valid_report():
    result = {}
    for name in policy.CHAIN:
        result[name] = {"severity": "low", "via": ["deepmerge"]}
    result["deepmerge"]["via"] = [{
        "name": "deepmerge",
        "url": "https://github.com/advisories/GHSA-gcqx-w48m-w2h4",
    }]
    return {"vulnerabilities": result, "metadata": {"vulnerabilities": {
        "low": 5, "moderate": 0, "high": 0, "critical": 0
    }}}

class AuditGateTests(unittest.TestCase):
    def test_exact_exception_passes(self):
        self.assertTrue(policy.decide(valid_report())[0])
    def test_clean_audit_passes(self):
        self.assertTrue(policy.decide({"vulnerabilities": {}})[0])
    def test_new_vulnerability_rejected(self):
        x = valid_report()
        x["vulnerabilities"]["other-risk"] = {"severity": "low", "via": ["deepmerge"]}
        self.assertFalse(policy.decide(x)[0])
    def test_medium_rejected(self):
        x = valid_report()
        x["vulnerabilities"]["jest"]["severity"] = "moderate"
        self.assertFalse(policy.decide(x)[0])
    def test_unknown_advisory_rejected(self):
        x = valid_report()
        x["vulnerabilities"]["deepmerge"]["via"][0]["url"] = "https://github.com/advisories/UNKNOWN"
        self.assertFalse(policy.decide(x)[0])
    def test_bad_metadata_rejected(self):
        x = valid_report()
        x["metadata"]["vulnerabilities"]["high"] = 1
        self.assertFalse(policy.decide(x)[0])
    def test_missing_audit_json_rejected(self):
        self.assertFalse(policy.decide({})[0])

if __name__ == "__main__":
    unittest.main()
