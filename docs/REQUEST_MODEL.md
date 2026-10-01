# Request Model

## Pipeline

```text
RequestTemplate
        ↓
per-request variables
        ↓
optional artifact preparation
        ↓
PreparedRequest[]
        ↓
Execution Engine
        ↓
RequestResult[]
        ↓
ExecutionSummary
```

## RequestTemplate

A reusable HTTP-shaped template contains a stable template ID, method, relative path, headers, and optional body text. It contains no target hostname or credentials. Variable placeholder syntax is deliberately unresolved in Phase 0.

## Per-request variables

Each `RequestJob` carries its own named scalar values. Preparation is responsible for injecting them into an approved template. Jobs also carry a zero-based ordinal for reproducible generation.

## Optional artifact preparation

`ArtifactProviderConfig` selects either no provider or a named local provider. A prepared request may carry an opaque project-owned artifact. Production auth/session/integrity artifacts are prohibited.

## PreparedRequest

A prepared request is concrete and immutable from the engine's perspective: run/request IDs, ordinal, absolute target URL, method, headers, optional body, and optional local artifact. Preparation must complete before dispatch.

## Execution Engine

The Phase 1 engine consumes a fully prepared wave and an injected transport. It validates configuration, count, unique request IDs, and each prepared URL's exact host allowlisting; registers all jobs behind one logical barrier; releases the barrier once; and isolates each request outcome. Only `burst` with retry disabled, zero settlement delay, and `workerLimit === requestCount` is accepted. Bounded dispatch, settlement behavior, application classification, and retries remain unimplemented.

The barrier guarantees that all jobs are registered before release and dispatch is attempted immediately afterward. It does not claim same-nanosecond departure, simultaneous arrival, or simultaneous server execution. Actual dispatch spread is reported.

## RequestResult

Results use explicit variants:

- `DISPATCHED`: the request was handed to transport; no response is implied.
- `HTTP_RESPONSE`: HTTP status and response metadata were received; application success is unknown.
- `APPLICATION_RESULT`: an application classifier produced an accepted/rejected decision and code.
- `TIMEOUT`: the configured timeout elapsed.
- `NETWORK_FAILURE`: transport failed without an HTTP response.
- `CANCELLED`: run cancellation prevented or interrupted the request.

HTTP 2xx is transport evidence only and never implies business-level acceptance.

Phase 1 returns exactly one final `HTTP_RESPONSE`, `NETWORK_FAILURE`, `TIMEOUT`, or `CANCELLED` result for each prepared request. The result preserves `runId`, `requestId`, and `index` (`PreparedRequest.ordinal`). `DISPATCHED` remains a domain event variant and `APPLICATION_RESULT` remains reserved for a future approved classifier; neither is emitted as a Phase 1 final result.

## RequestTiming

Phase 1 uses one injected monotonic clock and records `queuedAtMs`, one shared `releasedAtMs`, actual `dispatchedAtMs` where dispatch occurred, and `completedAtMs`. `preparedAtMs` is `null` because the engine receives already-prepared requests. `responseStartedAtMs` is `null` because the minimal transport cannot measure it reliably. Later wall-clock correlation requires an explicit decision.

Per-request metrics are calculated as:

- `queueDelayMs = releasedAtMs - queuedAtMs`
- `releaseToDispatchMs = dispatchedAtMs - releasedAtMs`, or `null` if never dispatched
- `requestDurationMs = completedAtMs - dispatchedAtMs`, or `null` if never dispatched
- `endToEndMs = completedAtMs - queuedAtMs`

Wave metrics are calculated as:

- `barrierReleasedAtMs`: monotonic barrier-release timestamp
- `firstDispatchAtMs` / `lastDispatchAtMs`: minimum/maximum actual dispatch timestamp, or `null` when none dispatched
- `dispatchSpreadMs = lastDispatchAtMs - firstDispatchAtMs`, or `0` when fewer than two dispatch bounds exist
- `firstCompletionAtMs` / `lastCompletionAtMs`: minimum/maximum final completion timestamp
- `waveDurationMs = lastCompletionAtMs - barrierReleasedAtMs`
- `peakInFlight`: maximum number of dispatched requests without a final result at the same time

## Summary

`ExecutionSummary` records configuration, run bounds, preparation/dispatch counts, and counts for each result variant. Counts represent observed stages and may overlap; for example, an application result also follows an HTTP response.

Phase 1 returns in-memory wave metrics alongside raw final results; it does not persist or convert them into `ExecutionSummary` storage.

## Failure and cancellation

Transport throws become `NETWORK_FAILURE`. Per-request timeout aborts only that transport and becomes `TIMEOUT`. Run cancellation reaches active transport signals and makes affected requests `CANCELLED`; work cancelled before dispatch retains a `null` dispatch timestamp. These expected failures do not reject the wave. Invalid input or an internal invariant failure may reject it because exact accounting can no longer be trusted.

## Authorization

`TargetAdapterConfig` requires an absolute HTTP(S) base URL and a non-empty allowlist containing that URL's exact host, including port. Runtime code must revalidate this boundary before any future dispatch.

