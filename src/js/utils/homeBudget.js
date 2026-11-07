import { paletteIndexOf, paletteRanks } from "./categoryPalette";

/**
 * Calculs d'affichage de l'accueil. Les montants API sont des chaînes
 * décimales à deux chiffres : tout calcul se fait en centimes entiers.
 */

const WEEK_DAYS = 7;

const toCents = (amount) => {
  const [units, decimals = "00"] = amount.replace("-", "").split(".");
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, "0"));
  return amount.startsWith("-") ? -cents : cents;
};

const toAmount = (cents) => {
  const sign = cents < 0 ? "-" : "";
  const absolute = Math.abs(cents);
  return `${sign}${Math.floor(absolute / 100)}.${String(
    absolute % 100
  ).padStart(2, "0")}`;
};

const daysInMonth = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
};

const periodDays = (summary, period) =>
  period === "semaine"
    ? Math.min(WEEK_DAYS, summary.remainingDays)
    : period === "jour"
    ? Math.min(1, summary.remainingDays)
    : null;

const floorPercent = (part, total) =>
  total > 0 ? Math.min(100, Math.floor((part * 100) / total)) : 0;

/**
 * Montant affiché pour la période choisie : le reste prévisionnel fourni par
 * le serveur pour le mois, puis la part du disponible prudent pour la semaine
 * (au plus 7 jours, bornée aux jours restants du mois) et pour le jour. Sans
 * prévisionnel, le disponible réel sert de base.
 */
export const periodRemaining = (summary, period) => {
  if (period === "mois") {
    return summary.forecast
      ? {
          amount: summary.forecast.forecastRemaining,
          basis: "prudent",
          days: null,
        }
      : { amount: summary.realRemaining, basis: "real", days: null };
  }
  const prudent = summary.forecast?.prudentDailyAllowance ?? null;
  const daily = prudent ?? summary.realDailyAllowance;
  const basis = prudent === null ? "real" : "prudent";
  const days = periodDays(summary, period);
  if (daily === null || days === 0) return { amount: null, basis, days };
  return { amount: toAmount(toCents(daily) * days), basis, days };
};

/** Part théorique issue du socle serveur, proratisée pour la présentation. */
export const theoreticalPeriod = (summary, period) => {
  if (period === "mois") return { amount: summary.base, days: null };
  const days = periodDays(summary, period);
  if (days === 0) return { amount: null, days };
  const daily = Math.round(toCents(summary.base) / daysInMonth(summary.month));
  return { amount: toAmount(daily * days), days };
};

export const theoreticalDailyShare = (summary) =>
  toAmount(Math.round(toCents(summary.base) / daysInMonth(summary.month)));

/** Socle théorique acquis du premier jour à la date incluse. */
export const theoreticalToDate = (summary, date) => {
  const day = Number(date.slice(8, 10));
  const accrued = Math.round(
    (toCents(summary.base) * day) / daysInMonth(summary.month)
  );
  return { amount: toAmount(accrued), day };
};

/** Valeurs de comparaison affichées sans reconstruire le budget serveur. */
export const budgetComparison = (summary, period) => {
  const actual = periodRemaining(summary, period);
  const theoretical = theoreticalPeriod(summary, period);
  if (actual.amount === null || theoretical.amount === null)
    return { actual, theoretical, difference: null, progress: null };
  const actualCents = toCents(actual.amount);
  const theoreticalCents = toCents(theoretical.amount);
  return {
    actual,
    theoretical,
    difference: toAmount(actualCents - theoreticalCents),
    progress:
      theoreticalCents > 0
        ? Math.max(
            0,
            Math.min(100, Math.round((actualCents * 100) / theoreticalCents))
          )
        : 0,
  };
};

const signedExpense = (amount) => toAmount(-Math.abs(toCents(amount)));

/** Cascade composée exclusivement des montants fournis par le résumé serveur. */
export const calculationBreakdown = (summary) => {
  const rows = [
    { key: "base", label: "Reste à vivre théorique", amount: summary.base },
    {
      key: "actualIncome",
      label: "Entrées déjà reçues",
      amount: summary.actualIncome,
    },
    {
      key: "actualExpense",
      label: "Dépenses déjà faites",
      amount: signedExpense(summary.actualExpense),
    },
    ...(summary.reconciliationAdjustment === undefined
      ? []
      : [
          {
            key: "reconciliationAdjustment",
            label: "Rapprochement des enveloppes",
            amount: summary.reconciliationAdjustment,
          },
        ]),
    {
      key: "carryIn",
      label: "Report du mois précédent",
      amount: summary.carryIn,
    },
  ];
  if (summary.forecast) {
    rows.push(
      {
        key: "plannedIncome",
        label: "Entrées prévues",
        amount: summary.forecast.plannedIncome,
      },
      {
        key: "plannedExpense",
        label: "Dépenses prévues",
        amount: signedExpense(summary.forecast.plannedExpense),
      },
      {
        key: "goalSavings",
        label: "Épargne des objectifs",
        amount: signedExpense(summary.forecast.goalSavings),
      }
    );
    if (summary.forecast.envelopeReserve !== undefined)
      rows.push({
        key: "envelopeReserve",
        label: "Réserve des enveloppes",
        amount: signedExpense(summary.forecast.envelopeReserve),
      });
  }
  rows.push({
    key: "actualized",
    label: "Reste à vivre actualisé",
    amount: summary.forecast?.forecastRemaining ?? summary.realRemaining,
  });
  return rows;
};

/** Dépenses réelles du mois regroupées par catégorie, la plus forte d'abord. */
export const expensesByCategory = (operations, categories, currency) => {
  const totals = new Map();
  operations
    .filter(
      (operation) =>
        operation.type === "DEPENSE" && operation.currency === currency
    )
    .forEach((operation) => {
      totals.set(
        operation.categoryId,
        (totals.get(operation.categoryId) ?? 0) + toCents(operation.amount)
      );
    });
  const byId = new Map(categories.map((category) => [category.id, category]));
  const ranks = paletteRanks(categories);
  const rows = [...totals.entries()]
    .map(([id, cents]) => ({
      id,
      name: byId.get(id)?.name ?? "Autre catégorie",
      color: byId.get(id)?.color ?? null,
      icon: byId.get(id)?.icon ?? null,
      paletteIndex: paletteIndexOf(ranks, id),
      cents,
    }))
    .sort((left, right) => right.cents - left.cents || left.id - right.id);
  const largest = rows[0]?.cents ?? 0;
  return rows.map(({ cents, ...row }) => ({
    ...row,
    amount: toAmount(cents),
    share: cents / largest,
  }));
};

/**
 * Progression des objectifs d'une devise. Le taux global plafonne chaque
 * objectif à sa cible et arrondit à l'inférieur : 99,99 % reste « 99 % ».
 */
export const goalsProgress = (goals, currency) => {
  const sameCurrency = goals.filter((goal) => goal.currency === currency);
  if (sameCurrency.length === 0) return null;
  let saved = 0;
  let counted = 0;
  let target = 0;
  const rows = sameCurrency.map((goal) => {
    const goalSaved = toCents(goal.savedAmount);
    const goalTarget = toCents(goal.targetAmount);
    saved += goalSaved;
    counted += Math.min(goalSaved, goalTarget);
    target += goalTarget;
    return {
      id: goal.id,
      title: goal.title,
      saved: goal.savedAmount,
      target: goal.targetAmount,
      percent: floorPercent(goalSaved, goalTarget),
    };
  });
  return {
    saved: toAmount(saved),
    target: toAmount(target),
    percent: floorPercent(counted, target),
    goals: rows,
  };
};
