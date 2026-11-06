import { describe, expect, it } from "vitest";
import {
  goalGaugeOption,
  goalTrajectoryOption,
} from "../../src/js/components/charts/goalTrajectoryChartOptions";

const tokens = {
  text: "#fafafa",
  muted: "#cccccc",
  grid: "#445544",
  income: "#aaffaa",
  forecast: "#ffcc99",
  surface: "#223322",
  reducedMotion: true,
};

describe("goal chart options", () => {
  it("uses the declared percentage in a rounded, reduced-motion gauge", () => {
    const option = goalGaugeOption(30, tokens);
    expect(option.animation).toBe(false);
    expect(option.series[0]).toMatchObject({
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      data: [{ value: 30 }],
      progress: { roundCap: true },
      pointer: { show: false },
    });
  });

  it("keeps the exact monthly points, target and deadline without grid lines", () => {
    const goal = {
      currency: "CHF",
      targetAmount: "6000.00",
      savedAmount: "1800.00",
      targetDate: "2026-11-12",
    };
    const points = [
      { month: "2026-10", amount: "1800.00" },
      { month: "2026-11", amount: "2150.00" },
    ];
    const option = goalTrajectoryOption(goal, points, tokens);
    expect(option.yAxis.splitLine.show).toBe(false);
    expect(option.yAxis.name).toBe("CHF");
    expect(option.series[0].data.map(({ value }) => value)).toEqual([
      1800, 2150,
    ]);
    expect(option.series[0].data.map(({ symbol }) => symbol)).toEqual([
      "circle",
      "emptyCircle",
    ]);
    expect(option.series[0].lineStyle).toMatchObject({
      type: "dashed",
      cap: "round",
      join: "round",
    });
    expect(option.series[0].markLine.data).toEqual([
      { yAxis: 6000 },
      { xAxis: "2026-11" },
    ]);
    expect(option.animation).toBe(false);
  });
});
