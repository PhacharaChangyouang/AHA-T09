#!/usr/bin/env bash
set -euo pipefail
# Run after authenticating with GitHub CLI. Only the academic repository is targeted.
repo='PhacharaChangyouang/AHA-T09'
command -v gh >/dev/null || { echo 'GitHub CLI (gh) is required.' >&2; exit 1; }
gh auth status
gh label create 'type:defect' --repo "$repo" --color d73a4a --description 'Software defect' --force
gh label create 'severity:critical' --repo "$repo" --color b60205 --description 'ระบบล่ม ข้อมูลเสียหายหรือรั่ว หรืองานหลักทำไม่ได้และไม่มีทางเลี่ยง' --force
gh label create 'severity:major' --repo "$repo" --color d97706 --description 'ฟังก์ชันสำคัญทำงานผิด แต่มีทางเลี่ยง หรือกระทบผู้ใช้จำนวนมาก' --force
gh label create 'severity:minor' --repo "$repo" --color fbca04 --description 'ผิดเล็กน้อย เช่น ข้อความ การจัดหน้า ไม่กระทบงานหลัก' --force
gh label list --repo "$repo" --limit 100
