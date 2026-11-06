import { describe, expect, it, vi } from "vitest";

import {
  AnalyticsRequestError,
  HttpAnalyticsGateway,
} from "@/src/features/analytics/infrastructure/HttpAnalyticsGateway";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const query = {
  from: "2026-10-01",
  to: "2026-10-31",
  currency: "EUR",
  groupBy: "category" as const,
  kind: "DEPENSE" as const,
};

describe("HttpAnalyticsGateway (#215)", () => {
  it("requests the Web query and parses the aggregate", async () => {
    const request = vi.fn().mockResolvedValue(
      json({
        data: {
          currency: "EUR",
          from: "2026-10-01",
          to: "2026-10-31",
          groupBy: "category",
          buckets: [],
        },
      }),
    );
    await expect(
      new HttpAnalyticsGateway({ request }).operations(query),
    ).resolves.toMatchObject({ groupBy: "category", buckets: [] });
    expect(request).toHaveBeenCalledWith(
      "/analytics/operations?from=2026-10-01&to=2026-10-31&currency=EUR&groupBy=category&kind=DEPENSE",
    );
  });

  it("keeps only the known business error codes", async () => {
    const refused = vi.fn().mockResolvedValue(
      json(
        {
          error: {
            type: "ValidationFailed",
            details: { code: "ANALYTICS_RANGE_TOO_LARGE" },
          },
        },
        422,
      ),
    );
    await expect(
      new HttpAnalyticsGateway({ request: refused }).operations(query),
    ).rejects.toEqual(
      new AnalyticsRequestError(422, "ANALYTICS_RANGE_TOO_LARGE"),
    );

    const unknown = vi
      .fn()
      .mockResolvedValue(json({ error: { details: { code: "OTHER" } } }, 500));
    await expect(
      new HttpAnalyticsGateway({ request: unknown }).operations(query),
    ).rejects.toEqual(new AnalyticsRequestError(500, null));
  });
});
