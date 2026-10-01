# Observed Run Analysis

## Evidence scope

`_reference_inputs/reference_run.mp4` was inspected as a 23.872-second, 1516×720 recording. It shows a browser inventory view beside developer-console source/output. Frame sampling supported the observations below; no claim relies on audio.

## OBSERVED

- Before execution, six visible resource cards show an available action.
- The console reports successful target/precondition verification.
- The preparation stage reports 25 successful request artifacts out of 25, with HTTP 200 shown for that stage.
- The console announces one concurrent request wave.
- The console reports a 990 ms total wave duration.
- The response table shows 25 responses in the same application-status class.
- After settlement, the console reports resulting state with `isClaimed=true` and `claimCount=1`.
- Near the end, the first visible resource card changes appearance and no longer shows the available action; the other five still do.
- A separate integrity-check error appears later. The recording does not establish that it belongs to the same wave.

## INFERRED

- The 25 application statuses likely correspond to the 25 prepared artifacts because the counts match and the visible source describes one request per artifact. Per-request IDs are not shown.
- The changed first card is consistent with the later state output, but UI state alone does not establish the underlying transition.
- The requests appear to be launched as a client burst, but exact transport/server overlap is not visible.

## UNKNOWN

- Individual queue, preparation, dispatch, response-start, and completion timestamps.
- Exact synchronization, transport overlap, and server receipt ordering.
- Per-request timeout behavior or whether retries occurred.
- Worker-limit behavior; none is displayed.
- Which request caused the resulting state.
- Whether every HTTP response represented application success.
- Any explicit external before/after item-count delta.
- Whether the later integrity error is causally related to the run.

## What the recording does not prove

The recording does not prove 25 business-level successes or 25 final state transitions. It shows 25 application-status responses and one later state count. It also cannot establish exact concurrency, server timing, commit ownership, external delivery, or a duplicate outcome.

