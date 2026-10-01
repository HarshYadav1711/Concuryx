# Approved Phases

## Phase 0 — Request-engine foundation (completed)

### Objective

Establish request-engine governing documents, reference analysis, reproducible TypeScript configuration, strict shared contracts, and contract tests.

### Expected files

Root configuration and guidance, `docs/`, `references/`, `src/shared/`, `tests/`, and the empty `results/` directory marker.

### Allowed work

- Inspect references without executing them and extract only abstract workflow/evidence.
- Define the project rules, request-engine product, architecture, request model, threat model, design direction, and phase boundary.
- Define the requested TypeScript/Zod contracts.
- Add minimal contract tests.
- Use the already approved stack dependencies.

### Prohibited work

- Request firing or any network execution.
- Fastify fixture/target server.
- Retry execution or worker pool.
- Template expansion or artifact-provider implementation.
- CLI execution command.
- UI or benchmark implementation.
- Production integration, target discovery, proxying, evasion, analytics, or telemetry.

### Acceptance criteria

- Required documents use the approved authority order and request-engine focus.
- Required schemas and inferred types exist and reject unknown fields.
- Execution configuration accepts `requestCount` 1..500 and validates worker limits and target allowlisting.
- Result variants distinguish dispatch, HTTP, application result, timeout, and network failure.
- Contract tests and strict typecheck pass.
- `_reference_inputs/` remains ignored and untracked.
- Only shared contracts exist under `src/`.

### Verification

```sh
npm install
npm run typecheck
npm test
git status --short
git ls-files _reference_inputs
```

## Phase 1 — Core request execution engine (current and approved)

### Objective

Execute a fully prepared collection as one synchronized burst and return exactly one final result for every request.

### Implemented boundary

- Injected one-request transport with no real endpoint requirement.
- All jobs registered before one logical barrier release.
- Burst-only execution with measured dispatch spread.
- Per-request timeout and optional run-level cancellation via native abort primitives.
- HTTP, network-failure, timeout, and cancellation final results.
- Monotonic per-request and wave metrics.
- Duplicate request-ID, unsupported strategy, retry-enabled configuration, non-zero settlement, incompatible worker limit, non-allowlisted URL, invalid count, and count-mismatch rejection.

### Prohibited and not implemented

Bounded workers, retries, native-fetch/concrete target adapters, template expansion, artifact networking, application classification, settlement/state checks, persistence, CLI, UI, benchmarks, proxies/rotation, or production integration.

### Verification

```sh
npm run typecheck
npm test
```

The package defines no lint script, so Phase 1 has no lint command to run.

## Later phases — not approved

Do not begin Phase 2. Preparation, concrete adapters, bounded dispatch, retries, fixture server, CLI, persistence/reporting, and UI require separate Context Locks and human approval.

