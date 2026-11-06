import {
  formatCompact,
  formatMoney,
  monthLabel,
} from "../BudgetCalendar/budgetFormat";

export const budgetForecastChartOption = (months, currency, tokens) => ({
  aria: { enabled: false },
  animation: !tokens.reducedMotion,
  textStyle: { color: tokens.text, fontFamily: tokens.font },
  grid: {
    left: 8,
    right: 8,
    top: 24,
    bottom: 8,
    outerBoundsMode: "same",
    outerBoundsContain: "axisLabel",
  },
  tooltip: {
    trigger: "axis",
    valueFormatter: (value) => formatMoney(String(value), currency),
    backgroundColor: tokens.surface,
    borderColor: tokens.grid,
    textStyle: { color: tokens.text },
  },
  xAxis: {
    type: "category",
    data: months.map((month) => monthLabel(month.month)),
    axisLabel: { color: tokens.text, rotate: 0, hideOverlap: true },
    axisLine: { lineStyle: { color: tokens.grid } },
  },
  yAxis: {
    type: "value",
    splitNumber: 3,
    axisLabel: {
      color: tokens.muted,
      formatter: (value) => formatCompact(String(value)),
      hideOverlap: true,
    },
    splitLine: { show: false },
  },
  series: [
    {
      name: "Reste prévisionnel de fin de mois",
      type: "line",
      smooth: 0.2,
      smoothMonotone: "x",
      symbol: "circle",
      symbolSize: 6,
      lineStyle: { color: tokens.forecast, width: 3, cap: "round" },
      data: months.map((month) => ({
        value: Number(month.forecastRemaining),
        itemStyle: {
          color:
            Number(month.forecastRemaining) < 0
              ? tokens.expense
              : tokens.forecast,
        },
      })),
    },
  ],
});
