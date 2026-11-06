import { goalTrajectoryOption } from "./goalTrajectoryChartOptions";
export const COMPARISONS = [
  {
    key: "planned",
    label: "Rythme prévu",
    pattern: "pointillés",
    symbol: "circle",
    line: "dotted",
    color: "forecast",
  },
  {
    key: "maximum",
    label: "Maximum théorique",
    pattern: "tirets",
    symbol: "rect",
    line: "dashed",
    color: "muted",
  },
  {
    key: "reasonable",
    label: "Estimation raisonnable",
    pattern: "trait continu",
    symbol: "triangle",
    line: "solid",
    color: "income",
  },
];
export const savingsComparisonOption = (goal, data, tokens, visible) => {
  const base = goalTrajectoryOption(
    goal,
    data.projections.planned.points.map((point) => ({
      month: point.month,
      amount: point.savedAmount,
    })),
    tokens
  );
  return {
    ...base,
    series: COMPARISONS.filter((item) => visible.includes(item.key)).map(
      (item, index) => {
        const projection = data.projections[item.key];
        const references = [{ yAxis: Number(goal.targetAmount) }];
        const desired = goal.targetDate?.slice(0, 7);
        const months = projection.points.map((point) => point.month);
        if (months.includes(desired)) references.push({ xAxis: desired });
        if (months.includes(projection.estimatedReachMonth))
          references.push({ xAxis: projection.estimatedReachMonth });
        return {
          ...base.series[0],
          name: item.label,
          smooth: 0.15,
          smoothMonotone: "x",
          symbol: item.symbol,
          data: projection.points.map((point, i) => ({
            value: Number(point.savedAmount),
            symbol:
              i === 0
                ? "circle"
                : point.fundable
                ? item.symbol
                : "emptyDiamond",
            symbolSize: i === 0 ? 8 : 6,
            itemStyle: { color: tokens[item.color] },
          })),
          itemStyle: { color: tokens[item.color] },
          lineStyle: {
            color: tokens[item.color],
            type: item.line,
            width: item.key === "reasonable" ? 3 : 2,
            cap: "round",
            join: "round",
          },
          markLine: {
            ...base.series[0].markLine,
            lineStyle: {
              color: index === 0 ? tokens.muted : tokens[item.color],
              type: "dotted",
              width: 1,
            },
            data: references,
          },
        };
      }
    ),
  };
};
