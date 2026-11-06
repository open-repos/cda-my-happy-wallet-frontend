import type { EChartsCoreOption } from "echarts/core";

import type { ThemeTokens } from "@/src/design/tokens";
import type { FinancialGoal } from "@/src/features/goals/domain/financialGoal";

/** The server owns the month, including late and unknown estimates. */
export const estimatedReachLabel = (goal: FinancialGoal): string => {
  if (goal.forecast.status === "REACHED") return "Objectif atteint";
  const month = goal.forecast.estimatedReachMonth;
  return month === null
    ? "Non calculable"
    : new Intl.DateTimeFormat("fr-FR", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${month}-01T00:00:00.000Z`));
};

/** SVG semicircle, no pointer or thresholds; declared progress only. */
export const goalGaugeOption = (
  percent: number,
  colors: ThemeTokens["color"],
): EChartsCoreOption => ({
  aria: { enabled: false },
  animation: false,
  series: [
    {
      type: "gauge",
      startAngle: 180,
      endAngle: 0,
      min: 0,
      max: 100,
      center: ["50%", "80%"],
      radius: "125%",
      silent: true,
      pointer: { show: false },
      anchor: { show: false },
      progress: { show: true, roundCap: true, width: 12 },
      axisLine: {
        roundCap: true,
        lineStyle: { width: 12, color: [[1, colors.borderSubtle]] },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: false },
      detail: { show: false },
      itemStyle: { color: colors.dataIncome },
      data: [{ value: percent }],
    },
  ],
});
