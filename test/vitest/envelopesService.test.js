import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiPrivate } from "../../src/utils/axiosHelper";
import {
  envelopesService,
  parseEnvelopeMetrics,
  parseEnvelopeOverview,
  parseEnvelopeStatistics,
  parseEnvelopePage,
  envelopeErrorMessage,
} from "../../src/js/services/envelopesService";
import {
  envelopeOverview,
  envelopeOccurrence,
  envelopeIntegration,
  envelopeMeta,
  envelopeStatistics,
} from "../fixtures/envelopes.mjs";
vi.mock("../../src/utils/axiosHelper", () => ({
  apiPrivate: { get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
beforeEach(() => vi.resetAllMocks());
describe("envelopes: published backend contract", () => {
  it("preserves 300/223 and 300/333 metrics, including uncapped percentage", () => {
    expect(parseEnvelopeOverview(envelopeOverview()).totals).toMatchObject({
      actual: "223.00",
      remaining: "77.00",
      progress: 74.33,
    });
    expect(
      parseEnvelopeOverview(envelopeOverview({ actual: "333.00" })).totals
    ).toMatchObject({ overrun: "33.00", projected: "333.00", progress: 111 });
    expect(parseEnvelopeStatistics(envelopeStatistics)).toMatchObject({
      meanActual: "325.00",
      meanVariance: "25.00",
      sampleMonths: 6,
      overrunRate: 66.67,
    });
  });
  it("accepts a zero target and rejects malformed amounts, status and pagination", () => {
    const m = { ...envelopeOverview().totals, planned: "0.00", progress: null };
    expect(parseEnvelopeMetrics(m).progress).toBeNull();
    for (const change of [
      { planned: 300 },
      { actual: "1e9" },
      { status: "PAID" },
      { progress: Infinity },
    ])
      expect(() => parseEnvelopeMetrics({ ...m, ...change })).toThrow();
    expect(() =>
      parseEnvelopePage(
        {
          data: [],
          meta: { ...envelopeMeta, hasNext: true, nextCursor: null },
        },
        (v) => v
      )
    ).toThrow();
    const invalid = envelopeOverview();
    invalid.months[0].paymentsPreview[0].amount = 85;
    expect(() => parseEnvelopeOverview(invalid)).toThrow();
  });
  it("uses currency/month and cursor, refuses tracking-only integration, and detects cursor cycles", async () => {
    apiPrivate.get.mockResolvedValue({
      data: { data: [envelopeOverview()], meta: envelopeMeta },
    });
    await envelopesService.overview(
      { month: "2026-10", currency: "EUR" },
      "opaque"
    );
    expect(apiPrivate.get).toHaveBeenCalledWith("/envelope-overview", {
      params: {
        month: "2026-10",
        currency: "EUR",
        limit: 20,
        cursor: "opaque",
      },
      withCredentials: true,
    });
    apiPrivate.get.mockResolvedValue({
      data: {
        data: [envelopeOccurrence()],
        meta: envelopeMeta,
        integration: { mode: "TRACKING_ONLY" },
      },
    });
    await expect(
      envelopesService.allOccurrences({ month: "2026-10", currency: "EUR" })
    ).rejects.toThrow();
    apiPrivate.get.mockResolvedValue({
      data: {
        data: [envelopeOccurrence()],
        meta: { limit: 100, hasNext: true, nextCursor: "same" },
        integration: envelopeIntegration,
      },
    });
    await expect(
      envelopesService.allOccurrences({ month: "2026-10", currency: "EUR" })
    ).rejects.toThrow();
  });
  it("sends compare-and-set on association, reassignment and unlink without deleting an operation", async () => {
    for (const [next, expected] of [
      [41, null],
      [42, 41],
      [null, 42],
    ])
      await envelopesService.setLink(1, next, expected);
    expect(apiPrivate.put.mock.calls.map((c) => c[1])).toEqual([
      { occurrenceId: 41, expectedOccurrenceId: null },
      { occurrenceId: 42, expectedOccurrenceId: 41 },
      { occurrenceId: null, expectedOccurrenceId: 42 },
    ]);
    expect(apiPrivate.delete).not.toHaveBeenCalled();
    expect(
      envelopeErrorMessage({
        response: {
          data: { error: { details: { code: "ASSOCIATION_CONFLICT" } } },
        },
      })
    ).toMatch(/changé entre-temps/);
  });
});
