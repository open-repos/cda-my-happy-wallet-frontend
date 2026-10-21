import { describe, expect, it } from "vitest";

import { themes } from "@/src/design/tokens";
import { Analytics } from "@/src/features/analytics/domain/analytics";
import {
  analyticsOption,
  analyticsRows,
  paletteRanks,
} from "@/src/features/analytics/presentation/analyticsChart";

const colors = themes.light.color;
const bucket = (key: string, expense: string, color: string | null = null) => ({
  key,
  label: `Catégorie ${key}`,
  color,
  income: "0.00",
  expense,
  net: `-${expense}`,
  count: 1,
});
const analytics = (buckets: Analytics["buckets"], groupBy = "category") => ({
  currency: "EUR",
  from: "2026-10-01",
  to: "2026-10-31",
  groupBy,
  buckets,
});

describe("analytics chart (#215)", () => {
  it("colours categories like the dashboard and sorts them by amount", () => {
    const ranks = paletteRanks([
      { id: 5, color: null },
      { id: 4, color: "#EA7C69" },
      { id: 2, color: null },
    ]);
    expect([...ranks]).toEqual([
      [2, 0],
      [5, 1],
    ]);
    const rows = analyticsRows(
      analytics([
        bucket("5", "12.00"),
        bucket("4", "42.50", "#EA7C69"),
        bucket("2", "0.00"),
      ]),
      "expense",
      "category",
      ranks,
      colors,
    );
    expect(rows.map(({ key, color }) => [key, color])).toEqual([
      ["4", "#EA7C69"],
      ["5", colors.dataCategory2],
    ]);
    expect(rows[0].label.replace(/\s/g, " ")).toBe("Catégorie 4 : 42,50 €");
  });

  it("follows the display order when the categories could not be read", () => {
    const rows = analyticsRows(
      analytics([bucket("7", "30.00"), bucket("5", "12.00")]),
      "expense",
      "category",
      null,
      colors,
    );
    expect(rows.map(({ color }) => color)).toEqual([
      colors.dataCategory1,
      colors.dataCategory2,
    ]);
  });

  it("breaks ties on the numeric identifier and colours net by sign", () => {
    const rows = analyticsRows(
      analytics([bucket("10", "5.00"), bucket("9", "5.00")]),
      "net",
      "category",
      new Map(),
      colors,
    );
    expect(rows.map(({ key, color }) => [key, color])).toEqual([
      ["9", colors.dataExpense],
      ["10", colors.dataExpense],
    ]);
  });

  it("keeps time order and colours the net balance by its sign", () => {
    const rows = analyticsRows(
      analytics(
        [
          { ...bucket("2026-09", "10.00"), net: "15.00" },
          { ...bucket("2026-10", "30.00"), net: "-30.00" },
        ],
        "month",
      ),
      "net",
      "month",
      new Map(),
      colors,
    );
    expect(rows.map(({ cents, color }) => [cents, color])).toEqual([
      [1500, colors.dataIncome],
      [-3000, colors.dataExpense],
    ]);
  });

  it("draws horizontal bars for categories and vertical ones for time", () => {
    const rows = [
      {
        key: "4",
        name: "Alimentation",
        cents: 4250,
        label: "",
        color: "#EA7C69",
      },
    ];
    const byCategory = analyticsOption(rows, "category", colors) as {
      xAxis: { type: string };
      yAxis: { type: string; inverse?: boolean };
      series: { data: { value: number }[] }[];
    };
    expect(byCategory.xAxis.type).toBe("value");
    expect(byCategory.yAxis).toMatchObject({ type: "category", inverse: true });
    expect(byCategory.series[0].data[0].value).toBe(42.5);
    const byMonth = analyticsOption(rows, "month", colors) as {
      xAxis: { type: string };
    };
    expect(byMonth.xAxis.type).toBe("category");
  });
});
