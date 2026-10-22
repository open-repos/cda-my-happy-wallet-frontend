import {
  Analytics,
  AnalyticsQuery,
  parseAnalytics,
} from "@/src/features/analytics/domain/analytics";

export interface AnalyticsHttpClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export interface AnalyticsGateway {
  operations(query: AnalyticsQuery): Promise<Analytics>;
}

export type AnalyticsErrorCode =
  | "ANALYTICS_RANGE_TOO_LARGE"
  | "ANALYTICS_QUERY_INVALID";

const KNOWN_CODES = new Set<string>([
  "ANALYTICS_RANGE_TOO_LARGE",
  "ANALYTICS_QUERY_INVALID",
]);

/** Échec HTTP avec le code métier stable de `error.details.code`, ou `null`. */
export class AnalyticsRequestError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: AnalyticsErrorCode | null,
  ) {
    super("Analytics request failed");
    this.name = "AnalyticsRequestError";
  }
}

const errorCode = async (
  response: Response,
): Promise<AnalyticsErrorCode | null> => {
  try {
    const body: unknown = await response.json();
    const code =
      typeof body === "object" && body !== null && "error" in body
        ? (body.error as { details?: { code?: unknown } } | null)?.details?.code
        : null;
    return typeof code === "string" && KNOWN_CODES.has(code)
      ? (code as AnalyticsErrorCode)
      : null;
  } catch {
    return null;
  }
};

/** Agrégat via `/v1/analytics/operations`, même contrat que le Web (#215). */
export class HttpAnalyticsGateway implements AnalyticsGateway {
  public constructor(private readonly httpClient: AnalyticsHttpClient) {}

  public async operations(query: AnalyticsQuery): Promise<Analytics> {
    const params = new URLSearchParams({
      from: query.from,
      to: query.to,
      currency: query.currency,
      groupBy: query.groupBy,
    });
    if (query.kind) params.set("kind", query.kind);
    const response = await this.httpClient.request(
      `/analytics/operations?${params.toString()}`,
    );
    if (!response.ok) {
      throw new AnalyticsRequestError(
        response.status,
        await errorCode(response),
      );
    }
    const payload: unknown = await response.json();
    return parseAnalytics(
      typeof payload === "object" && payload !== null && "data" in payload
        ? payload.data
        : null,
    );
  }
}
