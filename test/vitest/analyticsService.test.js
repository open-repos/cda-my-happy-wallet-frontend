import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  analyticsErrorCode,
  analyticsService,
  parseAnalytics,
} from "../../src/js/services/analyticsService";
import { apiPrivate } from "../../src/utils/axiosHelper";

vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn() },
}));

const totals = (key, overrides = {}) => ({
  key,
  label: null,
  color: null,
  income: "0.00",
  expense: "12.50",
  net: "-12.50",
  count: 1,
  ...overrides,
});

const payload = (overrides = {}) => ({
  currency: "EUR",
  from: "2026-10-01",
  to: "2026-10-31",
  groupBy: "month",
  splitBy: "category",
  kind: "DEPENSE",
  buckets: [
    {
      ...totals("2026-10"),
      series: [totals("4", { label: "Alimentation", color: "#55AA22" })],
    },
  ],
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("analyticsService", () => {
  it("requests the aggregate and validates its contract", async () => {
    apiPrivate.get.mockResolvedValue({ data: { data: payload() } });
    const query = { from: "2026-10-01", to: "2026-10-31", groupBy: "month" };

    const data = await analyticsService.operations(query);

    expect(apiPrivate.get).toHaveBeenCalledWith("/analytics/operations", {
      params: query,
      withCredentials: true,
    });
    expect(data.buckets[0].series[0]).toMatchObject({
      label: "Alimentation",
      expense: "12.50",
    });
  });

  it.each([
    payload({ currency: "eur" }),
    payload({ buckets: [totals("2026-10", { net: -12.5 })] }),
    payload({ buckets: [totals("2026-10", { count: -1 })] }),
    payload({ buckets: [{ ...totals("2026-10"), series: "x" }] }),
    payload({ buckets: Array.from({ length: 501 }, (_, i) => totals(`${i}`)) }),
  ])("rejects an invalid payload %#", (invalid) => {
    expect(() => parseAnalytics(invalid)).toThrow("Invalid analytics response");
  });

  it("exposes only known business error codes", () => {
    const error = (code) => ({
      response: { data: { error: { details: { code } } } },
    });
    expect(analyticsErrorCode(error("ANALYTICS_RANGE_TOO_LARGE"))).toBe(
      "ANALYTICS_RANGE_TOO_LARGE"
    );
    expect(analyticsErrorCode(error("OTHER"))).toBeNull();
    expect(analyticsErrorCode(new Error("offline"))).toBeNull();
  });
});

describe("exceptional income category (#396)", () => {
  it("keeps the reserved system category 0 without colour", () => {
    const data = parseAnalytics({
      currency: "EUR",
      from: "2026-10-01",
      to: "2026-10-31",
      groupBy: "category",
      buckets: [
        {
          ...totals("0"),
          label: "Entrée exceptionnelle",
          income: "70.00",
          expense: "0.00",
          net: "70.00",
        },
      ],
    });
    expect(data.buckets[0]).toMatchObject({
      key: "0",
      label: "Entrée exceptionnelle",
      color: null,
      income: "70.00",
    });
  });
});
