import { performance } from "node:perf_hooks";
import { z } from "zod";
import {
  ExecutionConfigSchema,
  PreparedRequestSchema,
  RequestResultSchema,
  type ExecutionConfig,
  type PreparedRequest,
  type RequestResult,
} from "../shared/contracts.js";

export interface Clock {
  now(): number;
}

export interface TransportResponse {
  status: number;
}

export type RequestTransport = (
  request: PreparedRequest,
  signal: AbortSignal,
) => Promise<TransportResponse>;

export interface ExecuteWaveOptions {
  signal?: AbortSignal;
  clock?: Clock;
  onBarrierRelease?: (registeredCount: number) => void;
}

export interface RequestExecutionMetrics {
  requestId: RequestResult["requestId"];
  index: number;
  queueDelayMs: number;
  releaseToDispatchMs: number | null;
  requestDurationMs: number | null;
  endToEndMs: number;
}

export interface WaveExecutionMetrics {
  barrierReleasedAtMs: number;
  firstDispatchAtMs: number | null;
  lastDispatchAtMs: number | null;
  dispatchSpreadMs: number;
  firstCompletionAtMs: number;
  lastCompletionAtMs: number;
  waveDurationMs: number;
  peakInFlight: number;
}

export interface WaveExecution {
  results: RequestResult[];
  requestMetrics: RequestExecutionMetrics[];
  metrics: WaveExecutionMetrics;
}

const systemClock: Clock = { now: () => performance.now() };
const timeoutReason = Symbol("timeout");
const cancellationReason = Symbol("cancelled");

interface InFlightState {
  current: number;
  peak: number;
}

function reasonMessage(reason: unknown): string | null {
  if (typeof reason === "string" && reason.length > 0) return reason;
  if (reason instanceof Error && reason.message.length > 0) return reason.message;
  return null;
}

async function executeRequest(
  request: PreparedRequest,
  queuedAtMs: number,
  release: Promise<number>,
  timeoutMs: number,
  transport: RequestTransport,
  clock: Clock,
  inFlight: InFlightState,
  runSignal?: AbortSignal,
): Promise<RequestResult> {
  const releasedAtMs = await release;
  const base = {
    runId: request.runId,
    requestId: request.requestId,
    index: request.ordinal,
    attempt: 1,
  } as const;

  if (runSignal?.aborted) {
    return RequestResultSchema.parse({
      ...base,
      kind: "CANCELLED",
      reason: reasonMessage(runSignal.reason),
      timing: {
        preparedAtMs: null,
        queuedAtMs,
        releasedAtMs,
        dispatchedAtMs: null,
        responseStartedAtMs: null,
        completedAtMs: clock.now(),
      },
    });
  }

  const controller = new AbortController();
  let abortKind: "timeout" | "cancelled" | null = null;
  const cancelRequest = () => {
    if (controller.signal.aborted) return;
    abortKind = "cancelled";
    controller.abort(runSignal?.reason ?? cancellationReason);
  };
  runSignal?.addEventListener("abort", cancelRequest, { once: true });

  const timeout = setTimeout(() => {
    if (controller.signal.aborted) return;
    abortKind = "timeout";
    controller.abort(timeoutReason);
  }, timeoutMs);

  const aborted = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true });
  });

  const dispatchedAtMs = clock.now();
  inFlight.current += 1;
  inFlight.peak = Math.max(inFlight.peak, inFlight.current);

  try {
    const response = await Promise.race([transport(request, controller.signal), aborted]);
    if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599) {
      throw new Error("transport returned an invalid HTTP status");
    }
    return RequestResultSchema.parse({
      ...base,
      kind: "HTTP_RESPONSE",
      httpStatus: response.status,
      timing: {
        preparedAtMs: null,
        queuedAtMs,
        releasedAtMs,
        dispatchedAtMs,
        responseStartedAtMs: null,
        completedAtMs: clock.now(),
      },
    });
  } catch (error) {
    const completedAtMs = clock.now();
    const timing = {
      preparedAtMs: null,
      queuedAtMs,
      releasedAtMs,
      dispatchedAtMs,
      responseStartedAtMs: null,
      completedAtMs,
    } as const;

    if (abortKind === "timeout") {
      return RequestResultSchema.parse({ ...base, kind: "TIMEOUT", timeoutMs, timing });
    }
    if (abortKind === "cancelled") {
      return RequestResultSchema.parse({
        ...base,
        kind: "CANCELLED",
        reason: reasonMessage(runSignal?.reason),
        timing,
      });
    }
    return RequestResultSchema.parse({
      ...base,
      kind: "NETWORK_FAILURE",
      errorMessage: reasonMessage(error) ?? "unknown transport failure",
      timing,
    });
  } finally {
    clearTimeout(timeout);
    runSignal?.removeEventListener("abort", cancelRequest);
    inFlight.current -= 1;
  }
}

export async function executeWave(
  config: ExecutionConfig,
  preparedRequests: readonly PreparedRequest[],
  transport: RequestTransport,
  options: ExecuteWaveOptions = {},
): Promise<WaveExecution> {
  const validConfig = ExecutionConfigSchema.parse(config);
  const requests = z.array(PreparedRequestSchema).parse(preparedRequests);

  if (validConfig.strategy !== "burst") {
    throw new Error("Phase 1 supports only burst execution");
  }
  if (validConfig.retryPolicy !== null) {
    throw new Error("Phase 1 does not support retry-enabled configuration");
  }
  if (validConfig.workerLimit !== validConfig.requestCount) {
    throw new Error("Phase 1 burst execution requires workerLimit to equal requestCount");
  }
  if (validConfig.settlementDelayMs !== 0) {
    throw new Error("Phase 1 does not implement settlement delay");
  }
  if (requests.length !== validConfig.requestCount) {
    throw new Error("prepared request count must equal config.requestCount");
  }

  for (const request of requests) {
    const target = new URL(request.url);
    if (
      (target.protocol !== "http:" && target.protocol !== "https:") ||
      !validConfig.targetAdapter.allowedHosts.includes(target.host)
    ) {
      throw new Error("prepared request target is not in the configured allowlist");
    }
  }

  const requestIds = new Set(requests.map(({ requestId }) => requestId));
  if (requestIds.size !== requests.length) {
    throw new Error("duplicate requestId in prepared request wave");
  }

  const clock = options.clock ?? systemClock;
  const queued = requests.map((request) => ({ request, queuedAtMs: clock.now() }));
  let releaseBarrier!: (releasedAtMs: number) => void;
  const barrier = new Promise<number>((resolve) => {
    releaseBarrier = resolve;
  });
  const inFlight: InFlightState = { current: 0, peak: 0 };
  let registeredCount = 0;
  const pending = queued.map(({ request, queuedAtMs }) => {
    registeredCount += 1;
    return executeRequest(
      request,
      queuedAtMs,
      barrier,
      validConfig.timeoutMs,
      transport,
      clock,
      inFlight,
      options.signal,
    );
  });

  options.onBarrierRelease?.(registeredCount);
  const barrierReleasedAtMs = clock.now();
  releaseBarrier(barrierReleasedAtMs);
  const results = await Promise.all(pending);

  const requestMetrics = results.map<RequestExecutionMetrics>((result) => {
    const { timing } = result;
    if (timing.completedAtMs === null) {
      throw new Error("internal invariant: final result lacks completion timing");
    }
    return {
      requestId: result.requestId,
      index: result.index,
      queueDelayMs: timing.releasedAtMs - timing.queuedAtMs,
      releaseToDispatchMs:
        timing.dispatchedAtMs === null ? null : timing.dispatchedAtMs - timing.releasedAtMs,
      requestDurationMs:
        timing.dispatchedAtMs === null ? null : timing.completedAtMs - timing.dispatchedAtMs,
      endToEndMs: timing.completedAtMs - timing.queuedAtMs,
    };
  });

  const dispatches = results
    .map(({ timing }) => timing.dispatchedAtMs)
    .filter((timestamp): timestamp is number => timestamp !== null);
  const completions = results.map(({ timing }) => {
    if (timing.completedAtMs === null) {
      throw new Error("internal invariant: final result lacks completion timing");
    }
    return timing.completedAtMs;
  });
  const firstDispatchAtMs = dispatches.length === 0 ? null : Math.min(...dispatches);
  const lastDispatchAtMs = dispatches.length === 0 ? null : Math.max(...dispatches);
  const firstCompletionAtMs = Math.min(...completions);
  const lastCompletionAtMs = Math.max(...completions);

  return {
    results,
    requestMetrics,
    metrics: {
      barrierReleasedAtMs,
      firstDispatchAtMs,
      lastDispatchAtMs,
      dispatchSpreadMs:
        firstDispatchAtMs === null || lastDispatchAtMs === null
          ? 0
          : lastDispatchAtMs - firstDispatchAtMs,
      firstCompletionAtMs,
      lastCompletionAtMs,
      waveDurationMs: lastCompletionAtMs - barrierReleasedAtMs,
      peakInFlight: inFlight.peak,
    },
  };
}

