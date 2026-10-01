# Project Context

## What Concuryx is

Concuryx is a configurable concurrent-request execution engine for authorized testing environments. Its main responsibility is to prepare and dispatch accurate, reproducible high-concurrency request waves. Observability, timing analysis, aggregation, and reporting support that execution responsibility.

## What Concuryx is not

It is not primarily a race-condition research dashboard, production automation, an internet scanner, a credential/session utility, a proxy system, an evasion tool, or a third-party reward tool.

## Why it exists

Authorized testers need one controlled tool for turning reusable request templates and per-request variables into prepared requests, dispatching them with burst or bounded strategies, and tracking each outcome without confusing HTTP success with application success.

## Authorization boundary

Initial implementation is local and project-owned. Future HTTP targets may include explicitly authorized endpoints only and must require a configured allowlist. No target discovery, implicit internet access, production credential extraction, or hidden session use is permitted.

## Reference relationship

The ignored reference files demonstrate an abstract workflow: verify preconditions, prepare request-specific artifacts, dispatch a concurrent wave, classify results, wait/check resulting state, and report. They are not implementation templates. Their production-specific endpoints, operations, identifiers, sessions, tokens, integrity behavior, and target logic are excluded.

## Result semantics

Dispatch, HTTP response, application result, timeout, and network failure are distinct observations. HTTP 2xx never proves business-level success. A later state check is separate evidence, not a reinterpretation of the response.

## Immutable principles

- Request-wave execution is the primary product responsibility.
- Inputs and outputs are strictly typed and validated.
- Every request remains correlatable by run and request IDs.
- Burst and bounded strategies are explicit and reproducible.
- Targets require explicit configuration and future HTTP execution requires an allowlist.
- Evidence is reported without fabricated results or timing claims.
- Human approval owns architecture, security boundaries, and phase progression.

