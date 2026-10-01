# Current Implementation Analysis

## Source status

`_reference_inputs/current_script.txt` was inspected as text and never executed. It is production-specific reference material, not an implementation template. Embedded endpoints, operations, identifiers, credentials/session handling, headers, hashes, integrity values, and target details are intentionally omitted.

## Abstract request workflow

1. Verify a target and its preconditions.
2. Prepare multiple request-specific artifacts concurrently.
3. Fire one request per prepared artifact in a concurrent wave.
4. Classify every response independently.
5. Wait for settlement and query resulting state.
6. Report request-level observations and a separate final outcome.

## How concurrency is created

The source maps a fixed collection into independent `fetch` calls and awaits them with `Promise.all`. It does this once for preparation and once for the request wave. Calls are launched close together without an explicit worker limit. This is client-side burst concurrency; it does not prove simultaneous transport or server receipt.

## Request preparation stage

The source attempts to create 25 short-lived request artifacts concurrently, records whether each produced an artifact and its HTTP status, and aborts when too few succeed. Each successful artifact is paired with one later request.

## Concurrent firing stage

All prepared requests are mapped to native `fetch` calls and awaited as one wave. One timer covers the full wave. There are no individual queue/dispatch timestamps, synchronization barrier beyond JavaScript scheduling, bounded strategy, timeout, retry policy, or worker pool.

## Existing output and classification

- Prepared-artifact count and preparation HTTP statuses.
- Total wave duration.
- Per-request network, response-parse, application-error, application-status, or empty-response classification.
- Aggregate response distribution.
- Post-settlement state fields from a later query.
- A manual instruction to compare an external/final result with API observations.

## Limitations

- Fixed request count, target, and settlement delay.
- No reusable template or per-request variable contract.
- No target adapter or artifact-provider abstraction.
- No bounded dispatch, worker limit, timeout, or retry policy.
- No per-request queue, preparation, dispatch, response-start, or completion timing.
- No machine-readable run/request identity and correlation.
- No explicit authorization allowlist.
- No reusable result schema or execution summary.
- HTTP/application observations cannot prove a final state change.

## Concepts Concuryx should preserve

- Precondition checks before work begins.
- A distinct request-preparation stage.
- Independent prepared requests launched as a concurrent wave.
- Per-request classification rather than one aggregate pass/fail.
- Separation of transport response, application result, and resulting state.
- Settlement before an optional state check.
- Abort conditions that prevent invalid runs.
- No automatic rerun that contaminates one-run evidence.

## Production-specific logic excluded

Concuryx will not copy production endpoints, GraphQL operations, client IDs, browser cookies, credentials, auth/integrity tokens, production headers, persisted-query hashes, target/reward identifiers, session behavior, proxying, account/IP rotation, rate-limit evasion, anti-abuse bypass, or real reward operations. All implementations must use project-owned or explicitly authorized abstractions.

