import { describe, expect, it } from "vitest";
import fixtures from "../fixtures/savingsTrajectories.json";
import { savingsComparisonOption } from "../../src/js/components/charts/savingsComparisonOptions";
const tokens = {
  text: "#123",
  muted: "#456",
  grid: "#789",
  surface: "#fff",
  forecast: "#04f",
  income: "#080",
  font: "sans-serif",
  reducedMotion: true,
};
describe("comparison chart uses authoritative points", () => {
  it("keeps three distinct shapes, rounded lines, no grid and reduced motion", () => {
    const data = fixtures.cases["standard-24-1-true"];
    const option = savingsComparisonOption(fixtures.goals[0], data, tokens, [
      "planned",
      "maximum",
      "reasonable",
    ]);
    expect(option.animation).toBe(false);
    expect(option.yAxis.splitLine.show).toBe(false);
    expect(option.series.map((s) => s.lineStyle.type)).toEqual([
      "dotted",
      "dashed",
      "solid",
    ]);
    expect(option.series.every((s) => s.lineStyle.cap === "round")).toBe(true);
    expect(option.series[2].data.map((p) => p.value)).toEqual(
      data.projections.reasonable.points.map((p) => Number(p.savedAmount))
    );
  });
  it("marks unfunded points and allows keyboard-controlled series selection", () => {
    const data = structuredClone(fixtures.cases["standard-24-1-true"]);
    data.projections.reasonable.points[1].fundable = false;
    const option = savingsComparisonOption(fixtures.goals[0], data, tokens, [
      "reasonable",
    ]);
    expect(option.series).toHaveLength(1);
    expect(option.series[0].data[1].symbol).toBe("emptyDiamond");
  });
});
