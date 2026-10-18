import type { EChartsCoreOption } from "echarts/core";
import { primitives, type ThemeTokens } from "@/src/design/tokens";
import type { ChartRow } from "./chartData";

/** Palette des catégories sans couleur propre, identique au Web (#172). */
export const CATEGORY_PALETTE = [
  "dataCategory1",
  "dataCategory2",
  "dataCategory3",
  "dataCategory4",
  "dataCategory5",
  "dataCategory6",
] as const;

export const categoryColor = (
  row: Pick<ChartRow, "color" | "paletteIndex">,
  colors: ThemeTokens["color"],
): string =>
  row.color ??
  colors[CATEGORY_PALETTE[row.paletteIndex % CATEGORY_PALETTE.length]];

const LABEL_MAX_LENGTH = 16;

/** Libellé d'axe tronqué : le nom complet reste dans la liste sous le graphique. */
export const axisLabelText = (name: string): string =>
  name.length > LABEL_MAX_LENGTH
    ? `${name.slice(0, LABEL_MAX_LENGTH - 1).trimEnd()}…`
    : name;

export const expensesOption = (
  rows: ChartRow[],
  colors: ThemeTokens["color"],
): EChartsCoreOption => ({
  aria: { enabled: false },
  animation: false,
  // Équivalent ECharts 6 de `containLabel` (#154) : la grille garde la place
  // des libellés réellement affichés.
  grid: {
    left: 8,
    right: 16,
    top: 8,
    bottom: 24,
    outerBoundsMode: "same",
    outerBoundsContain: "axisLabel",
  },
  xAxis: {
    type: "value",
    // Trois intervalles au plus : sur un écran de 360 px, les graduations
    // par défaut se touchaient (« 100200300… »).
    splitNumber: 3,
    axisLabel: {
      color: colors.textMuted,
      fontSize: primitives.fontSize.xs,
      lineHeight: 16,
      hideOverlap: true,
    },
    splitLine: { lineStyle: { color: colors.borderSubtle } },
  },
  yAxis: {
    type: "category",
    inverse: true,
    data: rows.map((r) => r.name),
    axisLabel: {
      color: colors.textPrimary,
      fontSize: primitives.fontSize.xs,
      lineHeight: 16,
      // Sans largeur fixe : une largeur de 120 px restait réservée même pour
      // « Autres » et laissait une bande vide à gauche (#172).
      formatter: axisLabelText,
    },
  },
  series: [
    {
      type: "bar",
      silent: true,
      data: rows.map((r) => ({
        value: r.cents / 100,
        itemStyle: { color: categoryColor(r, colors) },
      })),
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
