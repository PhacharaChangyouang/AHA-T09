# Test Reuse Matrix — Academic working draft

> T09 · 27 พ.ย. 2569 · preparation only · Academic baseline d78e0600eb454066866a0dddd1dbe518fdfe81e2

## Comparison method
Read-only comparison of Git tree file paths and blob SHA across the two repository snapshots. Filter covered test directories, CI, workflow and selected test/check scripts; counts below are files, not executed tests or cases. Exact content identity does not imply identical runtime behavior or a passing result.

| Category | Count |
|---|---:|
| Academic selected test/CI files | 52 |
| Original selected test/CI files | 114 |
| Same path, identical Git blob | 36 |
| Same path, different blob | 11 |
| Present only in original selection | 67 |
| Present only in Academic selection | 5 |

Do not assume missing files are authorized to publish. No raw private files, repository history, internal operation details, account data or credentials have been imported. Comparison figures are aggregate inventory counts; source review remains necessary for each potential reuse.

## Reuse decisions and academic traceability (proposed)
| Area | Existing Academic path(s) | Comparison | Requirement group | Course use | Decision |
|---|---|---|---|---|---|
| Authentication / Session | backend/auth-service/tests/session-revocation.test.js; token-security.test.js; registration-security.test.js | same blob for listed files | FR-01, NFR-05 | CP3, D13, CP4 | Reuse existing tests; add real HTTP logout and cross-service revocation in runner. |
| Family / Authorization | backend/auth-service/tests/family-connection-security.test.js; backend/reminder-service/tests/audit-idor-20261016.test.js | same blob | FR-05, FR-07, DR-02, NFR-05 | D13, CP4 | Reuse mock tests; add two-family HTTP, denied edit/delete, revoke and data preservation. |
| Reminder / Scheduler | backend/reminder-service/tests/scheduler-date.test.js; tests/security/scheduler-guard.test.cjs | same blob | FR-02–04, NFR-03–04 | CP3, CP4 | Reuse boundary and overlap tests; real clock-controlled integration still pending. |
| Notification / SOS | backend/notification-service/tests/security.test.js; retention.test.js; tests/security/academic-sos.test.cjs | security differs; retention same; Academic guard unique | FR-06, FR-09, SI-01, SI-03 | D13, CP4 | Preserve Academic location rejection, local notification only; add positive local SOS and owner/recipient assertions. |
| Voice | frontend/tests/voice-understanding.test.mjs; voice-dialogue.cjs; voice-viewport.cjs | same blob | FR-08, FR-10, NFR-07 | CP3, CP4 | Reuse rule-based parsing tests; browser/device speech and actual UAT still pending. |
| Web UI / Mobile | frontend/tests/ui-experience.cjs; reminder-sync.cjs; mobile-feedback.cjs; layout-refresh.cjs | same blob | FR-02–05, NFR-01–02, NFR-06 | CP4 | Review hard-coded origins, session fixtures and browser dependencies before run. |
| Academic isolation | tests/security/academic-db.test.cjs; academic-network.test.cjs; academic-sos.test.cjs | Academic-only | DR-04, NFR-05, SI-01/03 | D12, D13, CP4 | Must not overwrite or remove; run first. |
| Database recovery | ci/schema-synthetic-restore.sh | changed | Reliability / DR-04 | CP4 | Keep academic version; review disposable restore/checksum and run on new synthetic DB only. |
| Supply-chain / regression | scripts/security/check-github-actions.py; check-npm-audit-allowlist.py; tests/security/test_github_actions_guard.py; test_npm_audit_allowlist.py | same blob | NFR-05 / project risk | CP4 | Read existing commands and report current result; historical audit does not certify current dependencies. |
| Native SOS | mobile_app/test/sos_screen_test.dart | same blob | FR-09, UI-03 (supplementary) | CP4 if scope accepted | Native outside current Web/PWA SRS; do not count as core coverage until approved. |

## Additional design reuse
The two existing Academic workflows for real HTTP refer to absent local test scripts. Reviewed earlier test designs for two-family access, rejected changes, session revocation, local SOS recipients, retry/idempotency and notification retention. Rather than transferring private scripts or replacing Academic safeguards, extend the existing local fixture-based API runner from the Academic source itself.
- Added 8 candidate scenarios: CARE-LINKED-B, CARE-DENIED-EDIT, CARE-DENIED-DELETE, SOS-LOCAL-RECIPIENT, PUSH-STATUS, CARE-REVOKE-DENIED, CARE-REVOKE, SESSION-LOGOUT.
- Extended draft OpenAPI subset for caregiver update/delete, family revoke, push status and logout. These are source-derived descriptions, not approved contract or full schema validation.
- The runner mutates synthetic relationships and sessions; every run needs a freshly seeded, isolated Compose project. SOS proves local persisted/readable notification at most, never a device receipt. Denied changes checked by owner read-back; additional direct DB side-effect checks, concurrency, controlled time and failure injection remain pending.
- Real HTTP workflow scripts are still absent in main. Do not re-enable/replace workflow without compatibility and safety review.

## Historical evidence handling
Earlier development tests are useful context for selecting regression cases. Keep original run artifacts, private source references, and internal security/operations evidence in the restricted evidence store; only share a separately reviewed academic summary with provenance and permission. A historical run at a different commit is not current Academic execution evidence; do not populate CP4 pass/fail with historical totals. No raw evidence imported in this commit. See the private evidence register maintained by the project team.

For each historical item considered later record: source baseline (restricted reference), date, test ID/category, environment, actual/expected, scope difference, artifact access/retention, reviewer, decision (reuse/adapt/exclude), Academic rerun ID. Do not count duplicates across suites. Any unavailable original log stays reported/unverified.

## Next academic gates
1. Confirm scope/RTM after CP1–CP3; select reusable test cases.
2. Verify local fixture seed and run the HTTP suite on a fresh project; capture sanitized actual results.
3. Add controlled-clock scheduler, real database concurrency, and cross-service failure/retry cases after contract approval.
4. Record real defects with label and reproducible expected/actual; no fabricated issues.
5. Run system/UAT/NFR against approved academic baseline for CP4; report blocked and not-run separately.

All new tests in this draft remain Not run. No production connection, live email, live Web Push or real location permitted.
