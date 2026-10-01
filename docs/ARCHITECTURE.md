# Architecture

Phase 1 implements only the core burst execution boundary. It does not approve concrete target adapters, retry behavior, bounded scheduling, runtime topology, or result persistence.

## Shared domain

Owns strict Zod schemas and inferred TypeScript types for run/request IDs, templates, variables, jobs, prepared requests, results, timings, retry policy, execution configuration/summary, target adapters, and artifact providers. It has no I/O.

## Request preparation

Will expand a reusable `RequestTemplate` with per-request variables, optionally invoke an artifact provider, and produce a `PreparedRequest` for each job. Placeholder syntax and artifact injection rules are unresolved.

## Execution engine

`executeWave(config, preparedRequests, transport, options)` validates a complete prepared wave and dispatches it through an injected one-request transport. The engine has no Fastify, CLI, filesystem, concrete-hostname, or application-protocol dependency.

Phase 1 supports `burst` only and rejects `bounded`, retry-enabled configuration, non-zero settlement delay, or a worker limit different from the request count. It also revalidates every prepared URL against the configured exact-host allowlist. Every job is registered behind one promise barrier before it opens. The barrier releases once; each task records its actual dispatch after release. This guarantees logical coordination, not simultaneous network departure or server arrival.

Per-request timeout and optional run cancellation use native `AbortController`/`AbortSignal`. A request failure is isolated into a final result; validation or internal accounting failure may reject the run because continuing would make the output unreliable.

The transport accepts one `PreparedRequest` and `AbortSignal`, then returns only an HTTP status. Unit tests use deterministic fakes. No native-fetch transport is implemented in Phase 1.

## Target adapters

Will translate prepared requests for a configured target. HTTP adapters must enforce the target allowlist before dispatch. Phase 0 defines configuration only and performs no network access.

## Artifact providers

Will optionally create project-owned request-specific artifacts before dispatch. Phase 0 defines `none` and named local-provider configuration only; provider protocols and token semantics remain unresolved.

## Results and aggregation

Each final result preserves `RunId`, `RequestId`, and the prepared request's ordinal as `index`. A validated wave returns exactly one final result per prepared request in input order. Phase 1 produces `HTTP_RESPONSE`, `NETWORK_FAILURE`, `TIMEOUT`, or `CANCELLED`; it performs no application-level classification. HTTP 2xx remains transport evidence only.

## Observability and reporting

Timing, result aggregation, state checks, and later reports support request execution. They are not the primary product. Raw request results remain available to explain summaries.

## Later UI

A future React/Vite interface may configure runs and inspect evidence. No UI component or transport is approved in Phase 0.

## Dependency direction

Preparation, execution, adapters, artifact providers, aggregation, reporting, and UI may depend on the shared domain. The shared domain depends on none of them. Runtime component contracts require approval in their implementation phase.

## Unresolved decisions

- Template placeholder and escaping syntax.
- Adapter interface and supported HTTP methods/body encodings.
- Bounded scheduling semantics.
- Retry eligibility, delay/backoff semantics, and interaction with timeouts.
- Artifact-provider protocol and secret handling.
- Application-result classifier contract.
- Result/state-check storage format and retention.
- Runtime topology, CLI parser, and future UI transport.

