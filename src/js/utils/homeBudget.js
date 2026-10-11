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

const floorPercent = (part, total) =>
  total > 0 ? Math.min(100, Math.floor((part * 100) / total)) : 0;

/**
 * Montant affiché pour la période choisie : le reste réel pour le mois, la
 * part du disponible prudent pour la semaine (au plus 7 jours, bornée aux
 * jours restants du mois) et pour le jour. Sans prévisionnel, le disponible
 * réel par jour sert de base.
 */
export const periodRemaining = (summary, period) => {
  if (period === "mois") {
    return { amount: summary.realRemaining, basis: "real", days: null };
  }
  const prudent = summary.forecast?.prudentDailyAllowance ?? null;
  const daily = prudent ?? summary.realDailyAllowance;
  const basis = prudent === null ? "real" : "prudent";
  const days =
    period === "semaine"
      ? Math.min(WEEK_DAYS, summary.remainingDays)
      : Math.min(1, summary.remainingDays);
  if (daily === null || days === 0) return { amount: null, basis, days };
  return { amount: toAmount(toCents(daily) * days), basis, days };
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
  const rows = [...totals.entries()]
    .map(([id, cents]) => ({
      id,
      name: byId.get(id)?.name ?? "Autre catégorie",
      color: byId.get(id)?.color ?? null,
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
