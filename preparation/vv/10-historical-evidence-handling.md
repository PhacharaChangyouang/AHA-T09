# Historical test evidence — publication-safe handling note

This is a working checklist, not a test report. The earlier full application has a history of automated component/regression checks, integration tests, dependency audits, and synthetic restore trials. Original records remain in the restricted project repository or controlled storage. Their existence or reported totals do not establish any pass on the Academic baseline.

| Evidence category | Potential course use | Required before acceptance |
|---|---|---|
| Existing automated cases | CP3 / CP4 regression | Map to approved RTM, compare source and runner, rerun Academic |
| HTTP and database integration | D13 / CP4 | Verify raw execution provenance privately, adapt to local fixture and Academic contract |
| Dependency/supply-chain checks | CP4 security | Run current dependency graph and record date/versions |
| Synthetic backup/restore | CP4 reliability | Use disposable Academic data and verify counts/checksum; do not import original backup |
| Browser/device observations | CP4 system | Check scope, version, device and scenario; rerun where different |
| Earlier usability questionnaire | CP4 usability context | Verify instrument and scoring; not a substitute for UAT task completion |

Do not attach private logs, private URLs, actual usernames, account identifiers, raw survey rows, backup files, internal security/operational reports or credentials to this Public branch. Any later publication of historical results requires a separate reviewed, sanitized summary and evidence-access decision. No original reports or code were copied here.
