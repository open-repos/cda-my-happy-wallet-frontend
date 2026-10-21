const AMOUNT_FIELDS = [
  "fixedIncome",
  "fixedExpense",
  "base",
  "carryIn",
  "plannedIncome",
  "plannedExpense",
  "goalSavings",
  "forecastResult",
  "forecastRemaining",
  "prudentDailyAllowance",
  "prudentWeeklyAllowance",
  "prudentMonthlyAllowance",
] as const;
type AmountField = (typeof AMOUNT_FIELDS)[number];

export type ForecastMonth = Record<AmountField, string> & {
  month: string;
  remainingDays: number;
};

/** Prévision multi-mois, contrat `GET /v1/budget-forecast` partagé avec le Web. */
export interface BudgetForecast {
  from: string;
  currency: string;
  referenceDate: string;
  currentRealRemaining: string;
  months: ForecastMonth[];
}

export const MAX_FORECAST_MONTHS = 24;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isForecastMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);

/** Montant signé à deux décimales, entier en centimes sûr (règle du Web). */
export const isForecastAmount = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^-?(0|[1-9]\d{0,13})\.\d{2}$/.test(value))
    return false;
  const [whole, fraction] = value.replace(/^-/, "").split(".");
  return Number.isSafeInteger(Number(whole) * 100 + Number(fraction));
};

const isForecastDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

export const shiftMonth = (month: string, offset: number): string => {
  const index =
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + offset;
  return `${String(Math.floor(index / 12)).padStart(4, "0")}-${String(
    (index % 12) + 1,
  ).padStart(2, "0")}`;
};

/** Signe lu sur le texte : pas d'arrondi de nombre à virgule flottante. */
export const isNegativeAmount = (amount: string): boolean =>
  amount.startsWith("-") && /[1-9]/.test(amount);

const invalid = (): never => {
  throw new Error("Invalid budget forecast response");
};

export const parseBudgetForecast = (value: unknown): BudgetForecast => {
  if (
    !isRecord(value) ||
    !isForecastMonth(value.from) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    !isForecastDate(value.referenceDate) ||
    !isForecastAmount(value.currentRealRemaining) ||
    !Array.isArray(value.months) ||
    value.months.length > MAX_FORECAST_MONTHS
  ) {
    return invalid();
  }
  const from = value.from;
  const months = value.months.map((item: unknown, index): ForecastMonth => {
    if (
      !isRecord(item) ||
      item.month !== shiftMonth(from, index) ||
      !AMOUNT_FIELDS.every((field) => isForecastAmount(item[field])) ||
      !Number.isInteger(item.remainingDays) ||
      Number(item.remainingDays) < 1 ||
      Number(item.remainingDays) > 31
    ) {
      return invalid();
    }
    return {
      month: item.month,
      ...(Object.fromEntries(
        AMOUNT_FIELDS.map((field) => [field, item[field]]),
      ) as Record<AmountField, string>),
      remainingDays: Number(item.remainingDays),
    };
  });
  return {
    from,
    currency: value.currency,
    referenceDate: value.referenceDate,
    currentRealRemaining: value.currentRealRemaining,
    months,
  };
};
