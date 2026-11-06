import type { EChartsCoreOption } from "echarts/core";

import { primitives, type ThemeTokens } from "@/src/design/tokens";
import { money } from "@/src/features/budget/domain/budgetSummary";
import {
  Analytics,
  Grouping,
  Metric,
  bucketLabel,
  metricCents,
} from "@/src/features/analytics/domain/analytics";
import {
  axisLabelText,
  categoryColor,
} from "@/src/features/charts/chartOptions";

export interface AnalyticsRow {
  key: string;
  name: string;
  cents: number;
  /** Phrase de la liste textuelle, équivalent du graphique. */
  label: string;
  color: string;
}

export { paletteRanks } from "@/src/features/charts/categoryPalette";

const metricColor = (
  metric: Metric,
  cents: number,
  colors: ThemeTokens["color"],
) =>
  metric === "income" || (metric === "net" && cents >= 0)
    ? colors.dataIncome
    : colors.dataExpense;

/**
 * Lignes du graphique et de la liste : catégories triées par montant, temps
 * chronologique. Le solde net est coloré selon son signe, comme sur le Web ;
 * sinon une catégorie garde sa couleur, ou la palette à son rang (#172).
 * Sans rangs (catégories illisibles), la palette suit l'ordre d'affichage.
 */
export const analyticsRows = (
  analytics: Analytics,
  metric: Metric,
  groupBy: Grouping,
  ranks: Map<number, number> | null,
  colors: ThemeTokens["color"],
): AnalyticsRow[] => {
  const rows = analytics.buckets.map((bucket) => {
    const cents = metricCents(bucket, metric);
    const name = bucketLabel(bucket, groupBy);
    return {
      key: bucket.key,
      name,
      cents,
      label: `${name} : ${money(cents, analytics.currency)}`,
      bucketColor: bucket.color,
    };
  });
  const ordered =
    groupBy === "category"
      ? rows
          .filter((row) => row.cents !== 0)
          .sort((a, b) => b.cents - a.cents || Number(a.key) - Number(b.key))
      : rows;
  let unranked = 0;
  return ordered.map(({ bucketColor, ...row }) => {
    if (groupBy !== "category" || metric === "net") {
      return { ...row, color: metricColor(metric, row.cents, colors) };
    }
    const paletteIndex =
      ranks == null
        ? bucketColor == null
          ? unranked++
          : 0
        : (ranks.get(Number(row.key)) ?? ranks.size);
    return {
      ...row,
      color: categoryColor({ color: bucketColor, paletteIndex }, colors),
    };
  });
};

const axisLabel = (colors: ThemeTokens["color"]) => ({
  color: colors.textMuted,
  fontSize: primitives.fontSize.xs,
  lineHeight: 16,
  hideOverlap: true,
});

/**
 * Barres horizontales pour les catégories, verticales pour le temps. Le
 * graphique est décoratif : la liste textuelle porte les valeurs.
 */
export const analyticsOption = (
  rows: AnalyticsRow[],
  groupBy: Grouping,
  colors: ThemeTokens["color"],
): EChartsCoreOption => {
  const valueAxis = {
    type: "value",
    splitNumber: 3,
    axisLabel: axisLabel(colors),
    splitLine: { lineStyle: { color: colors.borderSubtle } },
  };
  const categoryAxis = {
    type: "category",
    data: rows.map((row) => row.name),
    axisLabel: { ...axisLabel(colors), formatter: axisLabelText },
  };
  const horizontal = groupBy === "category";
  return {
    aria: { enabled: false },
    animation: false,
    grid: {
      left: 8,
      right: 16,
      top: 8,
      bottom: 24,
      outerBoundsMode: "same",
      outerBoundsContain: "axisLabel",
    },
    xAxis: horizontal ? valueAxis : categoryAxis,
    yAxis: horizontal ? { ...categoryAxis, inverse: true } : valueAxis,
    series: [
      {
        type: "bar",
        silent: true,
        barMaxWidth: 24,
        data: rows.map((row) => ({
          value: row.cents / 100,
          itemStyle: { color: row.color },
        })),
      },
    ],
  };
};
