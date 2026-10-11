import { describe, expect, it } from "vitest";
import {
  expensesChartHeight,
  expensesChartOption,
  goalsRingOption,
} from "../../src/js/components/charts/homeChartOptions";

const tokens = {
  text: "#111111",
  muted: "#555555",
  grid: "#dddddd",
  expense: "#cc3300",
  income: "#228844",
  surface: "#ffffff",
  font: "Inter",
  reducedMotion: false,
};

const rows = [
  { id: 5, name: "Loisirs", color: null, amount: "60.00", share: 1 },
  {
    id: 4,
    name: "Alimentation",
    color: "#55AA22",
    amount: "42.80",
    share: 0.7,
  },
];

const normalize = (text) => text.replace(/\s/g, " ");

describe("expensesChartOption", () => {
  it("draws horizontal bars, largest first, with token colors as fallback", () => {
    const option = expensesChartOption(rows, "bar", tokens, "EUR");

    expect(option.yAxis).toMatchObject({
      type: "category",
      inverse: true,
      data: ["Loisirs", "Alimentation"],
    });
    expect(option.series[0].type).toBe("bar");
    expect(option.series[0].data).toEqual([
      { name: "Loisirs", value: 60, itemStyle: { color: "#cc3300" } },
      { name: "Alimentation", value: 42.8, itemStyle: { color: "#55AA22" } },
    ]);
    expect(normalize(option.series[0].label.formatter({ value: 42.8 }))).toBe(
      "42,80 €"
    );
    expect(normalize(option.tooltip.valueFormatter(60))).toBe("60,00 €");
    // Le libellé français du conteneur ne doit pas être remplacé par ECharts.
    expect(option.aria.enabled).toBe(false);
    expect(option.animation).toBe(true);
  });

  it("switches to a donut pie without axes", () => {
    const option = expensesChartOption(rows, "pie", tokens, "EUR");

    expect(option.series[0]).toMatchObject({
      type: "pie",
      radius: ["35%", "65%"],
    });
    expect(option.series[0].data.map((item) => item.name)).toEqual([
      "Loisirs",
      "Alimentation",
    ]);
    expect(option).not.toHaveProperty("xAxis");
    expect(option.series[0].label).toEqual({ show: false });
    expect(option.legend).toMatchObject({
      type: "scroll",
      bottom: 0,
      selectedMode: false,
    });
    // 6000 / 10280 = 58,4 % ; 4280 / 10280 = 41,6 %.
    expect(normalize(option.legend.formatter("Loisirs"))).toBe(
      "Loisirs : 60,00 € (58 %)"
    );
    expect(normalize(option.legend.formatter("Alimentation"))).toBe(
      "Alimentation : 42,80 € (42 %)"
    );
  });

  it("disables the animation for reduced motion", () => {
    expect(
      expensesChartOption(
        rows,
        "bar",
        { ...tokens, reducedMotion: true },
        "EUR"
      ).animation
    ).toBe(false);
  });
});

describe("goalsRingOption", () => {
  it("fills the reached share and shows the percent in the center", () => {
    const option = goalsRingOption({ percent: 25 }, tokens);
    const [serie] = option.series;

    expect(serie.data.map((item) => item.value)).toEqual([25, 75]);
    expect(serie.data[0].itemStyle.color).toBe("#228844");
    expect(serie.data[1].label).toEqual({ show: false });
    expect(serie.label).toMatchObject({
      position: "center",
      formatter: "25 %\natteint",
    });
  });
});

describe("expensesChartHeight", () => {
  it("grows with the number of bars and keeps a fixed pie height", () => {
    expect(expensesChartHeight([rows[0]], "bar")).toBe(128);
    expect(expensesChartHeight(new Array(5).fill(rows[0]), "bar")).toBe(248);
    expect(expensesChartHeight(rows, "pie")).toBe(288);
  });
});
