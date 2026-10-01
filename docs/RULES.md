# Concuryx Engineering Rules

This is the project's highest-authority document.

## 1. Document authority

Authority descends in this order:

1. `docs/RULES.md`
2. `docs/PROJECT_CONTEXT.md`
3. `docs/PRD.md`
4. `docs/THREAT_MODEL.md`
5. `docs/ARCHITECTURE.md`
6. `docs/REQUEST_MODEL.md`
7. `docs/DESIGN.md`
8. `docs/PHASES.md`
9. `references/*`
10. implementation

Code must conform to documents. Implementation cannot redefine requirements. If authoritative documents conflict, stop and report the conflict.

## 2. Context Lock

Before every phase, explicitly state the current phase, approved objective, files expected to change, architecture constraints, acceptance criteria, prohibited work, and unresolved decisions. Do not implement until the Context Lock is coherent.

## 3. Human-owned decisions

Do not silently change architecture, libraries, framework, request model, design language, directory structure, security model, or product scope. If an unspecified major decision is required, stop, explain the options, and wait for human approval.

## 4. Change classification

### GREEN

Directly required phase work, its tests, and local refactoring strictly necessary for it.

### YELLOW

Non-essential refactoring, documentation restructuring, or optimization. Do not perform it without clear justification in the completion report.

### RED

- New framework or replacement library.
- Architecture change.
- New external service or network boundary.
- Database addition.
- Paid or credit-card-gated API/service.
- Analytics or telemetry.
- Security-model change.
- Major design or product-scope change.

Stop before a RED change, report the proposal and reason, and wait for human approval.

## 5. Minimal diff

Do not reformat, rename, clean up, or alter unrelated files. Do not rewrite working modules or established naming without a phase requirement. Each phase must produce one coherent change set.

## 6. Dependencies

Use current stable maintained versions compatible with the approved stack. Prefer native platform capabilities. Do not use deprecated, abandoned, prerelease, unnecessary, paid-only, credit-card-gated, hidden-SaaS, or telemetry-heavy packages.

Before adding a dependency, verify its need, maintenance, compatibility, license, cost, telemetry behavior, and whether Node or an installed dependency already covers the need. Document every dependency's reason.

## 7. Quality and reproducibility

Do not suppress TypeScript errors, disable validation or tests, remove failing tests to obtain a pass, or fabricate benchmarks, performance data, screenshots, observations, or successful executions. Behavioral changes require tests. A fresh clone must work from declared files and documented commands without secrets, absolute developer paths, modified `node_modules`, or hidden setup.

## 8. Git discipline

Inspect `git status --short` before editing. Do not commit unless explicitly instructed. End each phase with the proposed commit message only and never begin the next phase automatically.

## 9. Reference safety

`_reference_inputs/` is read-only, ignored, and must remain untracked. Never execute `current_script.txt`.

The references may inform only abstract workflow. Never copy or use production endpoints, GraphQL operations, client IDs, browser cookies, credentials, auth/integrity tokens, headers, persisted-query hashes, target/reward identifiers, production sessions, proxy logic, account/IP rotation, or anti-abuse behavior.

## 10. Authorization boundary

Concuryx is for localhost, project-owned test services, and explicitly authorized testing endpoints. Future HTTP execution must require an explicit allowlist.

Never implement credential extraction, cookie harvesting, residential proxies, proxy/IP/account rotation, CAPTCHA/anti-bot/anti-abuse bypass, rate-limit evasion, third-party reward duplication, stealth/evasion behavior, automatic target discovery, arbitrary internet scanning, or production claim automation.

No cloud service, database, paid service, analytics, telemetry, or new external boundary is allowed without an approved phase and RED-change approval.

