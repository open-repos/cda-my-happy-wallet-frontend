import { formatMoney } from "../BudgetCalendar/budgetFormat";
import {
  METRICS,
  bucketLabel,
  isTemporal,
} from "../../utils/analyticsExplorer";
import { paletteColor, paletteIndexOf } from "../../utils/categoryPalette";

/** Au-delà, un zoom/défilement est proposé sur les séries temporelles. */
export const ZOOM_THRESHOLD = 31;

const metricLabel = (metric) =>
  METRICS.find((option) => option.value === metric).label;

const compact = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const metricColor = (metric, tokens) =>
  metric === "income"
    ? tokens.income
    : metric === "net"
    ? tokens.forecast
    : tokens.expense;

const kindColor = (key, tokens) =>
  key === "ENTREE"
    ? tokens.income
    : key === "DEPENSE"
    ? tokens.expense
    : undefined;

/**
 * Couleurs des seaux ou séries, dans l'ordre : catégorie (couleur propre,
 * sinon palette au rang de la catégorie comme sur l'accueil, #172), sens, ou
 * palette du thème par position. Sans rangs chargés, les catégories sans
 * couleur suivent leur ordre d'affichage.
 */
const colorsOf = (items, dimension, tokens, ranks) => {
  let unranked = 0;
  return items.map((item, index) => {
    if (dimension === "kind")
      return kindColor(item.key, tokens) ?? paletteColor(index, tokens);
    if (dimension !== "category") return paletteColor(index, tokens);
    return (
      item.color ??
      paletteColor(
        ranks ? paletteIndexOf(ranks, Number(item.key)) : unranked++,
        tokens
      )
    );
  });
};

const valueOf = (totals, metric) => Number(totals[metric]);

const baseOption = (tokens, currency, trigger) => ({
  // Libellé français du conteneur et tableau des valeurs font foi.
  aria: { enabled: false },
  animation: !tokens.reducedMotion,
  animationDuration: 300,
  textStyle: { color: tokens.text, fontFamily: tokens.font || undefined },
  tooltip: {
    trigger,
    valueFormatter: (value) => formatMoney(String(value), currency),
    backgroundColor: tokens.surface,
    borderColor: tokens.grid,
    textStyle: { color: tokens.text },
  },
});

const legend = (tokens, position) => ({
  type: "scroll",
  selectedMode: false,
  textStyle: { color: tokens.text },
  ...position,
});

/**
 * Parts non nulles d'un graphique en secteurs, avec leur couleur et leur part
 * calculée en centimes. Le tableau des valeurs sert de légende.
 */
export const pieSlices = (data, metric, tokens, ranks = null) => {
  const rows = data.buckets.filter((bucket) => valueOf(bucket, metric) !== 0);
  const colors = colorsOf(rows, data.groupBy, tokens, ranks);
  const totalCents = rows.reduce(
    (sum, bucket) => sum + Math.round(valueOf(bucket, metric) * 100),
    0
  );
  return rows.map((bucket, index) => ({
    key: bucket.key,
    name: bucketLabel(bucket, data.groupBy),
    value: valueOf(bucket, metric),
    color: colors[index],
    share:
      totalCents > 0
        ? Math.round(valueOf(bucket, metric) * 100) / totalCents
        : 0,
  }));
};

// Sans légende dans le canvas : elle recouvrait l'anneau sur mobile avec de
// nombreuses catégories.
const pieOption = (data, metric, tokens, ranks) => ({
  ...baseOption(tokens, data.currency, "item"),
  series: [
    {
      type: "pie",
      radius: ["38%", "72%"],
      center: ["50%", "50%"],
      label: { show: false },
      data: pieSlices(data, metric, tokens, ranks).map((slice) => ({
        name: slice.name,
        value: slice.value,
        itemStyle: { color: slice.color },
      })),
    },
  ],
});

const seriesOf = (data, metric, chart, tokens, ranks) => {
  if (data.splitBy === null) {
    // Une barre par catégorie, dans sa couleur ; le solde garde son signe.
    const perCategory = data.groupBy === "category" && metric !== "net";
    const barColors = perCategory
      ? colorsOf(data.buckets, "category", tokens, ranks)
      : null;
    return [
      {
        name: metricLabel(metric),
        type: chart === "bar" ? "bar" : "line",
        ...(chart === "area" ? { areaStyle: { opacity: 0.25 } } : {}),
        itemStyle: { color: metricColor(metric, tokens) },
        lineStyle: { color: metricColor(metric, tokens) },
        data: data.buckets.map((bucket, index) => ({
          value: valueOf(bucket, metric),
          ...(barColors ? { itemStyle: { color: barColors[index] } } : {}),
          // Solde : négatif en couleur de dépense, positif en couleur d'entrée.
          ...(metric === "net" && chart === "bar"
            ? {
                itemStyle: {
                  color:
                    valueOf(bucket, metric) < 0
                      ? tokens.expense
                      : tokens.income,
                },
              }
            : {}),
        })),
      },
    ];
  }
  const keys = data.buckets[0]?.series ?? [];
  const colors = colorsOf(keys, data.splitBy, tokens, ranks);
  return keys.map((serie, index) => {
    const color = colors[index];
    return {
      name: bucketLabel(serie, data.splitBy),
      type: chart === "stacked" ? "bar" : "line",
      ...(chart === "line" ? {} : { stack: "total" }),
      ...(chart === "area" ? { areaStyle: { opacity: 0.35 } } : {}),
      ...(color ? { itemStyle: { color }, lineStyle: { color } } : {}),
      data: data.buckets.map((bucket) => valueOf(bucket.series[index], metric)),
    };
  });
};

/**
 * Option ECharts de l'explorateur. Les catégories et types sont en barres
 * horizontales ou en secteurs; le temps en barres, barres empilées, lignes ou
 * aires, avec zoom au-delà de 31 points.
 */
export const analyticsChartOption = (
  data,
  { metric, chart },
  tokens,
  ranks = null
) => {
  if (chart === "pie") return pieOption(data, metric, tokens, ranks);
  const labels = data.buckets.map((bucket) =>
    bucketLabel(bucket, data.groupBy)
  );
  const temporal = isTemporal(data.groupBy);
  const zoom = temporal && data.buckets.length > ZOOM_THRESHOLD;
  const valueAxis = {
    type: "value",
    axisLabel: {
      color: tokens.muted,
      formatter: (value) => compact.format(value),
    },
    splitLine: { lineStyle: { color: tokens.grid } },
  };
  const categoryAxis = {
    type: "category",
    data: labels,
    axisLabel: { color: tokens.text },
    axisLine: { lineStyle: { color: tokens.grid } },
    ...(temporal ? {} : { inverse: true }),
  };
  const split = data.splitBy !== null;
  return {
    ...baseOption(tokens, data.currency, "axis"),
    ...(split ? { legend: legend(tokens, { top: 0 }) } : {}),
    grid: {
      left: 8,
      right: 16,
      top: split ? 36 : 12,
      bottom: zoom ? 56 : 8,
      // Équivalent ECharts 6 de `containLabel` (#154).
      outerBoundsMode: "same",
      outerBoundsContain: "axisLabel",
    },
    xAxis: temporal ? categoryAxis : valueAxis,
    yAxis: temporal ? valueAxis : categoryAxis,
    ...(zoom
      ? {
          dataZoom: [
            {
              type: "inside",
              // La molette fait défiler la page; Ctrl + molette zoome.
              zoomOnMouseWheel: "ctrl",
              moveOnMouseWheel: false,
              startValue: data.buckets.length - ZOOM_THRESHOLD,
            },
            {
              type: "slider",
              bottom: 8,
              startValue: data.buckets.length - ZOOM_THRESHOLD,
            },
          ],
        }
      : {}),
    series: seriesOf(data, metric, chart, tokens, ranks),
  };
};
