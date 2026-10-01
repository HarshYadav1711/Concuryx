import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  RequestIdSchema,
  RunIdSchema,
  type ExecutionConfig,
  type PreparedRequest,
} from "../src/shared/contracts.js";
import {
  executeWave,
  type Clock,
  type RequestTransport,
} from "../src/engine/executeWave.js";

const targetAdapter: ExecutionConfig["targetAdapter"] = {
  kind: "http",
  adapterId: "local-demo",
  baseUrl: "http://127.0.0.1:3000",
  allowedHosts: ["127.0.0.1:3000"],
};

function createConfig(requestCount: number, overrides: Partial<ExecutionConfig> = {}): ExecutionConfig {
  return {
    requestCount,
    strategy: "burst",
    workerLimit: requestCount,
    timeoutMs: 100,
    retryPolicy: null,
    targetAdapter,
    artifactProvider: { kind: "none" },
    settlementDelayMs: 0,
    ...overrides,
  };
}

function createRequests(count: number): PreparedRequest[] {
  const runId = RunIdSchema.parse(randomUUID());
  return Array.from({ length: count }, (_, ordinal) => ({
    runId,
    requestId: RequestIdSchema.parse(randomUUID()),
    ordinal,
    url: `http://127.0.0.1:3000/requests/${ordinal}`,
    method: "POST",
    headers: {},
    body: null,
    artifact: null,
  }));
}

const successfulTransport: RequestTransport = async () => ({ status: 200 });

describe("executeWave", () => {
  it.each([1, 5, 25, 150])("returns exactly one result for each of %i prepared requests", async (count) => {
    const requests = createRequests(count);
    const execution = await executeWave(createConfig(count), requests, successfulTransport);

    expect(execution.results).toHaveLength(count);
  });

  it("preserves request identity and input index without duplicate final results", async () => {
    const requests = createRequests(5);
    const execution = await executeWave(createConfig(5), requests, successfulTransport);

    expect(execution.results.map(({ requestId }) => requestId)).toEqual(
      requests.map(({ requestId }) => requestId),
    );
    expect(execution.results.map(({ index }) => index)).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(execution.results.map(({ requestId }) => requestId)).size).toBe(5);
  });

  it("rejects duplicate request IDs instead of regenerating them", async () => {
    const requests = createRequests(2);
    requests[1] = { ...requests[1]!, requestId: requests[0]!.requestId };

    await expect(executeWave(createConfig(2), requests, successfulTransport)).rejects.toThrow(
      "duplicate requestId",
    );
  });

  it("registers every job before releasing the burst barrier exactly once", async () => {
    const events: string[] = [];
    const requests = createRequests(5);
    const transport: RequestTransport = async (request) => {
      events.push(`transport:${request.ordinal}`);
      return { status: 200 };
    };

    const pending = executeWave(createConfig(5), requests, transport, {
      onBarrierRelease(registeredCount) {
        events.push(`release:${registeredCount}`);
      },
    });

    expect(events).toEqual(["release:5"]);
    await pending;
    expect(events.filter((event) => event.startsWith("release:"))).toEqual(["release:5"]);
    expect(events.filter((event) => event.startsWith("transport:"))).toHaveLength(5);
  });

  it("isolates HTTP, network, and timeout outcomes within one wave", async () => {
    const requests = createRequests(3);
    const transport: RequestTransport = async (request, signal) => {
      if (request.ordinal === 0) return { status: 204 };
      if (request.ordinal === 1) throw new Error("offline");
      return await new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    };

    const execution = await executeWave(createConfig(3, { timeoutMs: 5 }), requests, transport);

    expect(execution.results.map(({ kind }) => kind)).toEqual([
      "HTTP_RESPONSE",
      "NETWORK_FAILURE",
      "TIMEOUT",
    ]);
  });

  it("classifies timeout and passes the abort signal to active transport", async () => {
    const requests = createRequests(1);
    let transportAborted = false;
    const transport: RequestTransport = async (_request, signal) =>
      await new Promise((_, reject) => {
        signal.addEventListener(
          "abort",
          () => {
            transportAborted = true;
            reject(signal.reason);
          },
          { once: true },
        );
      });

    const execution = await executeWave(createConfig(1, { timeoutMs: 5 }), requests, transport);

    expect(execution.results[0]?.kind).toBe("TIMEOUT");
    expect(transportAborted).toBe(true);
  });

  it("cancels active transports while preserving final accounting", async () => {
    const requests = createRequests(2);
    const controller = new AbortController();
    const receivedSignals: AbortSignal[] = [];
    let markStarted: (() => void) | undefined;
    const allStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const transport: RequestTransport = async (_request, signal) => {
      receivedSignals.push(signal);
      if (receivedSignals.length === requests.length) markStarted?.();
      return await new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    };

    const pending = executeWave(createConfig(2), requests, transport, { signal: controller.signal });
    await allStarted;
    controller.abort("cancel test");
    const execution = await pending;

    expect(execution.results).toHaveLength(2);
    expect(execution.results.every(({ kind }) => kind === "CANCELLED")).toBe(true);
    expect(receivedSignals.every(({ aborted }) => aborted)).toBe(true);
  });

  it("accounts for pre-cancelled work without invoking transport", async () => {
    const requests = createRequests(2);
    const controller = new AbortController();
    controller.abort("cancel before release");
    let transportCalls = 0;

    const execution = await executeWave(
      createConfig(2),
      requests,
      async () => {
        transportCalls += 1;
        return { status: 200 };
      },
      { signal: controller.signal },
    );

    expect(execution.results.every(({ kind }) => kind === "CANCELLED")).toBe(true);
    expect(execution.results.every(({ timing }) => timing.dispatchedAtMs === null)).toBe(true);
    expect(transportCalls).toBe(0);
  });

  it("derives deterministic request and wave metrics from an injected monotonic clock", async () => {
    class ManualClock implements Clock {
      value = 0;
      now(): number {
        return this.value;
      }
      advance(milliseconds: number): void {
        this.value += milliseconds;
      }
    }

    const clock = new ManualClock();
    const requests = createRequests(3);
    const transport: RequestTransport = async () => {
      clock.advance(10);
      return { status: 200 };
    };

    const execution = await executeWave(createConfig(3), requests, transport, {
      clock,
      onBarrierRelease() {
        clock.advance(5);
      },
    });

    expect(execution.metrics).toMatchObject({
      barrierReleasedAtMs: 5,
      firstDispatchAtMs: 5,
      lastDispatchAtMs: 25,
      dispatchSpreadMs: 20,
      firstCompletionAtMs: 35,
      lastCompletionAtMs: 35,
      waveDurationMs: 30,
      peakInFlight: 3,
    });
    expect(execution.requestMetrics[0]).toMatchObject({
      queueDelayMs: 5,
      releaseToDispatchMs: 0,
      requestDurationMs: 30,
      endToEndMs: 35,
    });
  });

  it("rejects invalid counts, bounded strategy, and retry-enabled configuration", async () => {
    await expect(
      executeWave(createConfig(0), [], successfulTransport),
    ).rejects.toThrow();
    await expect(
      executeWave(createConfig(1, { strategy: "bounded" }), createRequests(1), successfulTransport),
    ).rejects.toThrow("burst");
    await expect(
      executeWave(
        createConfig(1, {
          retryPolicy: { maxRetries: 1, delayMs: 0, retryOn: ["NETWORK_FAILURE"] },
        }),
        createRequests(1),
        successfulTransport,
      ),
    ).rejects.toThrow("retry");
    await expect(
      executeWave(
        createConfig(2, { workerLimit: 1 }),
        createRequests(2),
        successfulTransport,
      ),
    ).rejects.toThrow("workerLimit");
    await expect(
      executeWave(
        createConfig(1, { settlementDelayMs: 1 }),
        createRequests(1),
        successfulTransport,
      ),
    ).rejects.toThrow("settlement");

    const unapprovedTarget = createRequests(1);
    unapprovedTarget[0] = { ...unapprovedTarget[0]!, url: "https://example.com/request" };
    await expect(
      executeWave(createConfig(1), unapprovedTarget, successfulTransport),
    ).rejects.toThrow("allowlist");
  });
});

