#!/usr/bin/env python3
"""Fail-closed AHA CI baseline guard. No network or production credentials used.

This is defense in depth, NOT evidence that an account was never compromised.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PIN = re.compile(r"^(?:[A-Za-z0-9_.-]+/)+[A-Za-z0-9_.-]+@[a-f0-9]{40}$")
USES = re.compile(r"(?m)^(?P<indent>\s*)-\s+uses:\s*(?P<ref>[^\s#]+)")
LIFECYCLE = {"preinstall", "install", "postinstall", "prepare",
             "postprepare", "prepublish", "prepublishOnly"}


def scan(root: Path) -> list[str]:
    problems = []
    directory = root / ".github" / "workflows"
    workflows = sorted(directory.glob("*.yml")) + sorted(directory.glob("*.yaml"))
    if not workflows:
        problems.append("No workflows found; refusing an empty scan")
    for workflow in workflows:
        text = workflow.read_text(encoding="utf-8")
        name = str(workflow.relative_to(root))
        if not re.search(r"(?m)^permissions:\s*$", text):
            problems.append(f"{name}: declare top-level permissions")
        if not re.search(r"(?m)^  contents:\s*read\s*$", text):
            problems.append(f"{name}: use read-only contents permission")
        unsafe = {
            "pull_request_target trigger": r"(?m)^\s*pull_request_target\s*:",
            "workflow_run trigger": r"(?m)^\s*workflow_run\s*:",
            "write-all token": r"(?m)^\s*permissions:\s*write-all\b",
            "secrets JSON dump": r"(?i)toJSON\s*\(\s*secrets\s*\)",
            "piped shell installer": r"(?im)\b(?:curl|wget)\b[^\n|]{0,250}\|\s*(?:bash|sh)\b",
        }
        for reason, expression in unsafe.items():
            if re.search(expression, text):
                problems.append(f"{name}: review high-risk {reason}")
        for item in USES.finditer(text):
            ref = item.group("ref")
            if ref.startswith("./"):
                continue
            if not PIN.fullmatch(ref):
                problems.append(f"{name}: unpinned action reference {ref}")
            if ref.startswith("actions/checkout@"):
                # Scope credential check to this step, not another checkout elsewhere.
                body = []
                for line in text[item.end():].splitlines():
                    if re.match(rf"^{re.escape(item.group('indent'))}-\s", line):
                        break
                    body.append(line)
                if not re.search(r"(?m)^\s+persist-credentials:\s*false\s*$", "\n".join(body)):
                    problems.append(f"{name}: checkout must disable persisted credentials")

    manifests = sorted(p for p in root.rglob("package.json") if "node_modules" not in p.parts)
    if not manifests:
        problems.append("No package manifests found; refusing empty npm scan")
    for file in manifests:
        name = str(file.relative_to(root))
        try:
            scripts = json.loads(file.read_text(encoding="utf-8")).get("scripts", {})
        except (ValueError, UnicodeError) as exc:
            problems.append(f"{name}: malformed manifest: {exc}")
            continue
        if not isinstance(scripts, dict):
            problems.append(f"{name}: scripts must be an object")
            continue
        for hook in sorted(LIFECYCLE.intersection(scripts)):
            problems.append(f"{name}: npm lifecycle hook '{hook}' requires security review")
    return problems


def main() -> int:
    root = Path(__file__).resolve().parents[2]
    problems = scan(root)
    if problems:
        print("AHA CI supply-chain baseline FAILED:")
        for problem in problems:
            print(" -", problem)
        return 1
    print("AHA CI supply-chain baseline PASS")
    print("Static CI checks cannot prove an account or its tokens are uncompromised.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
