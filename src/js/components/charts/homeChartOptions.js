import { formatMoney } from "../BudgetCalendar/budgetFormat";
import { iconDataUri } from "../../utils/categoryIcons";

export const EXPENSE_CHART_TYPES = [
  { value: "bar", label: "Barres" },
  { value: "pie", label: "Secteurs" },
];

const textStyle = (tokens) => ({
  color: tokens.text,
  fontFamily: tokens.font || undefined,
});

const tooltip = (currency, tokens) => ({
  trigger: "item",
  valueFormatter: (value) => formatMoney(String(value), currency),
  backgroundColor: tokens.surface,
  borderColor: tokens.grid,
  textStyle: textStyle(tokens),
});

const colorOf = (row, tokens) => row.color ?? tokens.expense;

const percentFormat = new Intl.NumberFormat("fr-FR", {
  style: "percent",
  maximumFractionDigits: 0,
});

const toCents = (amount) => Math.round(Number(amount) * 100);

/** Légende des secteurs : « Loisirs : 60,00 € (58 %) », calculée en centimes. */
export const pieLegendLabels = (rows, currency) => {
  const total = rows.reduce((sum, row) => sum + toCents(row.amount), 0);
  return new Map(
    rows.map((row) => [
      row.name,
      `${row.name} : ${formatMoney(
        row.amount,
        currency
      )} (${percentFormat.format(
        total > 0 ? toCents(row.amount) / total : 0
      )})`,
    ])
  );
};

/** Hauteur du graphique : barres lisibles quel que soit le nombre de catégories. */
export const expensesChartHeight = (rows, type) =>
  type === "pie" ? 288 : Math.max(128, rows.length * 40 + 48);

/**
 * Dépenses du mois par catégorie, en barres horizontales (la plus forte en
 * haut) ou en secteurs. Les montants API restent des chaînes : seule la
 * valeur numérique tracée est convertie.
 */
export const expensesChartOption = (
  rows,
  type,
  tokens,
  currency,
  icons = new Map()
) => {
  const data = rows.map((row) => ({
    name: row.name,
    value: Number(row.amount),
    itemStyle: { color: colorOf(row, tokens) },
  }));
  // Icône de chaque catégorie dans sa couleur, une fois le pack chargé.
  const iconUris = rows.map((row) => {
    const definition = row.icon ? icons.get(row.icon) : undefined;
    return definition ? iconDataUri(definition, colorOf(row, tokens)) : null;
  });
  const common = {
    // Le libellé français du conteneur et la liste textuelle font foi : l'aria
    // automatique d'ECharts les remplacerait par une description anglaise.
    aria: { enabled: false },
    animation: !tokens.reducedMotion,
    animationDuration: 300,
    textStyle: textStyle(tokens),
    tooltip: tooltip(currency, tokens),
  };
  if (type === "pie") {
    const legendLabels = pieLegendLabels(rows, currency);
    return {
      ...common,
      legend: {
        type: "scroll",
        bottom: 0,
        selectedMode: false,
        data: rows.map((row, index) =>
          iconUris[index]
            ? { name: row.name, icon: `image://${iconUris[index]}` }
            : { name: row.name }
        ),
        textStyle: { color: tokens.text },
        formatter: (name) => legendLabels.get(name) ?? name,
      },
      series: [
        {
          type: "pie",
          radius: ["35%", "65%"],
          center: ["50%", "42%"],
          data,
          label: { show: false },
        },
      ],
    };
  }
  return {
    ...common,
    grid: { left: 8, right: 72, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: tokens.muted },
      splitLine: { lineStyle: { color: tokens.grid } },
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: rows.map((row) => row.name),
      axisLabel: {
        color: tokens.text,
        formatter: (name, index) =>
          iconUris[index] ? `{icon${index}|} ${name}` : name,
        rich: Object.fromEntries(
          iconUris.flatMap((uri, index) =>
            uri
              ? [
                  [
                    `icon${index}`,
                    { width: 14, height: 14, backgroundColor: { image: uri } },
                  ],
                ]
              : []
          )
        ),
      },
      axisLine: { lineStyle: { color: tokens.grid } },
    },
    series: [
      {
        type: "bar",
        data,
        barMaxWidth: 24,
        label: {
          show: true,
          position: "right",
          color: tokens.text,
          formatter: ({ value }) => formatMoney(String(value), currency),
        },
      },
    ],
  };
};

/** Anneau d'atteinte globale des objectifs, pourcentage au centre. */
export const goalsRingOption = (progress, tokens) => ({
  aria: { enabled: false },
  animation: !tokens.reducedMotion,
  animationDuration: 300,
  textStyle: textStyle(tokens),
  series: [
    {
      type: "pie",
      radius: ["72%", "88%"],
      silent: true,
      startAngle: 90,
      label: {
        show: true,
        position: "center",
        formatter: `${progress.percent} %\natteint`,
        color: tokens.text,
        fontSize: 18,
        fontWeight: "bold",
        lineHeight: 24,
      },
      labelLine: { show: false },
      data: [
        {
          value: progress.percent,
          itemStyle: { color: tokens.income },
        },
        {
          value: 100 - progress.percent,
          itemStyle: { color: tokens.grid },
          label: { show: false },
        },
      ],
    },
  ],
});
