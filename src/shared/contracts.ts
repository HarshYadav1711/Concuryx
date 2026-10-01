import { z } from "zod";

const nonNegativeInteger = z.number().int().nonnegative();
const positiveInteger = z.number().int().positive();
const timestampMilliseconds = z.number().finite().nonnegative();
const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);
const HeadersSchema = z.record(z.string().min(1), z.string());

export const RunIdSchema = z.uuid().brand<"RunId">();
export type RunId = z.infer<typeof RunIdSchema>;

export const RequestIdSchema = z.uuid().brand<"RequestId">();
export type RequestId = z.infer<typeof RequestIdSchema>;

export const ExecutionStrategySchema = z.enum(["burst", "bounded"]);
export type ExecutionStrategy = z.infer<typeof ExecutionStrategySchema>;

export const RequestVariableSchema = z.strictObject({
  name: z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  value: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
});
export type RequestVariable = z.infer<typeof RequestVariableSchema>;

export const RequestTemplateSchema = z.strictObject({
  templateId: z.string().min(1),
  method: HttpMethodSchema,
  path: z
    .string()
    .startsWith("/")
    .refine((path) => !path.startsWith("//"), "path must be relative to the target adapter"),
  headers: HeadersSchema,
  body: z.string().nullable(),
});
export type RequestTemplate = z.infer<typeof RequestTemplateSchema>;

export const RequestJobSchema = z
  .strictObject({
    runId: RunIdSchema,
    requestId: RequestIdSchema,
    ordinal: nonNegativeInteger,
    template: RequestTemplateSchema,
    variables: z.array(RequestVariableSchema),
  })
  .refine((job) => new Set(job.variables.map((variable) => variable.name)).size === job.variables.length, {
    message: "variable names must be unique",
    path: ["variables"],
  });
export type RequestJob = z.infer<typeof RequestJobSchema>;

export const PreparedRequestSchema = z.strictObject({
  runId: RunIdSchema,
  requestId: RequestIdSchema,
  ordinal: nonNegativeInteger,
  url: z.url(),
  method: HttpMethodSchema,
  headers: HeadersSchema,
  body: z.string().nullable(),
  artifact: z.string().min(1).nullable(),
});
export type PreparedRequest = z.infer<typeof PreparedRequestSchema>;

export const RequestTimingSchema = z
  .strictObject({
    preparedAtMs: timestampMilliseconds.nullable(),
    queuedAtMs: timestampMilliseconds,
    releasedAtMs: timestampMilliseconds,
    dispatchedAtMs: timestampMilliseconds.nullable(),
    responseStartedAtMs: timestampMilliseconds.nullable(),
    completedAtMs: timestampMilliseconds.nullable(),
  })
  .superRefine((timing, context) => {
    const orderedEvents = [
      ["queuedAtMs", timing.queuedAtMs, timing.preparedAtMs],
      ["releasedAtMs", timing.releasedAtMs, timing.queuedAtMs],
      ["dispatchedAtMs", timing.dispatchedAtMs, timing.releasedAtMs],
      ["responseStartedAtMs", timing.responseStartedAtMs, timing.dispatchedAtMs],
      [
        "completedAtMs",
        timing.completedAtMs,
        timing.responseStartedAtMs ?? timing.dispatchedAtMs ?? timing.releasedAtMs,
      ],
    ] as const;

    for (const [path, value, floor] of orderedEvents) {
      if (value !== null && floor !== null && value < floor) {
        context.addIssue({ code: "custom", message: `${path} is out of order`, path: [path] });
      }
    }
  });
export type RequestTiming = z.infer<typeof RequestTimingSchema>;

const ResultBaseShape = {
  runId: RunIdSchema,
  requestId: RequestIdSchema,
  index: nonNegativeInteger,
  attempt: positiveInteger,
  timing: RequestTimingSchema,
};

export const RequestResultSchema = z
  .discriminatedUnion("kind", [
    z.strictObject({ ...ResultBaseShape, kind: z.literal("DISPATCHED") }),
    z.strictObject({
      ...ResultBaseShape,
      kind: z.literal("HTTP_RESPONSE"),
      httpStatus: z.number().int().min(100).max(599),
    }),
    z.strictObject({
      ...ResultBaseShape,
      kind: z.literal("APPLICATION_RESULT"),
      httpStatus: z.number().int().min(100).max(599),
      applicationAccepted: z.boolean(),
      applicationCode: z.string().min(1),
    }),
    z.strictObject({
      ...ResultBaseShape,
      kind: z.literal("TIMEOUT"),
      timeoutMs: positiveInteger,
    }),
    z.strictObject({
      ...ResultBaseShape,
      kind: z.literal("NETWORK_FAILURE"),
      errorMessage: z.string().min(1),
    }),
    z.strictObject({
      ...ResultBaseShape,
      kind: z.literal("CANCELLED"),
      reason: z.string().min(1).nullable(),
    }),
  ])
  .superRefine((result, context) => {
    if (result.kind !== "CANCELLED" && result.timing.dispatchedAtMs === null) {
      context.addIssue({ code: "custom", message: "result requires dispatch timing", path: ["timing", "dispatchedAtMs"] });
    }
    if (result.kind !== "DISPATCHED" && result.timing.completedAtMs === null) {
      context.addIssue({ code: "custom", message: "final result requires completion timing", path: ["timing", "completedAtMs"] });
    }
  });
export type RequestResult = z.infer<typeof RequestResultSchema>;

export const RetryPolicySchema = z.strictObject({
  maxRetries: positiveInteger,
  delayMs: nonNegativeInteger,
  retryOn: z.array(z.enum(["TIMEOUT", "NETWORK_FAILURE", "HTTP_5XX"])).min(1),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const TargetAdapterConfigSchema = z
  .strictObject({
    kind: z.literal("http"),
    adapterId: z.string().min(1),
    baseUrl: z.url(),
    allowedHosts: z.array(z.string().min(1)).min(1),
  })
  .superRefine((config, context) => {
    const target = new URL(config.baseUrl);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      context.addIssue({ code: "custom", message: "baseUrl must use HTTP or HTTPS", path: ["baseUrl"] });
    }
    if (!config.allowedHosts.includes(target.host)) {
      context.addIssue({
        code: "custom",
        message: "baseUrl host must be explicitly allowlisted",
        path: ["allowedHosts"],
      });
    }
  });
export type TargetAdapterConfig = z.infer<typeof TargetAdapterConfigSchema>;

export const ArtifactProviderConfigSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("none") }),
  z.strictObject({ kind: z.literal("local"), providerId: z.string().min(1) }),
]);
export type ArtifactProviderConfig = z.infer<typeof ArtifactProviderConfigSchema>;

export const ExecutionConfigSchema = z
  .strictObject({
    requestCount: z.number().int().min(1).max(500),
    strategy: ExecutionStrategySchema,
    workerLimit: z.number().int().min(1).max(500),
    timeoutMs: positiveInteger,
    retryPolicy: RetryPolicySchema.nullable(),
    targetAdapter: TargetAdapterConfigSchema,
    artifactProvider: ArtifactProviderConfigSchema,
    settlementDelayMs: nonNegativeInteger,
  })
  .refine((config) => config.workerLimit <= config.requestCount, {
    message: "workerLimit must not exceed requestCount",
    path: ["workerLimit"],
  });
export type ExecutionConfig = z.infer<typeof ExecutionConfigSchema>;

export const ExecutionSummarySchema = z
  .strictObject({
    runId: RunIdSchema,
    config: ExecutionConfigSchema,
    startedAtMs: timestampMilliseconds,
    completedAtMs: timestampMilliseconds,
    preparedCount: nonNegativeInteger,
    dispatchedCount: nonNegativeInteger,
    httpResponseCount: nonNegativeInteger,
    applicationResultCount: nonNegativeInteger,
    applicationAcceptedCount: nonNegativeInteger,
    applicationRejectedCount: nonNegativeInteger,
    timeoutCount: nonNegativeInteger,
    networkFailureCount: nonNegativeInteger,
  })
  .superRefine((summary, context) => {
    if (summary.completedAtMs < summary.startedAtMs) {
      context.addIssue({ code: "custom", message: "completion precedes start", path: ["completedAtMs"] });
    }

    const requestCounts = [
      "preparedCount",
      "dispatchedCount",
      "httpResponseCount",
      "applicationResultCount",
      "applicationAcceptedCount",
      "applicationRejectedCount",
      "timeoutCount",
      "networkFailureCount",
    ] as const;
    for (const path of requestCounts) {
      if (summary[path] > summary.config.requestCount) {
        context.addIssue({ code: "custom", message: `${path} exceeds requestCount`, path: [path] });
      }
    }

    if (summary.applicationAcceptedCount + summary.applicationRejectedCount !== summary.applicationResultCount) {
      context.addIssue({
        code: "custom",
        message: "application outcome counts must equal applicationResultCount",
        path: ["applicationResultCount"],
      });
    }
  });
export type ExecutionSummary = z.infer<typeof ExecutionSummarySchema>;

