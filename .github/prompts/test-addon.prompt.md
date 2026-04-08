---
name: Test HA Addon
description: "Test a Home Assistant addon in this repository using repeatable checks and clear reporting"
argument-hint: "Addon path or name (for example: addons/ulux) and optional focus (lint, build, runtime, smoke)"
agent: agent
---
You are validating a Home Assistant addon in this repository.

Input:
- `$ARGUMENTS`: addon name/path and optional focus areas.

Task:
1. Resolve the target addon from `$ARGUMENTS`. If omitted, infer from the active file or ask one concise clarification.
2. Inspect addon essentials first:
- `config.json`
- `build.json`
- `Dockerfile`
- `README.md`
- app runtime files where relevant
3. Run the most relevant validation commands available in this repo for that addon.
4. If explicit tests are missing, run practical smoke checks (for example, JSON validity, Node install/build health, and addon metadata consistency).
5. Report findings with severity order:
- Blocking failures
- Warnings/risky gaps
- Passed checks
6. For each failure, provide:
- Short root cause
- Minimal fix proposal
- Exact file paths affected
7. If safe and requested, apply fixes and re-run the failing checks.

Output format:
- `Target:` resolved addon
- `Checks run:` bullet list with commands
- `Findings:` ordered by severity
- `Fixes applied:` list or `none`
- `Next steps:` short numbered list

Constraints:
- Prefer minimal, non-breaking fixes.
- Do not change unrelated files.
- If a required tool is unavailable, state it and provide the closest alternative.
