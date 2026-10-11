import { describe, expect, it } from "vitest";
import {
  PIE_PALETTE,
  ZOOM_THRESHOLD,
  analyticsChartOption,
  pieSlices,
} from "../../src/js/components/charts/analyticsChartOptions";

const tokens = {
  text: "#111111",
  muted: "#555555",
  grid: "#dddddd",
  expense: "#cc3300",
  income: "#228844",
  forecast: "#3355aa",
  surface: "#ffffff",
  font: "Inter",
  reducedMotion: false,
};

const totals = (key, expense, income = "0.00", extra = {}) => ({
  key,
  label: null,
  color: null,
  income,
  expense,
  net: (Number(income) - Number(expense)).toFixed(2),
  count: 1,
  ...extra,
});

const data = (groupBy, buckets, splitBy = null) => ({
  currency: "EUR",
  from: "2026-01-01",
  to: "2026-12-31",
  groupBy,
  splitBy,
  kind: null,
  buckets,
});

const normalize = (text) => text.replace(/\s/g, " ");

describe("analyticsChartOption", () => {
  it("draws monthly bars with French labels and money tooltips", () => {
    const option = analyticsChartOption(
      data("month", [totals("2026-09", "40.00"), totals("2026-10", "12.50")]),
      { metric: "expense", chart: "bar" },
      tokens
    );
    expect(option.xAxis.data).toEqual(["sept. 2026", "oct. 2026"]);
    expect(option.series).toHaveLength(1);
    expect(option.series[0]).toMatchObject({ type: "bar", name: "Dépenses" });
    expect(option.series[0].data.map((point) => point.value)).toEqual([
      40, 12.5,
    ]);
    expect(normalize(option.tooltip.valueFormatter(12.5))).toBe("12,50 €");
    expect(option.aria.enabled).toBe(false);
    expect(option).not.toHaveProperty("dataZoom");
  });

  it("colours a net balance by sign and draws areas as filled lines", () => {
    const buckets = [
      totals("2026-09", "40.00"),
      totals("2026-10", "0.00", "60.00"),
    ];
    const bars = analyticsChartOption(
      data("month", buckets),
      { metric: "net", chart: "bar" },
      tokens
    );
    expect(bars.series[0].data.map((point) => point.itemStyle.color)).toEqual([
      "#cc3300",
      "#228844",
    ]);
    const area = analyticsChartOption(
      data("month", buckets),
      { metric: "income", chart: "area" },
      tokens
    );
    expect(area.series[0]).toMatchObject({ type: "line", areaStyle: {} });
  });

  it("stacks one series per split key with category colours", () => {
    const split = (key, food, leisure) => ({
      ...totals(key, "0.00"),
      series: [
        totals("7", leisure, "0.00", { label: "Loisirs" }),
        totals("4", food, "0.00", { label: "Alimentation", color: "#55AA22" }),
      ],
    });
    const option = analyticsChartOption(
      data(
        "month",
        [split("2026-09", "0.00", "40.00"), split("2026-10", "12.50", "0.00")],
        "category"
      ),
      { metric: "expense", chart: "stacked" },
      tokens
    );
    expect(
      option.series.map((serie) => [serie.name, serie.stack, serie.data])
    ).toEqual([
      ["Loisirs", "total", [40, 0]],
      ["Alimentation", "total", [0, 12.5]],
    ]);
    expect(option.series[1].itemStyle.color).toBe("#55AA22");
    expect(option.legend).toMatchObject({ top: 0, selectedMode: false });
    const lines = analyticsChartOption(
      data("month", [split("2026-09", "0.00", "40.00")], "category"),
      { metric: "expense", chart: "line" },
      tokens
    );
    expect(lines.series[0]).not.toHaveProperty("stack");
  });

  it("adds zoom beyond 31 time buckets, starting on the latest points", () => {
    const days = Array.from({ length: 40 }, (_, index) =>
      totals(`2026-10-${String((index % 28) + 1).padStart(2, "0")}`, "1.00")
    );
    const option = analyticsChartOption(
      data("day", days),
      { metric: "expense", chart: "line" },
      tokens
    );
    expect(option.dataZoom.map((zoom) => [zoom.type, zoom.startValue])).toEqual(
      [
        ["inside", 40 - ZOOM_THRESHOLD],
        ["slider", 40 - ZOOM_THRESHOLD],
      ]
    );
  });

  it("draws categories as horizontal bars or a pie with an amount legend", () => {
    const buckets = [
      totals("7", "60.00", "0.00", { label: "Loisirs" }),
      totals("4", "40.00", "0.00", { label: "Alimentation", color: "#55AA22" }),
      totals("9", "0.00", "5.00", { label: "Salaire" }),
    ];
    const bars = analyticsChartOption(
      data("category", buckets),
      { metric: "expense", chart: "bar" },
      tokens
    );
    expect(bars.yAxis).toMatchObject({ type: "category", inverse: true });
    const pie = analyticsChartOption(
      data("category", buckets),
      { metric: "expense", chart: "pie" },
      tokens
    );
    // Les catégories sans dépense sont retirées du secteur.
    expect(pie.series[0].data.map((item) => item.name)).toEqual([
      "Loisirs",
      "Alimentation",
    ]);
    expect(pie).not.toHaveProperty("legend");
    expect(
      pieSlices(data("category", buckets), "expense", tokens).map((slice) => [
        slice.name,
        slice.color,
        slice.share,
      ])
    ).toEqual([
      ["Loisirs", PIE_PALETTE[0], 0.6],
      ["Alimentation", "#55AA22", 0.4],
    ]);
    expect(pie.series[0].data[1].itemStyle.color).toBe("#55AA22");
  });

  it("keeps many categories readable: no canvas legend, cycled colours", () => {
    const many = Array.from({ length: 14 }, (_, index) =>
      totals(String(index + 1), `${index + 1}.00`, "0.00", {
        label: `Catégorie ${index + 1}`,
      })
    );
    const option = analyticsChartOption(
      data("category", many),
      { metric: "expense", chart: "pie" },
      tokens
    );
    expect(option).not.toHaveProperty("legend");
    expect(option.series[0].center).toEqual(["50%", "50%"]);
    const colors = pieSlices(data("category", many), "expense", tokens).map(
      (slice) => slice.color
    );
    expect(new Set(colors.slice(0, 9)).size).toBe(9);
    expect(colors[9]).toBe(colors[0]);
  });

  it("zooms with Ctrl + wheel only, so the page keeps scrolling", () => {
    const days = Array.from({ length: 40 }, (_, index) =>
      totals(`2026-10-${String((index % 28) + 1).padStart(2, "0")}`, "1.00")
    );
    const [inside] = analyticsChartOption(
      data("day", days),
      { metric: "expense", chart: "bar" },
      tokens
    ).dataZoom;
    expect(inside).toMatchObject({
      zoomOnMouseWheel: "ctrl",
      moveOnMouseWheel: false,
    });
  });

  it("uses income and expense colours for kinds", () => {
    const option = analyticsChartOption(
      data("kind", [
        totals("DEPENSE", "10.00"),
        totals("ENTREE", "0.00", "20.00"),
      ]),
      { metric: "income", chart: "pie" },
      tokens
    );
    expect(
      option.series[0].data.map((item) => [item.name, item.itemStyle.color])
    ).toEqual([["Entrées", "#228844"]]);
  });
});
