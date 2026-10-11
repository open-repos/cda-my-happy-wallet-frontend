import {
  BudgetDay,
  money,
  toCents,
} from "@/src/features/budget/domain/budgetSummary";

/** Contenu affiché dans chaque jour de la grille. */
export type CalendarMode = "markers" | "expenses" | "forecast";

export const CALENDAR_MODES: { value: CalendarMode; label: string }[] = [
  { value: "markers", label: "Repères" },
  { value: "expenses", label: "Dépenses" },
  { value: "forecast", label: "Prévisionnel" },
];

export interface CalendarCell {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
}

export interface DayCell {
  value: string | null;
  markers: { operation: boolean; planned: boolean };
  accessibilityLabel: string;
}

// Noms en dur : le moteur Hermes ne garantit pas toutes les options d'Intl.
const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
export const WEEKDAY_LABELS = [
  { short: "L", long: "lundi" },
  { short: "M", long: "mardi" },
  { short: "M", long: "mercredi" },
  { short: "J", long: "jeudi" },
  { short: "V", long: "vendredi" },
  { short: "S", long: "samedi" },
  { short: "D", long: "dimanche" },
];

const DAY_MS = 86400000;
const pad = (value: number) => `${value}`.padStart(2, "0");
const toTime = (date: string) => Date.parse(`${date}T00:00:00.000Z`);
const toDate = (time: number) => new Date(time).toISOString().slice(0, 10);

export const shiftMonth = (month: string, offset: number): string => {
  const index =
    Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1 + offset;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
};

export const monthTitle = (month: string): string =>
  `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

export const longDate = (date: string): string =>
  `${Number(date.slice(8, 10))} ${MONTH_NAMES[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;

export const monthBounds = (month: string): { from: string; to: string } => {
  const next = toTime(`${shiftMonth(month, 1)}-01`);
  return { from: `${month}-01`, to: toDate(next - DAY_MS) };
};

/** Six semaines commençant le lundi, calculées en UTC (dates civiles). */
export const monthGrid = (month: string, today: string): CalendarCell[] => {
  const first = toTime(`${month}-01`);
  const offset = (new Date(first).getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => {
    const date = toDate(first + (index - offset) * DAY_MS);
    return {
      date,
      day: Number(date.slice(8, 10)),
      inMonth: date.slice(0, 7) === month,
      isToday: date === today,
    };
  });
};

/** Valeur courte pour une case : euros arrondis, ou milliers « 1,3 k ». */
export const abbreviateAmount = (cents: number): string => {
  const euros = Math.abs(cents) / 100;
  const rounded = Math.round(euros);
  // Pas de « -0 » pour un montant arrondi à zéro.
  const sign = cents < 0 && rounded > 0 ? "-" : "";
  // 999,50 € s'arrondit à 1 000 € : il passe en milliers (« 1 k »).
  if (rounded < 1000) return `${sign}${rounded}`;
  const thousands = Math.round(euros / 100) / 10;
  return `${sign}${`${thousands}`.replace(".", ",")} k`;
};

const plural = (value: number, word: string) =>
  `${value} ${word}${value > 1 ? "s" : ""}`;

export const dayCell = (
  date: string,
  day: BudgetDay | undefined,
  mode: CalendarMode,
  currency: string,
  loading = false,
): DayCell => {
  if (loading) {
    // Données en cours de chargement : ne rien affirmer sur le jour.
    return {
      value: null,
      markers: { operation: false, planned: false },
      accessibilityLabel: `${longDate(date)}. Chargement.`,
    };
  }
  const expense = day ? toCents(day.expense) : 0;
  const income = day ? toCents(day.income) : 0;
  const planned = day?.plannedCount ?? 0;
  const forecast =
    day?.forecastRemaining == null ? null : toCents(day.forecastRemaining);

  const parts = [`${longDate(date)}.`];
  if (expense > 0) parts.push(`Dépenses ${money(expense, currency)}.`);
  if (income > 0) parts.push(`Entrées ${money(income, currency)}.`);
  if (expense === 0 && income === 0) parts.push("Aucune opération.");
  if (planned > 0)
    parts.push(
      `${plural(planned, "événement")} prévu${planned > 1 ? "s" : ""}.`,
    );
  if (mode === "forecast" && forecast !== null) {
    parts.push(`Reste prévisionnel ${money(forecast, currency)}.`);
  }

  let value: string | null = null;
  if (mode === "expenses" && expense > 0) value = abbreviateAmount(-expense);
  if (mode === "forecast" && forecast !== null)
    value = abbreviateAmount(forecast);

  return {
    value,
    markers: { operation: expense > 0 || income > 0, planned: planned > 0 },
    accessibilityLabel: parts.join(" "),
  };
};
