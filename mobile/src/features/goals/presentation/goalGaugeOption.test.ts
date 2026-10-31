import { GaugeChart } from "echarts/charts";
import * as echarts from "echarts/core";
import { SVGRenderer } from "echarts/renderers";
import { describe, expect, it } from "vitest";

import { themes } from "@/src/design/tokens";
import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";
import { estimatedReachLabel, goalGaugeOption } from "./goalGaugeOption";

echarts.use([GaugeChart, SVGRenderer]);

describe("goal gauge", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const percent of [0, 30, 100]) {
      it(`renders ${percent}% in ${theme} without animation or financial thresholds`, () => {
        const option = goalGaugeOption(percent, themes[theme].color);
        const chart = echarts.init(null, undefined, {
          renderer: "svg",
          ssr: true,
          width: 260,
          height: 160,
        });
        try {
          chart.setOption(option);
          expect(chart.renderToSVGString()).toContain("<path");
          expect(option.animation).toBe(false);
          expect(option.series).toMatchObject([
            {
              data: [{ value: percent }],
              pointer: { show: false },
              progress: { roundCap: true },
            },
          ]);
        } finally {
          chart.dispose();
        }
      });
    }
  }

  it("uses a behind goal’s server month, leaving unknown and reached explicit", () => {
    const goal = {
      forecast: { status: "BEHIND", estimatedReachMonth: "2027-10" },
    } as FinancialGoal;
    expect(estimatedReachLabel(goal)).toBe("octobre 2027");
    expect(
      estimatedReachLabel({
        ...goal,
        forecast: { ...goal.forecast, estimatedReachMonth: null },
      }),
    ).toBe("Non calculable");
    expect(
      estimatedReachLabel({
        ...goal,
        forecast: { ...goal.forecast, status: "REACHED" },
      }),
    ).toBe("Objectif atteint");
  });
});
