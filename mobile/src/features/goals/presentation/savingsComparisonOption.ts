import type { ThemeTokens } from "@/src/design/tokens";
import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";
import {
  ProjectionKey,
  SavingsTrajectories,
} from "@/src/features/goals/domain/savingsTrajectory";

type Colors = ThemeTokens["color"];

/** Trois courbes distinctes par trait et symbole, pas seulement la couleur. */
export const COMPARISONS: readonly {
  key: ProjectionKey;
  label: string;
  pattern: string;
  symbol: string;
  line: "dotted" | "dashed" | "solid";
  color: (colors: Colors) => string;
}[] = [
  {
    key: "planned",
    label: "Rythme prévu",
    pattern: "pointillés",
    symbol: "circle",
    line: "dotted",
    color: (c) => c.dataForecast,
  },
  {
    key: "maximum",
    label: "Maximum théorique",
    pattern: "tirets",
    symbol: "rect",
    line: "dashed",
    color: (c) => c.textMuted,
  },
  {
    key: "reasonable",
    label: "Estimation raisonnable",
    pattern: "trait continu",
    symbol: "triangle",
    line: "solid",
    color: (c) => c.dataIncome,
  },
];

const shortMonth = (month: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));

const compact = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

/**
 * Option ECharts des trajectoires (#285), reprise du Web #284 : points
 * mensuels du serveur, lissage léger monotone, extrémités arrondies, sans
 * grille ni animation. Repères : cible, mois souhaité et date d'atteinte
 * finançable de chaque courbe quand ils sont dans la période.
 */
export const savingsComparisonOption = (
  goal: FinancialGoal,
  data: SavingsTrajectories,
  colors: Colors,
  visible: readonly ProjectionKey[],
) => {
  const months = data.projections.planned.points.map((point) => point.month);
  const desired = goal.targetDate?.slice(0, 7) ?? null;
  return {
    animation: false,
    textStyle: { color: colors.textPrimary },
    grid: { left: 8, right: 24, top: 32, bottom: 16, containLabel: true },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: months,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: colors.textMuted,
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
      nameTextStyle: { color: colors.textPrimary },
      splitNumber: 3,
      axisLabel: {
        color: colors.textMuted,
        hideOverlap: true,
        formatter: compact,
      },
      splitLine: { show: false },
    },
    series: COMPARISONS.filter((item) => visible.includes(item.key)).map(
      (item, index) => {
        const projection = data.projections[item.key];
        const color = item.color(colors);
        const references: ({ yAxis: number } | { xAxis: string })[] = [
          { yAxis: Number(goal.targetAmount) },
        ];
        if (desired !== null && months.includes(desired)) {
          references.push({ xAxis: desired });
        }
        if (
          projection.estimatedReachMonth !== null &&
          months.includes(projection.estimatedReachMonth)
        ) {
          references.push({ xAxis: projection.estimatedReachMonth });
        }
        return {
          name: item.label,
          type: "line",
          smooth: 0.15,
          smoothMonotone: "x",
          showSymbol: true,
          symbol: item.symbol,
          data: projection.points.map((point, i) => ({
            value: Number(point.savedAmount),
            // Départ déclaré ; losange vide = point non finançable.
            symbol:
              i === 0
                ? "circle"
                : point.fundable
                  ? item.symbol
                  : "emptyDiamond",
            symbolSize: i === 0 ? 8 : 6,
            itemStyle: { color },
          })),
          itemStyle: { color },
          lineStyle: {
            color,
            type: item.line,
            width: item.key === "reasonable" ? 3 : 2,
            cap: "round",
            join: "round",
          },
          markLine: {
            silent: true,
            symbol: "none",
            label: { show: false },
            lineStyle: {
              color: index === 0 ? colors.textMuted : color,
              type: "dotted",
              width: 1,
            },
            data: references,
          },
        };
      },
    ),
  };
};
