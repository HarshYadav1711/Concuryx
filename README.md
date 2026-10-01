# Concuryx

Configurable concurrent-request execution for authorized testing environments.

Concuryx prepares and executes reproducible high-concurrency request waves against localhost, project-owned services, and explicitly authorized targets. Observability, timing analysis, and reporting support that primary execution responsibility.

Phase 0 contains only governing documentation, reference analysis, project configuration, shared contracts, and contract tests. It has no request execution, server, retries, worker pool, external integration, benchmark, or UI.

## Requirements

- Node.js 24 LTS
- npm 11

## Setup and verification

```sh
npm install
npm run typecheck
npm test
```

Read `docs/RULES.md` before making changes. The active and approved scope is recorded in `docs/PHASES.md`.

