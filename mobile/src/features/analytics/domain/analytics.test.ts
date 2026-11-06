import { describe, expect, it } from "vitest";

import {
  bucketLabel,
  metricCents,
  parseAnalytics,
  rangeProblem,
  resolvePeriod,
  toApiQuery,
} from "@/src/features/analytics/domain/analytics";

const bucket = (key: string, overrides: Record<string, unknown> = {}) => ({
  key,
  label: null,
  color: null,
  income: "0.00",
  expense: "42.50",
  net: "-42.50",
  count: 2,
  ...overrides,
});

describe("analytics domain (#215)", () => {
  it("keeps the public aggregate fields", () => {
    const parsed = parseAnalytics({
      currency: "EUR",
      from: "2026-10-01",
      to: "2026-10-31",
      groupBy: "category",
      kind: "DEPENSE",
      buckets: [bucket("4", { label: "Alimentation", color: "#EA7C69" })],
      ownerId: 9,
    });
    expect(parsed).toEqual({
      currency: "EUR",
      from: "2026-10-01",
      to: "2026-10-31",
      groupBy: "category",
      buckets: [
        {
          key: "4",
          label: "Alimentation",
          color: "#EA7C69",
          income: "0.00",
          expense: "42.50",
          net: "-42.50",
          count: 2,
        },
      ],
    });
  });

  it("rejects malformed aggregates and more than 500 points", () => {
    const base = {
      currency: "EUR",
      from: "2026-10-01",
      to: "2026-10-31",
      groupBy: "day",
    };
    expect(() =>
      parseAnalytics({ ...base, buckets: [bucket("1", { net: 1 })] }),
    ).toThrow();
    expect(() =>
      parseAnalytics({ ...base, buckets: [bucket("1", { color: "red" })] }),
    ).toThrow();
    expect(() =>
      parseAnalytics({
        ...base,
        buckets: Array.from({ length: 501 }, (_, i) => bucket(`${i}`)),
      }),
    ).toThrow();
  });

  it("resolves complete months in the Paris calendar", () => {
    expect(resolvePeriod("month", "2026-10-22")).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(resolvePeriod("3m", "2026-02-10")).toEqual({
      from: "2025-12-01",
      to: "2026-02-28",
    });
    expect(resolvePeriod("12m", "2026-10-22")).toEqual({
      from: "2025-11-01",
      to: "2026-10-31",
    });
    expect(resolvePeriod("year", "2026-10-22")).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });

  it("explains the API limits before calling it", () => {
    expect(rangeProblem("2026-01-01", "2026-12-31", "day")).toBeNull();
    expect(rangeProblem("2025-01-01", "2026-06-30", "day")).toBe(
      "Cette période est trop longue pour ce regroupement : 366 jours au plus.",
    );
    expect(rangeProblem("2026-10-31", "2026-10-01", "month")).toBe(
      "La date de début doit précéder la date de fin.",
    );
    expect(rangeProblem("2016-01-01", "2026-12-31", "month")).toBe(
      "Cette période est trop longue pour ce regroupement : 120 mois au plus.",
    );
  });

  it("builds the Web query, with the kind of the metric", () => {
    const range = { from: "2026-10-01", to: "2026-10-31" };
    expect(toApiQuery("expense", "category", range)).toEqual({
      ...range,
      currency: "EUR",
      groupBy: "category",
      kind: "DEPENSE",
    });
    expect(toApiQuery("net", "month", range)).toEqual({
      ...range,
      currency: "EUR",
      groupBy: "month",
    });
  });

  it("labels buckets and reads the metric in cents", () => {
    expect(bucketLabel({ key: "2026-10", label: null }, "month")).toMatch(
      /^oct\.? 2026$/,
    );
    expect(bucketLabel({ key: "2026-10-05", label: null }, "week")).toMatch(
      /^Sem\. du 5 oct\.? 2026$/,
    );
    expect(bucketLabel({ key: "9", label: null }, "category")).toBe(
      "Catégorie supprimée",
    );
    expect(metricCents(bucket("1"), "net")).toBe(-4250);
    expect(metricCents(bucket("1"), "expense")).toBe(4250);
  });
});
