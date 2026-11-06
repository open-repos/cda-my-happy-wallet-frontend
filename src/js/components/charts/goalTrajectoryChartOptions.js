import { formatCompact, formatMoney } from "../BudgetCalendar/budgetFormat";

const shortMonth = (month) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));

/** Rounded semicircle; the accessible percentage is rendered as HTML. */
export const goalGaugeOption = (percent, tokens) => ({
  aria: { enabled: false },
  animation: !tokens.reducedMotion,
  animationDuration: 0,
  animationDurationUpdate: 200,
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
        lineStyle: { width: 12, color: [[1, tokens.grid]] },
      },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      title: { show: false },
      detail: { show: false },
      itemStyle: { color: tokens.income },
      data: [{ value: percent }],
    },
  ],
});

/** A single recorded contribution rate, never an invented alternative budget. */
export const goalTrajectoryOption = (goal, points, tokens) => {
  const months = points.map(({ month }) => month);
  const references = [{ yAxis: Number(goal.targetAmount) }];
  const desired = goal.targetDate?.slice(0, 7);
  if (months.includes(desired)) references.push({ xAxis: desired });
  return {
    aria: { enabled: false },
    animation: !tokens.reducedMotion,
    animationDuration: 0,
    animationDurationUpdate: 200,
    textStyle: { color: tokens.text, fontFamily: tokens.font },
    grid: {
      left: 8,
      right: 24,
      top: 32,
      bottom: 16,
      outerBoundsMode: "same",
      outerBoundsContain: "axisLabel",
    },
    tooltip: {
      trigger: "axis",
      confine: true,
      backgroundColor: tokens.surface,
      borderColor: tokens.grid,
      textStyle: { color: tokens.text },
      valueFormatter: (value) => formatMoney(String(value), goal.currency),
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: months,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: tokens.muted,
        interval: Math.max(0, Math.ceil(months.length / 3) - 1),
        showMinLabel: true,
        showMaxLabel: true,
        hideOverlap: true,
        formatter: shortMonth,
      },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.max(Number(goal.targetAmount), Number(goal.savedAmount)) * 1.1,
      name: goal.currency,
      nameTextStyle: { color: tokens.text },
      splitNumber: 3,
      axisLabel: {
        color: tokens.muted,
        hideOverlap: true,
        formatter: (value) => formatCompact(String(value)),
      },
      splitLine: { show: false },
    },
    series: [
      {
        name: "Épargne projetée au rythme enregistré",
        type: "line",
        smooth: 0.2,
        showSymbol: true,
        symbol: "circle",
        symbolSize: 6,
        data: points.map(({ amount }, index) => ({
          value: Number(amount),
          symbol: index === 0 ? "circle" : "emptyCircle",
          symbolSize: index === 0 ? 8 : 6,
          itemStyle: { color: index === 0 ? tokens.text : tokens.forecast },
        })),
        itemStyle: { color: tokens.forecast },
        lineStyle: {
          color: tokens.forecast,
          type: "dashed",
          width: 3,
          cap: "round",
          join: "round",
        },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          lineStyle: { color: tokens.muted, width: 1, type: "dotted" },
          data: references,
        },
      },
    ],
  };
};
