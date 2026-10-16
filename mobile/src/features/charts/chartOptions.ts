import type { EChartsCoreOption } from "echarts/core";
import type { ThemeTokens } from "@/src/design/tokens";
import type { ChartRow } from "./chartData";

export const expensesOption = (
  rows: ChartRow[],
  colors: ThemeTokens["color"],
): EChartsCoreOption => ({
  aria: { enabled: false },
  animation: false,
  grid: { left: 8, right: 16, top: 8, bottom: 24, containLabel: true },
  xAxis: {
    type: "value",
    axisLabel: { color: colors.textMuted },
    splitLine: { lineStyle: { color: colors.borderSubtle } },
  },
  yAxis: {
    type: "category",
    inverse: true,
    data: rows.map((r) => r.name),
    axisLabel: { color: colors.textPrimary, width: 120, overflow: "truncate" },
  },
  series: [
    {
      type: "bar",
      silent: true,
      data: rows.map((r) => r.cents / 100),
      itemStyle: { color: colors.dataExpense },
      barMaxWidth: 24,
    },
  ],
});
export const goalsOption = (
  percent: number,
  colors: ThemeTokens["color"],
): EChartsCoreOption => ({
  aria: { enabled: false },
  animation: false,
  series: [
    {
      type: "pie",
      silent: true,
      radius: ["65%", "85%"],
      label: { show: false },
      data: [
        { value: percent, itemStyle: { color: colors.dataIncome } },
        { value: 100 - percent, itemStyle: { color: colors.borderSubtle } },
      ],
    },
  ],
});
