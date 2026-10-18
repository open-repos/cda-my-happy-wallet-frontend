import { describe, expect, it } from "vitest";
import {
  allowedChartTypes,
  bucketLabel,
  parseExplorerParams,
  rangeProblem,
  resolvePeriod,
  toApiQuery,
  toSearchParams,
} from "../../src/js/utils/analyticsExplorer";

const TODAY = "2026-10-11";
const parse = (query) => parseExplorerParams(new URLSearchParams(query), TODAY);

describe("parseExplorerParams", () => {
  it("defaults to this month's expenses by category in a pie", () => {
    expect(parse("")).toEqual({
      metric: "expense",
      groupBy: "category",
      splitBy: "none",
      chart: "pie",
      period: "month",
      from: "2026-10-01",
      to: "2026-10-31",
    });
  });

  it("keeps valid choices and round-trips through the URL", () => {
    const state = parse(
      "metric=net&groupBy=month&splitBy=category&chart=area&period=12m"
    );
    expect(state).toMatchObject({
      metric: "net",
      groupBy: "month",
      splitBy: "category",
      chart: "area",
      from: "2025-11-01",
      to: "2026-10-31",
    });
    expect(parse(toSearchParams(state).toString())).toEqual(state);
  });

  it("falls back on invalid values and incompatible combinations", () => {
    expect(
      parse("metric=all&groupBy=hour&splitBy=kind&chart=pie&period=bad")
    ).toMatchObject({
      metric: "expense",
      groupBy: "category",
      splitBy: "none",
      chart: "pie",
      period: "month",
    });
    // Ventilation interdite hors temps; secteurs interdits sur le temps.
    expect(parse("groupBy=kind&splitBy=category")).toMatchObject({
      splitBy: "none",
    });
    expect(parse("groupBy=day&chart=pie")).toMatchObject({ chart: "bar" });
    expect(
      parse("metric=net&groupBy=week&splitBy=kind&chart=bar")
    ).toMatchObject({
      chart: "stacked",
    });
  });

  it("keeps kind grouping and split for the net balance only", () => {
    expect(parse("groupBy=kind")).toMatchObject({ groupBy: "category" });
    expect(parse("metric=net&groupBy=kind")).toMatchObject({
      groupBy: "kind",
      chart: "bar",
    });
    expect(parse("metric=income&groupBy=month&splitBy=kind")).toMatchObject({
      splitBy: "none",
      chart: "bar",
    });
  });

  it("accepts a custom period and rejects an impossible date", () => {
    expect(
      parse("period=custom&from=2028-02-01&to=2028-02-29&groupBy=day")
    ).toMatchObject({ from: "2028-02-01", to: "2028-02-29" });
    expect(parse("period=custom&from=2027-02-29&to=2027-03-01")).toMatchObject({
      period: "month",
      from: "2026-10-01",
    });
  });
});

describe("resolvePeriod", () => {
  it("computes the presets on civil dates", () => {
    expect(resolvePeriod("month", "2028-02-10")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(resolvePeriod("3m", "2026-01-15")).toEqual({
      from: "2025-11-01",
      to: "2026-01-31",
    });
    expect(resolvePeriod("year", TODAY)).toEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
  });
});

describe("allowedChartTypes", () => {
  it("offers only the relevant chart types", () => {
    expect(allowedChartTypes("month", "none", "expense")).toEqual([
      "bar",
      "line",
      "area",
    ]);
    expect(allowedChartTypes("month", "kind", "net")).toEqual([
      "stacked",
      "line",
      "area",
    ]);
    expect(allowedChartTypes("category", "none", "income")).toEqual([
      "pie",
      "bar",
    ]);
    expect(allowedChartTypes("kind", "none", "net")).toEqual(["bar"]);
  });
});

describe("rangeProblem", () => {
  it("mirrors the backend bounds before calling the API", () => {
    expect(rangeProblem("2028-01-01", "2028-12-31", "day", "none")).toBe(null);
    expect(rangeProblem("2027-01-01", "2028-01-02", "day", "none")).toMatch(
      /366 jours/
    );
    expect(rangeProblem("2016-12-01", "2026-12-31", "month", "none")).toMatch(
      /120 mois/
    );
    expect(rangeProblem("2026-10-02", "2026-10-01", "day", "none")).toMatch(
      /début/
    );
    // 366 jours × 2 sens = 732 points.
    expect(rangeProblem("2028-01-01", "2028-12-31", "day", "kind")).toMatch(
      /500 points/
    );
  });
});

describe("toApiQuery", () => {
  it("maps the metric to the kind filter", () => {
    const state = parse(
      "metric=income&groupBy=week&splitBy=category&chart=line"
    );
    expect(toApiQuery(state)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      currency: "EUR",
      groupBy: "week",
      splitBy: "category",
      kind: "ENTREE",
    });
    expect(toApiQuery(parse("metric=net&groupBy=year"))).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      currency: "EUR",
      groupBy: "year",
    });
  });
});

describe("bucketLabel", () => {
  it("formats keys in French", () => {
    expect(bucketLabel({ key: "2026-10-11", label: null }, "day")).toBe(
      "11 oct. 2026"
    );
    expect(bucketLabel({ key: "2026-10-05", label: null }, "week")).toBe(
      "Sem. du 5 oct. 2026"
    );
    expect(bucketLabel({ key: "2026-10", label: null }, "month")).toBe(
      "oct. 2026"
    );
    expect(bucketLabel({ key: "2026", label: null }, "year")).toBe("2026");
    expect(bucketLabel({ key: "DEPENSE", label: null }, "kind")).toBe(
      "Dépenses"
    );
    expect(bucketLabel({ key: "4", label: "Alimentation" }, "category")).toBe(
      "Alimentation"
    );
    expect(bucketLabel({ key: "9", label: null }, "category")).toBe(
      "Catégorie supprimée"
    );
  });
});
