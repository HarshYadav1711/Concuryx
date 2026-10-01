# Product Requirements

## User and problem

The user is an authorized tester who needs to prepare and execute repeatable concurrent request waves of 25, 50, 100, 150, or another validated count up to 500. Ad hoc scripts make synchronization, per-request preparation, retries, timing, outcome classification, and reproducibility difficult.

## Functional requirements

Concuryx must eventually provide:

1. Reusable request templates.
2. Per-request variable injection.
3. Optional pre-request artifact providers.
4. Target adapters with explicit configuration.
5. Request counts from 1 through 500.
6. Burst and bounded dispatch.
7. Request synchronization and configurable worker limits.
8. Configurable request timeout and optional retry policy.
9. Per-request result and timing tracking.
10. Separate dispatch, HTTP, application, timeout, and network-failure outcomes.
11. Result aggregation, settlement delay, and optional resulting-state checks.
12. Supporting observability and reporting.

Phase 0 defines these contracts but implements no network execution.

## Non-functional requirements

- Current active-LTS Node.js available in the environment, TypeScript, npm, Fastify, Zod, Pino, Vitest, and native Node `fetch`.
- Strict validation with unknown fields rejected.
- Reproducible setup and deterministic configuration capture.
- Explicit run/request correlation.
- Future HTTP targets require a non-empty allowlist.
- No cloud, paid services, analytics, telemetry, or hidden production dependencies.
- Later UI must be responsive, keyboard accessible, reduced-motion friendly, and WCAG-conscious.

## Phase 0 success criteria

- Required authority documents and reference analyses describe the request-engine product.
- All requested Zod schemas and inferred TypeScript types exist.
- Request count bounds, allowlisting, strictness, timing order, and result variants have contract tests.
- `npm run typecheck` and `npm test` pass.
- `_reference_inputs/` is ignored and untracked.
- No request firing, fixture server, retries, worker pool, UI, benchmark, or production integration exists.

## Explicit non-goals

- Credential or browser-cookie extraction and session reuse.
- Proxy/IP/account rotation, CAPTCHA/anti-bot/anti-abuse bypass, or rate-limit evasion.
- Target discovery, arbitrary scanning, stealth, or evasion.
- Third-party reward duplication or production claim automation.
- Making observability or a race-condition dashboard the primary product.
- Implementing runtime capabilities during Phase 0.

