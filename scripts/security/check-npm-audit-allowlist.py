#!/usr/bin/env python3
"""Strict one-advisory exception for AHA development-only Jest dependency audit.

The production dependency scan MUST run separately and pass before this script.
A deviation from the exact, reviewed low-severity chain fails closed.
"""
import json
import subprocess
import sys

ADVISORY = "GHSA-gcqx-w48m-w2h4"
CHAIN = frozenset({"deepmerge", "jest-config", "@jest/core", "jest-cli", "jest"})
LEVELS = ("critical", "high", "moderate")


def decide(payload):
    if not isinstance(payload, dict):
        return False, "Malformed audit report"
    vulns = payload.get("vulnerabilities")
    if not isinstance(vulns, dict):
        return False, "Audit JSON has no vulnerability map"
    if not vulns:
        return True, "No npm audit vulnerabilities"
    if set(vulns) != CHAIN:
        return False, "Unexpected vulnerability package set: " + ", ".join(sorted(vulns))
    for name, item in vulns.items():
        if not isinstance(item, dict) or item.get("severity") != "low":
            return False, f"Unexpected or non-low severity in {name}"
        via = item.get("via")
        if not isinstance(via, list) or not via:
            return False, f"Missing upstream dependency chain for {name}"
        for issue in via:
            if isinstance(issue, str):
                if issue not in CHAIN:
                    return False, f"Unexpected indirect vulnerability in {name}"
            elif isinstance(issue, dict):
                url = issue.get("url", "")
                if ADVISORY not in url or issue.get("name") != "deepmerge":
                    return False, f"Unexpected direct advisory in {name}"
            else:
                return False, f"Unrecognized advisory representation for {name}"
    deepmerge = vulns["deepmerge"]
    if not any(isinstance(x, dict) and ADVISORY in x.get("url", "") for x in deepmerge["via"]):
        return False, "deepmerge source advisory mismatch"
    counts = payload.get("metadata", {}).get("vulnerabilities", {})
    if not isinstance(counts, dict) or any(counts.get(x, 0) != 0 for x in LEVELS):
        return False, "Other severity count is nonzero or metadata missing"
    return True, "Accepted documented low-severity, dev-only Jest deepmerge advisory"


def main():
    try:
        audit = subprocess.run(
            ["npm", "audit", "--json", "--audit-level=low"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=120,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        print("npm audit could not run:", type(exc).__name__, file=sys.stderr)
        return 2
    if audit.returncode not in (0, 1):
        print(f"npm audit failed unexpectedly, exit={audit.returncode}", file=sys.stderr)
        return 2
    try:
        payload = json.loads(audit.stdout)
    except ValueError:
        print("npm audit returned non-JSON output", file=sys.stderr)
        return 2
    allowed, explanation = decide(payload)
    stream = sys.stdout if allowed else sys.stderr
    print(explanation, file=stream)
    if allowed and payload.get("vulnerabilities"):
        print(
            "EXCEPTION: GHSA-gcqx-w48m-w2h4 / deepmerge / Jest dev-only / "
            "LOW; runtime npm audit --omit=dev must remain clean; "
            "review by 2026-12-15"
        )
    return 0 if allowed else 1


if __name__ == "__main__":
    raise SystemExit(main())
