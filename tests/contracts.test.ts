import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  ExecutionConfigSchema,
  ExecutionSummarySchema,
  RequestJobSchema,
  RequestResultSchema,
  RequestTimingSchema,
} from "../src/shared/contracts.js";

const targetAdapter = {
  kind: "http",
  adapterId: "local-demo",
  baseUrl: "http://127.0.0.1:3000",
  allowedHosts: ["127.0.0.1:3000"],
} as const;

const validConfig = {
  requestCount: 25,
  strategy: "burst",
  workerLimit: 25,
  timeoutMs: 5_000,
  retryPolicy: null,
  targetAdapter,
  artifactProvider: { kind: "none" },
  settlementDelayMs: 1_000,
} as const;

const completedTiming = {
  preparedAtMs: null,
  queuedAtMs: 0,
  releasedAtMs: 1,
  dispatchedAtMs: 2,
  responseStartedAtMs: 3,
  completedAtMs: 4,
} as const;

describe("ExecutionConfigSchema", () => {
  it("enforces request-count, worker-limit, strictness, and target allowlisting", () => {
    expect(ExecutionConfigSchema.safeParse({ ...validConfig, requestCount: 1, workerLimit: 1 }).success).toBe(true);
    expect(ExecutionConfigSchema.safeParse({ ...validConfig, requestCount: 500 }).success).toBe(true);
    expect(ExecutionConfigSchema.safeParse({ ...validConfig, requestCount: 0 }).success).toBe(false);
    expect(ExecutionConfigSchema.safeParse({ ...validConfig, requestCount: 501 }).success).toBe(false);
    expect(ExecutionConfigSchema.safeParse({ ...validConfig, workerLimit: 26 }).success).toBe(false);
    expect(ExecutionConfigSchema.safeParse({ ...validConfig, extra: true }).success).toBe(false);
    expect(
      ExecutionConfigSchema.safeParse({
        ...validConfig,
        targetAdapter: { ...targetAdapter, allowedHosts: ["localhost:3000"] },
      }).success,
    ).toBe(false);
  });
});

describe("request contracts", () => {
  it("rejects duplicate variables and out-of-order timing", () => {
    const variable = { name: "sequence", value: 1 };
    expect(
      RequestJobSchema.safeParse({
        runId: randomUUID(),
        requestId: randomUUID(),
        ordinal: 0,
        template: { templateId: "claim", method: "POST", path: "/claim", headers: {}, body: null },
        variables: [variable, variable],
      }).success,
    ).toBe(false);
    expect(RequestTimingSchema.safeParse({ ...completedTiming, releasedAtMs: -1 }).success).toBe(false);
    expect(RequestTimingSchema.safeParse({ ...completedTiming, dispatchedAtMs: 0 }).success).toBe(false);
  });

  it("keeps HTTP responses distinct from application results", () => {
    const base = {
      runId: randomUUID(),
      requestId: randomUUID(),
      index: 0,
      attempt: 1,
      timing: completedTiming,
    };
    const http = RequestResultSchema.parse({ ...base, kind: "HTTP_RESPONSE", httpStatus: 200 });
    const application = RequestResultSchema.parse({
      ...base,
      kind: "APPLICATION_RESULT",
      httpStatus: 200,
      applicationAccepted: false,
      applicationCode: "NOT_ELIGIBLE",
    });

    expect(http.kind).toBe("HTTP_RESPONSE");
    expect(application).toMatchObject({ kind: "APPLICATION_RESULT", applicationAccepted: false });
  });

  it("validates execution summary counts", () => {
    const summary = {
      runId: randomUUID(),
      config: validConfig,
      startedAtMs: 0,
      completedAtMs: 10,
      preparedCount: 25,
      dispatchedCount: 25,
      httpResponseCount: 25,
      applicationResultCount: 25,
      applicationAcceptedCount: 24,
      applicationRejectedCount: 1,
      timeoutCount: 0,
      networkFailureCount: 0,
    };

    expect(ExecutionSummarySchema.safeParse(summary).success).toBe(true);
    expect(
      ExecutionSummarySchema.safeParse({ ...summary, applicationRejectedCount: 0 }).success,
    ).toBe(false);
  });
});

