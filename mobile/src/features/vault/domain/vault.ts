import { isCalendarDate } from "@/src/features/operations/domain/oneOffOperation";

/**
 * Coffre mobile (#419) : contrat `savings-accounts.md` du backend #183,
 * identique au Web (#395). Les montants sont des centimes entiers ; soldes,
 * totaux et progression viennent toujours du serveur.
 */
export const MAX_MINOR_UNITS = 9_999_999_999;

export interface SavingsAccount {
  id: number;
  name: string;
  currency: string;
  initialBalanceMinorUnits: number;
  balanceMinorUnits: number;
  archived: boolean;
  goalId: number | null;
}

export type TransferDirection = "TO_SAVINGS" | "FROM_SAVINGS";
const REASONS = ["MANUAL", "GOAL", "MONTH_END", "NEGATIVE_COVERAGE"] as const;
export type TransferReason = (typeof REASONS)[number];

export interface SavingsMovement {
  id: number;
  accountId: number;
  currency: string;
  direction: TransferDirection;
  amountMinorUnits: number;
  operationDate: string;
  reason: TransferReason;
  /** Décision de fin de mois (#420) : révision liée et compensation. */
  monthEndRevision: number | null;
  isCompensation: boolean;
}

const BUDGET_KEYS = [
  "baseMinorUnits",
  "carryInMinorUnits",
  "actualIncomeMinorUnits",
  "actualExpenseMinorUnits",
] as const;
export type BudgetKey = (typeof BUDGET_KEYS)[number];

/** Budget disponible de l'application : pas un solde bancaire connecté. */
export interface CurrentAccount {
  month: string;
  currency: string;
  balanceMinorUnits: number;
  budget: Record<BudgetKey, number>;
}

const SOURCES = ["OPERATION", "VIREMENT", "EXCEPTIONAL_INCOME"] as const;
const KINDS = ["DEPENSE", "ENTREE", "VIREMENT"] as const;

export interface CurrentMovement {
  id: number;
  /** Une opération et un virement peuvent partager le même `id`. */
  key: string;
  source: (typeof SOURCES)[number];
  kind: (typeof KINDS)[number];
  title: string;
  signedAmountMinorUnits: number;
  operationDate: string;
  currency: string;
  accountId: number | null;
}

type Fields = Record<string, unknown>;
const invalid = (): never => {
  throw new Error("Invalid savings API response");
};
const isRecord = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null;
const isId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;
const isCents = (value: unknown): value is number =>
  Number.isSafeInteger(value) &&
  Number(value) >= 0 &&
  Number(value) <= MAX_MINOR_UNITS;
const isCurrency = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Z]{3}$/.test(value);
const isMonth = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const isDate = (value: unknown): value is string =>
  typeof value === "string" && value >= "1000-01-01" && isCalendarDate(value);
const oneOf = <T extends string>(
  values: readonly T[],
  value: unknown,
): value is T => values.includes(value as T);
const isValidName = (name: string) =>
  name.trim().length >= 2 && [...name.trim()].length <= 50;

export const parseSavingsAccount = (value: unknown): SavingsAccount => {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    typeof value.name !== "string" ||
    !isValidName(value.name) ||
    !isCurrency(value.currency) ||
    !isCents(value.initialBalanceMinorUnits) ||
    !isCents(value.balanceMinorUnits) ||
    typeof value.archived !== "boolean" ||
    !(value.goalId === null || isId(value.goalId))
  ) {
    return invalid();
  }
  return {
    id: value.id,
    name: value.name,
    currency: value.currency,
    initialBalanceMinorUnits: value.initialBalanceMinorUnits,
    balanceMinorUnits: value.balanceMinorUnits,
    archived: value.archived,
    goalId: value.goalId,
  };
};

export const parseSavingsMovement = (value: unknown): SavingsMovement => {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !isId(value.accountId) ||
    !isCurrency(value.currency) ||
    value.type !== "VIREMENT" ||
    !oneOf(["TO_SAVINGS", "FROM_SAVINGS"] as const, value.direction) ||
    !isCents(value.amountMinorUnits) ||
    value.amountMinorUnits === 0 ||
    !isDate(value.operationDate) ||
    !oneOf(REASONS, value.reason) ||
    !(value.monthEndRevision == null || isId(value.monthEndRevision)) ||
    !(
      value.isCompensation === undefined ||
      typeof value.isCompensation === "boolean"
    )
  ) {
    return invalid();
  }
  return {
    id: value.id,
    accountId: value.accountId,
    currency: value.currency,
    direction: value.direction,
    amountMinorUnits: value.amountMinorUnits,
    operationDate: value.operationDate,
    reason: value.reason,
    monthEndRevision: value.monthEndRevision ?? null,
    isCompensation: value.isCompensation ?? false,
  };
};

export const parseCurrentAccount = (value: unknown): CurrentAccount => {
  if (
    !isRecord(value) ||
    value.type !== "CURRENT" ||
    value.balanceBasis !== "AVAILABLE_BUDGET" ||
    !isMonth(value.month) ||
    !isCurrency(value.currency) ||
    !Number.isSafeInteger(value.balanceMinorUnits) ||
    !isRecord(value.budget)
  ) {
    return invalid();
  }
  const budget = value.budget;
  if (!BUDGET_KEYS.every((key) => Number.isSafeInteger(budget[key]))) {
    return invalid();
  }
  return {
    month: value.month,
    currency: value.currency,
    balanceMinorUnits: Number(value.balanceMinorUnits),
    budget: Object.fromEntries(
      BUDGET_KEYS.map((key) => [key, Number(budget[key])]),
    ) as Record<BudgetKey, number>,
  };
};

export const parseCurrentMovement = (value: unknown): CurrentMovement => {
  if (
    !isRecord(value) ||
    !isId(value.id) ||
    !oneOf(SOURCES, value.source) ||
    !oneOf(KINDS, value.kind) ||
    (value.source === "EXCEPTIONAL_INCOME" &&
      (value.kind !== "ENTREE" || value.accountId !== null)) ||
    typeof value.title !== "string" ||
    !Number.isSafeInteger(value.signedAmountMinorUnits) ||
    !isDate(value.operationDate) ||
    !isCurrency(value.currency) ||
    !(value.accountId === null || isId(value.accountId))
  ) {
    return invalid();
  }
  return {
    id: value.id,
    key: `${value.source}:${value.id}`,
    source: value.source,
    kind: value.kind,
    title: value.title,
    signedAmountMinorUnits: Number(value.signedAmountMinorUnits),
    operationDate: value.operationDate,
    currency: value.currency,
    accountId: value.accountId,
  };
};

/**
 * Saisie → centimes entiers, sans calcul flottant. Virgule ou point, deux
 * décimales au plus, espaces de milliers tolérés ; `null` si refusée.
 */
export const parseAmountInput = (entry: string): number | null => {
  const match = /^(\d{1,10})(?:[.,](\d{1,2}))?$/.exec(
    entry.replace(/[\s  ]/g, ""),
  );
  if (match === null) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return cents <= MAX_MINOR_UNITS ? cents : null;
};

/** Le signe est écrit ici : `signDisplay` manque à certains moteurs natifs. */
export const formatVaultMoney = (
  minorUnits: number,
  currency: string,
  signed = false,
) =>
  `${signed && minorUnits > 0 ? "+" : ""}${new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100)}`;

const PARIS_OFFSETS = [1, 2] as const;
/** Jour civil à Paris, comme le serveur, sans dépendre d'`Intl` natif. */
export const vaultToday = (now: Date = new Date()): string => {
  const year = now.getUTCFullYear();
  // Heure d'été : du dernier dimanche de mars au dernier d'octobre, 1 h UTC.
  const lastSunday = (month: number) => {
    const end = new Date(Date.UTC(year, month + 1, 0, 1));
    return end.getTime() - end.getUTCDay() * 86_400_000;
  };
  const summer =
    now.getTime() >= lastSunday(2) && now.getTime() < lastSunday(9);
  const offset = PARIS_OFFSETS[summer ? 1 : 0];
  return new Date(now.getTime() + offset * 3_600_000)
    .toISOString()
    .slice(0, 10);
};

/** Mois voisin `AAAA-MM`, `null` au-delà du mois courant (pas de mois futur). */
export const shiftMonth = (
  month: string,
  delta: -1 | 1,
  currentMonth: string,
): string | null => {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
  const next = index + delta;
  const shifted = `${Math.floor(next / 12)}-${`${(next % 12) + 1}`.padStart(2, "0")}`;
  return shifted > currentMonth || shifted < "1970-01" ? null : shifted;
};

type Validation<T, K extends string> =
  | { ok: true; value: T }
  | { ok: false; errors: Partial<Record<K, string>> };

const NAME_ERROR = "Le nom doit contenir entre 2 et 50 caractères.";
export const validateAccountName = (name: string): string | null =>
  isValidName(name) ? null : NAME_ERROR;

export interface AccountDraft {
  name: string;
  currency: string;
  initialBalance: string;
}
export interface NewAccount {
  name: string;
  currency: string;
  initialBalanceMinorUnits: number;
}

export const validateAccountDraft = (
  draft: AccountDraft,
): Validation<NewAccount, keyof AccountDraft> => {
  const errors: Partial<Record<keyof AccountDraft, string>> = {};
  const currency = draft.currency.trim().toUpperCase();
  const cents = parseAmountInput(draft.initialBalance);
  if (!isValidName(draft.name)) errors.name = NAME_ERROR;
  if (!isCurrency(currency)) {
    errors.currency = "Indiquez une devise sur trois lettres, par exemple EUR.";
  }
  if (cents === null) {
    errors.initialBalance =
      "Saisissez un solde positif ou nul avec au plus deux décimales.";
  }
  return cents === null || Object.keys(errors).length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: {
          name: draft.name.trim(),
          currency,
          initialBalanceMinorUnits: cents,
        },
      };
};

export interface TransferDraft {
  direction: "deposit" | "withdraw";
  amount: string;
  /** `AAAA-MM-JJ`. */
  date: string;
}
export interface TransferAttempt {
  direction: TransferDirection;
  amountMinorUnits: number;
  operationDate: string;
  idempotencyKey: string;
}

export const validateTransferDraft = (
  draft: TransferDraft,
  today: string,
  createKey: () => string,
): Validation<TransferAttempt, "amount" | "date"> => {
  const errors: Partial<Record<"amount" | "date", string>> = {};
  const cents = parseAmountInput(draft.amount);
  if (cents === null || cents <= 0) {
    errors.amount =
      "Saisissez un montant strictement positif avec au plus deux décimales.";
  }
  if (!isDate(draft.date) || draft.date > today) {
    errors.date = "Choisissez une date valide, au plus tard aujourd’hui.";
  }
  return cents === null || Object.keys(errors).length > 0
    ? { ok: false, errors }
    : {
        ok: true,
        value: {
          direction:
            draft.direction === "deposit" ? "TO_SAVINGS" : "FROM_SAVINGS",
          amountMinorUnits: cents,
          operationDate: draft.date,
          idempotencyKey: createKey(),
        },
      };
};

const REASON_LABELS: Record<TransferReason, string> = {
  MANUAL: "Virement manuel",
  GOAL: "Versement mensuel",
  MONTH_END: "Épargne de fin de mois",
  NEGATIVE_COVERAGE: "Couverture d’un déficit",
};

export const savingsMovementLabels = (movement: SavingsMovement) => ({
  title: movement.isCompensation
    ? `Correction : ${REASON_LABELS[movement.reason].toLowerCase()}`
    : REASON_LABELS[movement.reason],
  kind: movement.direction === "TO_SAVINGS" ? "Dépôt" : "Retrait",
});

export const signedMovementAmount = (movement: SavingsMovement) =>
  movement.direction === "TO_SAVINGS"
    ? movement.amountMinorUnits
    : -movement.amountMinorUnits;

const KIND_LABELS = {
  VIREMENT: "Virement",
  ENTREE: "Entrée",
  DEPENSE: "Dépense",
} as const;

export const currentMovementLabels = (movement: CurrentMovement) =>
  movement.source === "EXCEPTIONAL_INCOME"
    ? "Entrée exceptionnelle de fin de mois"
    : KIND_LABELS[movement.kind];

export const BUDGET_LABELS: readonly (readonly [BudgetKey, string])[] = [
  ["baseMinorUnits", "Base fixe"],
  ["carryInMinorUnits", "Report"],
  ["actualIncomeMinorUnits", "Entrées réelles"],
  ["actualExpenseMinorUnits", "Sorties réelles"],
];

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_SAVINGS: "Le solde de ce compte ne suffit pas pour ce retrait.",
  ACCOUNT_ARCHIVED:
    "Ce compte est archivé. Actualisez le Coffre pour consulter son état.",
  GOAL_ALREADY_LINKED:
    "Ce compte ou cet objectif est déjà rattaché. Actualisez les données.",
  CURRENCY_MISMATCH: "Le compte et l’objectif doivent avoir la même devise.",
  OPENING_BALANCE_CONFLICT:
    "Cet objectif possède déjà une épargne. Rattachez-le à un compte vierge, sans solde initial ni mouvement.",
  IDEMPOTENCY_CONFLICT:
    "Cette tentative correspond à un autre virement. Vérifiez l’historique avant toute nouvelle opération.",
  BALANCE_LIMIT: "Le solde maximal autorisé serait dépassé.",
  NOT_FOUND:
    "Ce compte ou cet objectif n’est plus disponible. Actualisez le Coffre.",
  INVALID_DATE: "Choisissez une date valide, au plus tard aujourd’hui.",
  INVALID_AMOUNT:
    "Saisissez un montant strictement positif avec au plus deux décimales.",
};

/** Refus métier expliqué avec les textes du Web (#395). */
export const vaultErrorMessage = (code: string | null, fallback: string) =>
  (code !== null && ERROR_MESSAGES[code]) || fallback;

/** Objectifs proposés au rattachement : même devise, sans compte. */
export const eligibleGoals = <
  T extends { currency: string; savingsAccountId: number | null },
>(
  goals: readonly T[],
  currency: string,
) =>
  goals.filter(
    (goal) => goal.savingsAccountId === null && goal.currency === currency,
  );
