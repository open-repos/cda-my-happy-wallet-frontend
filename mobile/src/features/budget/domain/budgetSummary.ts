/**
 * Synthèse budgétaire du mois (`GET /v1/budget-periods/{mois}/summary`,
 * contrat backend `docs/budget-projection-api.md`). Les montants restent des
 * chaînes décimales; les calculs d'affichage se font en centimes.
 */

export interface BudgetForecast {
  plannedIncome: string;
  plannedExpense: string;
  goalSavings: string;
  forecastRemaining: string;
  prudentDailyAllowance: string | null;
  unresolvedCount: number;
  overdueCount: number;
}

export interface BudgetSummary {
  month: string;
  currency: string;
  status: "OPEN" | "CLOSED";
  carryIn: string;
  carryFromMonth: string | null;
  monthResult: string;
  realRemaining: string;
  remainingDays: number;
  realDailyAllowance: string | null;
  forecast: BudgetForecast | null;
}

export type AmountTone = "positive" | "negative" | "neutral";

export interface SummaryCards {
  real: {
    amount: string;
    tone: AmountTone;
    carry: { label: string; amount: string; tone: AmountTone } | null;
    monthResult: string;
    monthResultTone: AmountTone;
    help: string;
    accessibilityLabel: string;
  };
  forecast: {
    amount: string;
    tone: AmountTone;
    lines: [string, string][];
    overdue: string | null;
    accessibilityLabel: string;
  } | null;
  prudent: {
    amount: string;
    tone: AmountTone;
    help: string;
    accessibilityLabel: string;
  } | null;
}

const AMOUNT = /^-?(0|[1-9]\d{0,9})\.\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

type Json = Record<string, unknown>;

const invalid = (): never => {
  throw new Error("Invalid budget summary");
};
const isObject = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const amount = (value: unknown): string =>
  typeof value === "string" && AMOUNT.test(value) ? value : invalid();
const optionalAmount = (value: unknown): string | null =>
  value === null ? null : amount(value);
const count = (value: unknown): number =>
  Number.isInteger(value) && (value as number) >= 0
    ? (value as number)
    : invalid();
const month = (value: unknown): string =>
  typeof value === "string" && MONTH.test(value) ? value : invalid();

const parseForecast = (value: unknown): BudgetForecast | null => {
  if (value === null) return null;
  if (!isObject(value)) return invalid();
  return {
    plannedIncome: amount(value.plannedIncome),
    plannedExpense: amount(value.plannedExpense),
    goalSavings: amount(value.goalSavings),
    forecastRemaining: amount(value.forecastRemaining),
    prudentDailyAllowance: optionalAmount(value.prudentDailyAllowance),
    unresolvedCount: count(value.unresolvedCount),
    overdueCount: count(value.overdueCount),
  };
};

export const parseBudgetSummary = (value: unknown): BudgetSummary => {
  if (
    !isObject(value) ||
    !Array.isArray(value.days) ||
    value.days.length > 31 ||
    (value.status !== "OPEN" && value.status !== "CLOSED") ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency)
  ) {
    return invalid();
  }
  return {
    month: month(value.month),
    currency: value.currency,
    status: value.status,
    carryIn: amount(value.carryIn),
    carryFromMonth:
      value.carryFromMonth === null ? null : month(value.carryFromMonth),
    monthResult: amount(value.monthResult),
    realRemaining: amount(value.realRemaining),
    remainingDays: count(value.remainingDays),
    realDailyAllowance: optionalAmount(value.realDailyAllowance),
    forecast: parseForecast(value.forecast),
  };
};

/** Mois civil courant `YYYY-MM`, aligné sur l'horloge `Europe/Paris` du backend. */
export const currentParisMonth = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
  }).format(now);

const toCents = (value: string): number => {
  const [units, decimals] = value.replace("-", "").split(".");
  const cents = Number(units) * 100 + Number(decimals);
  return value.startsWith("-") ? -cents : cents;
};

const formatters = new Map<string, Intl.NumberFormat>();
/**
 * Montant en devise. Le signe est ajouté à la main : Hermes (Android)
 * n'applique pas `signDisplay: "exceptZero"` comme Node et affichait
 * « +0,00 € ». Un montant nul n'a jamais de signe.
 */
const money = (cents: number, currency: string, signed = false): string => {
  if (!formatters.has(currency)) {
    formatters.set(
      currency,
      new Intl.NumberFormat("fr-FR", { style: "currency", currency }),
    );
  }
  const absolute = formatters.get(currency)!.format(Math.abs(cents) / 100);
  if (cents < 0) return `-${absolute}`;
  return signed && cents > 0 ? `+${absolute}` : absolute;
};

const toneOf = (cents: number): AmountTone =>
  cents < 0 ? "negative" : cents > 0 ? "positive" : "neutral";

const monthName = (value: string): string =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(
    new Date(`${value}-01T00:00:00.000Z`),
  );

/** « de septembre » ou « d’août » selon l'élision française. */
const ofMonth = (value: string): string => {
  const name = monthName(value);
  return /^[aeiouy]/i.test(name) ? `d’${name}` : `de ${name}`;
};

const plural = (value: number, word: string): string =>
  `${value} ${word}${value > 1 ? "s" : ""}`;

const RESULT_HELP =
  "Le résultat du mois correspond à vos revenus et charges fixes, plus vos entrées, moins vos dépenses.";

/** Contenu des cartes : montants formatés, explications et libellés vocaux. */
export const buildSummaryCards = (summary: BudgetSummary): SummaryCards => {
  const { currency } = summary;
  const real = toCents(summary.realRemaining);
  const carryIn = toCents(summary.carryIn);
  const result = toCents(summary.monthResult);
  const carry =
    summary.carryFromMonth === null
      ? null
      : {
          label: `Report ${ofMonth(summary.carryFromMonth)}`,
          amount: money(carryIn, currency, true),
          tone: toneOf(carryIn),
        };
  const carryHelp =
    summary.carryFromMonth === null
      ? ""
      : carryIn < 0
        ? `Le déficit ${ofMonth(summary.carryFromMonth)} est déduit de ce mois. `
        : `Le reste ${ofMonth(summary.carryFromMonth)} est ajouté à ce mois. `;
  const realAmount = money(real, currency);
  const resultAmount = money(result, currency, true);

  const forecast = summary.forecast;
  let forecastCard: SummaryCards["forecast"] = null;
  let prudentCard: SummaryCards["prudent"] = null;
  if (forecast !== null) {
    const remaining = toCents(forecast.forecastRemaining);
    const lines: [string, string][] = [
      [
        "Dépenses prévues",
        money(-toCents(forecast.plannedExpense), currency, true),
      ],
      [
        "Entrées prévues",
        money(toCents(forecast.plannedIncome), currency, true),
      ],
      [
        "Épargne des objectifs",
        money(-toCents(forecast.goalSavings), currency, true),
      ],
    ];
    const amountText = money(remaining, currency);
    const overdue =
      forecast.overdueCount > 0
        ? `${plural(forecast.overdueCount, "événement")} en retard à traiter.`
        : null;
    forecastCard = {
      amount: amountText,
      tone: toneOf(remaining),
      lines,
      overdue,
      accessibilityLabel: [
        `Reste prévisionnel ${amountText}.`,
        ...lines.map(([label, value]) => `${label} ${value}.`),
        overdue ?? "",
      ]
        .join(" ")
        .trim(),
    };
    if (forecast.prudentDailyAllowance !== null) {
      const daily = toCents(forecast.prudentDailyAllowance);
      const dailyText = money(daily, currency);
      const help =
        `Votre reste prévisionnel (${amountText}) réparti sur les ${plural(
          summary.remainingDays,
          "jour",
        )} restants du mois, jour courant inclus.` +
        (daily < 0
          ? " Un montant négatif indique l’effort quotidien nécessaire pour finir le mois à l’équilibre."
          : "");
      prudentCard = {
        amount: dailyText,
        tone: toneOf(daily),
        help,
        accessibilityLabel: `Disponible prudent par jour ${dailyText}. ${help}`,
      };
    }
  }

  return {
    real: {
      amount: realAmount,
      tone: toneOf(real),
      carry,
      monthResult: resultAmount,
      monthResultTone: toneOf(result),
      help: `${carryHelp}${RESULT_HELP}`,
      accessibilityLabel: [
        `Reste réel ${realAmount}.`,
        carry ? `${carry.label} ${carry.amount}.` : "",
        `Résultat du mois ${resultAmount}.`,
        `${carryHelp}${RESULT_HELP}`.trim(),
      ]
        .filter(Boolean)
        .join(" "),
    },
    forecast: forecastCard,
    prudent: prudentCard,
  };
};
