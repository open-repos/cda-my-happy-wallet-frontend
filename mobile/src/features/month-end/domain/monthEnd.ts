import {
  MAX_MINOR_UNITS,
  SavingsAccount,
  formatVaultMoney,
  parseAmountInput,
  vaultToday,
} from "@/src/features/vault/domain/vault";

/**
 * Décision de fin de mois mobile (#420) : contrat `month-end-decisions.md`
 * du backend #184, mêmes règles et textes que le Web (#396). Le serveur reste
 * l'autorité ; ce module prépare la saisie et l'aperçu, en centimes entiers :
 * report = solde avant décision − épargne + prélèvements + entrée exceptionnelle.
 */
export interface Allocation {
  accountId: number;
  amountMinorUnits: number;
}

export interface DecisionPlan {
  savings: Allocation[];
  coverage: Allocation[];
  exceptionalIncomeMinorUnits: number;
}

export interface MonthEndDecision extends DecisionPlan {
  month: string;
  currency: string;
  status: "PENDING" | "DECIDED";
  revision: number;
  savingsMinorUnits: number;
  coverageMinorUnits: number;
  referenceResultMinorUnits: number;
  resultBeforeDecisionMinorUnits: number;
  carryMinorUnits: number;
  requiresReview: boolean;
  correctionDeltaMinorUnits: number;
}

type Fields = Record<string, unknown>;
const invalid = (): never => {
  throw new Error("Invalid month-end decision response");
};
const isRecord = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null;
const isId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;
const isCents = (value: unknown): value is number =>
  Number.isSafeInteger(value) &&
  Number(value) >= 0 &&
  Number(value) <= MAX_MINOR_UNITS;
const isSigned = (value: unknown): value is number =>
  Number.isSafeInteger(value);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const isMonth = (value: unknown): value is string =>
  typeof value === "string" && MONTH.test(value);

const parseAllocations = (value: unknown): Allocation[] => {
  if (!Array.isArray(value) || value.length > 100) return invalid();
  return value.map((row: unknown) =>
    isRecord(row) &&
    isId(row.accountId) &&
    isCents(row.amountMinorUnits) &&
    row.amountMinorUnits > 0
      ? { accountId: row.accountId, amountMinorUnits: row.amountMinorUnits }
      : invalid(),
  );
};

export const parseMonthEndDecision = (value: unknown): MonthEndDecision => {
  if (
    !isRecord(value) ||
    !isMonth(value.month) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    (value.status !== "PENDING" && value.status !== "DECIDED") ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    ![
      value.savingsMinorUnits,
      value.coverageMinorUnits,
      value.exceptionalIncomeMinorUnits,
    ].every(isCents) ||
    ![
      value.resultBeforeDecisionMinorUnits,
      value.referenceResultMinorUnits,
      value.carryMinorUnits,
      value.correctionDeltaMinorUnits,
    ].every(isSigned) ||
    typeof value.requiresReview !== "boolean"
  ) {
    return invalid();
  }
  return {
    month: value.month,
    currency: value.currency,
    status: value.status,
    revision: Number(value.revision),
    savings: parseAllocations(value.savings),
    coverage: parseAllocations(value.coverage),
    exceptionalIncomeMinorUnits: Number(value.exceptionalIncomeMinorUnits),
    savingsMinorUnits: Number(value.savingsMinorUnits),
    coverageMinorUnits: Number(value.coverageMinorUnits),
    referenceResultMinorUnits: Number(value.referenceResultMinorUnits),
    resultBeforeDecisionMinorUnits: Number(
      value.resultBeforeDecisionMinorUnits,
    ),
    carryMinorUnits: Number(value.carryMinorUnits),
    requiresReview: value.requiresReview,
    correctionDeltaMinorUnits: Number(value.correctionDeltaMinorUnits),
  };
};

/* ---------- Mois ---------- */

/** Mois `AAAA-MM` décalé de `offset` mois. */
export const addMonths = (month: string, offset: number): string => {
  const index = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
  const next = index + offset;
  return `${String(Math.floor(next / 12)).padStart(4, "0")}-${String(
    (next % 12) + 1,
  ).padStart(2, "0")}`;
};

/** Mois clos le plus récent selon la date civile `Europe/Paris`. */
export const previousParisMonth = (now: Date = new Date()): string =>
  addMonths(vaultToday(now).slice(0, 7), -1);

/** Un mois courant, futur ou mal formé n'est jamais décidable. */
export const isDecidableMonth = (
  month: string | undefined,
  now: Date = new Date(),
): month is string => isMonth(month) && month <= previousParisMonth(now);

// Liste fixe : `Intl` natif ne garantit pas les noms de mois français.
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
] as const;

/** « octobre ». */
export const monthName = (month: string) =>
  MONTH_NAMES[Number(month.slice(5)) - 1];
/** « octobre 2026 ». */
export const monthLabel = (month: string) =>
  `${monthName(month)} ${month.slice(0, 4)}`;
const elide = (text: string) =>
  /^[aeiouy]/i.test(text) ? `d’${text}` : `de ${text}`;
/** « d’octobre » ou « de septembre ». */
export const ofMonth = (month: string) => elide(monthName(month));
/** « d’octobre 2026 ». */
export const ofMonthLabel = (month: string) => elide(monthLabel(month));
export const capitalize = (text: string) =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/* ---------- Aperçu ---------- */

const total = (rows: readonly Allocation[]) =>
  rows.reduce((sum, row) => sum + row.amountMinorUnits, 0);

export const previewCarry = (result: number, plan: DecisionPlan) =>
  result -
  total(plan.savings) +
  total(plan.coverage) +
  plan.exceptionalIncomeMinorUnits;

export const planOf = (decision: MonthEndDecision): DecisionPlan => ({
  savings: decision.savings,
  coverage: decision.coverage,
  exceptionalIncomeMinorUnits: decision.exceptionalIncomeMinorUnits,
});

/** Report connu au moment de la décision, avant la correction signalée. */
export const carryBeforeCorrection = (decision: MonthEndDecision) =>
  decision.carryMinorUnits - decision.correctionDeltaMinorUnits;

/** « Garder ma décision » : même sens et plafond respecté. */
export const canKeepDecision = (decision: MonthEndDecision) => {
  const result = decision.resultBeforeDecisionMinorUnits;
  const covered =
    decision.coverageMinorUnits + decision.exceptionalIncomeMinorUnits;
  if (result > 0) return covered === 0 && decision.savingsMinorUnits <= result;
  if (result < 0) return decision.savingsMinorUnits === 0 && covered <= -result;
  return decision.savingsMinorUnits === 0 && covered === 0;
};

/** Une décision n'est proposée que pour un solde non nul encore en attente. */
export const needsDecision = (decision: MonthEndDecision | null) =>
  decision?.status === "PENDING" &&
  decision.resultBeforeDecisionMinorUnits !== 0;

/* ---------- Saisie ---------- */

export type DecisionMode = "carry" | "all" | "split" | "cover";

export interface DecisionDraft {
  mode: DecisionMode;
  /** Saisie par identifiant de compte. */
  amounts: Record<number, string>;
  exceptional: string;
}

export const emptyDraft = (): DecisionDraft => ({
  mode: "carry",
  amounts: {},
  exceptional: "",
});

export const decisionMode = (decision: MonthEndDecision): DecisionMode => {
  const result = decision.resultBeforeDecisionMinorUnits;
  if (result < 0) {
    return decision.coverageMinorUnits + decision.exceptionalIncomeMinorUnits >
      0
      ? "cover"
      : "carry";
  }
  if (decision.savingsMinorUnits === 0) return "carry";
  return decision.savingsMinorUnits === result ? "all" : "split";
};

/** Centimes → saisie « 100,00 » ; vide pour zéro. */
export const centsInput = (value: number) =>
  value > 0
    ? `${Math.floor(value / 100)},${String(value % 100).padStart(2, "0")}`
    : "";

export const draftFromDecision = (
  decision: MonthEndDecision,
): DecisionDraft => ({
  mode: decisionMode(decision),
  // Si une correction a inversé le signe, l'ancien sens n'est pas repris.
  amounts: Object.fromEntries(
    (decision.resultBeforeDecisionMinorUnits < 0
      ? decision.coverage
      : decision.savings
    ).map((row) => [row.accountId, centsInput(row.amountMinorUnits)]),
  ),
  exceptional: centsInput(decision.exceptionalIncomeMinorUnits),
});

/**
 * Comptes proposés : actifs dans la devise du budget, plus les archivés qui
 * portent déjà une allocation (conservable ou réductible).
 */
export const decisionAccounts = (
  accounts: readonly SavingsAccount[],
  decision: MonthEndDecision,
) => {
  const allocated = new Set(
    [...decision.savings, ...decision.coverage].map((row) => row.accountId),
  );
  return accounts.filter(
    (account) =>
      account.currency === decision.currency &&
      (!account.archived || allocated.has(account.id)),
  );
};

/** « Mettre le reste sur ce compte » : solde moins les autres comptes. */
export const fillRest = (
  result: number,
  savings: readonly Allocation[],
  accountId: number,
) =>
  centsInput(
    Math.max(
      0,
      result - total(savings.filter((row) => row.accountId !== accountId)),
    ),
  ) || "0,00";

const INVALID_AMOUNT = "Saisissez un montant positif, par exemple 50,00.";
const readAmount = (raw: string | undefined): number | null =>
  raw === undefined || raw.trim() === "" ? 0 : parseAmountInput(raw);

export type FieldKey = number | "exceptional";

export interface BuiltDecision {
  plan: DecisionPlan;
  errors: string[];
  fieldErrors: Partial<Record<FieldKey, string>>;
}

/**
 * Saisie → corps de requête. En révision (`editing`), un compte peut
 * conserver un prélèvement déjà effectué même si son solde a baissé.
 */
export const buildDecisionPlan = ({
  decision,
  editing,
  draft,
  accounts,
}: {
  decision: MonthEndDecision;
  editing: boolean;
  draft: DecisionDraft;
  accounts: readonly SavingsAccount[];
}): BuiltDecision => {
  const plan: DecisionPlan = {
    savings: [],
    coverage: [],
    exceptionalIncomeMinorUnits: 0,
  };
  const errors: string[] = [];
  const fieldErrors: BuiltDecision["fieldErrors"] = {};
  if (draft.mode === "carry") return { plan, errors, fieldErrors };
  const result = decision.resultBeforeDecisionMinorUnits;
  const deficit = result < 0;
  const money = (value: number) => formatVaultMoney(value, decision.currency);
  const target = deficit ? plan.coverage : plan.savings;
  for (const account of accounts) {
    const amount = readAmount(draft.amounts[account.id]);
    if (amount === null) {
      fieldErrors[account.id] = INVALID_AMOUNT;
      continue;
    }
    if (amount === 0) continue;
    if (deficit) {
      const previous = editing
        ? (decision.coverage.find((row) => row.accountId === account.id)
            ?.amountMinorUnits ?? 0)
        : 0;
      const available = account.balanceMinorUnits + previous;
      if (amount > available) {
        fieldErrors[account.id] =
          `Fonds insuffisants : ${account.name} contient ${money(available)}.`;
        continue;
      }
    }
    target.push({ accountId: account.id, amountMinorUnits: amount });
  }
  if (deficit) {
    const exceptional = readAmount(draft.exceptional);
    if (exceptional === null) fieldErrors.exceptional = INVALID_AMOUNT;
    else plan.exceptionalIncomeMinorUnits = exceptional;
  }
  for (const account of accounts) {
    const message = fieldErrors[account.id];
    if (message) errors.push(`${account.name} : ${message}`);
  }
  if (fieldErrors.exceptional) {
    errors.push(`Entrée exceptionnelle : ${fieldErrors.exceptional}`);
  }
  if (errors.length > 0) return { plan, errors, fieldErrors };
  if (deficit) {
    const covered = total(plan.coverage) + plan.exceptionalIncomeMinorUnits;
    if (covered > -result) {
      errors.push(
        `La couverture (${money(covered)}) dépasse le déficit (${money(-result)}). Réduisez un montant.`,
      );
    } else if (covered === 0) {
      errors.push(
        "Indiquez au moins un prélèvement ou une entrée exceptionnelle, ou choisissez « Tout reporter ».",
      );
    }
  } else {
    const saved = total(plan.savings);
    if (saved > result) {
      errors.push(
        `L’épargne (${money(saved)}) dépasse le disponible (${money(result)}). Réduisez un montant.`,
      );
    } else if (draft.mode === "all" && saved < result) {
      errors.push(
        `Pour tout épargner, répartissez encore ${money(result - saved)}, ou choisissez « Répartir ».`,
      );
    } else if (saved === 0) {
      errors.push(
        "Indiquez un montant à épargner, ou choisissez « Tout reporter ».",
      );
    }
  }
  return { plan, errors, fieldErrors };
};

/* ---------- Report et textes ---------- */

export interface CarryDetail {
  key: "available" | "savings" | "coverage" | "exceptional";
  label: string;
  amountMinorUnits: number;
}

/**
 * Lignes « dont » du report entrant : elles expliquent le report sans
 * s'ajouter une seconde fois au calcul.
 */
export const carryDecisionDetails = (
  decision: MonthEndDecision | null,
): CarryDetail[] => {
  if (decision === null || decision.status !== "DECIDED") return [];
  const result = decision.resultBeforeDecisionMinorUnits;
  const rows: CarryDetail[] = [
    {
      key: "available",
      label:
        result < 0
          ? "dont déficit avant décision"
          : "dont disponible avant décision",
      amountMinorUnits: result,
    },
  ];
  if (decision.savingsMinorUnits > 0) {
    rows.push({
      key: "savings",
      label: "dont épargné en fin de mois",
      amountMinorUnits: -decision.savingsMinorUnits,
    });
  }
  if (decision.coverageMinorUnits > 0) {
    rows.push({
      key: "coverage",
      label: "dont prélèvements d’épargne",
      amountMinorUnits: decision.coverageMinorUnits,
    });
  }
  if (decision.exceptionalIncomeMinorUnits > 0) {
    rows.push({
      key: "exceptional",
      label: "dont entrée exceptionnelle",
      amountMinorUnits: decision.exceptionalIncomeMinorUnits,
    });
  }
  return rows;
};

export type HomeMonthEnd =
  | { kind: "none" }
  | {
      kind: "prompt" | "reminder" | "review" | "decided";
      decision: MonthEndDecision;
    };

/**
 * Ce que l'Accueil montre : bandeau, rappel après « Plus tard »,
 * avertissement « À revoir » ou décision à jour. Rien sans lecture réussie.
 */
export const homeMonthEnd = (
  decision: MonthEndDecision | null,
  postponed: boolean,
): HomeMonthEnd => {
  if (decision === null) return { kind: "none" };
  if (decision.requiresReview) return { kind: "review", decision };
  if (needsDecision(decision)) {
    return { kind: postponed ? "reminder" : "prompt", decision };
  }
  return decision.status === "DECIDED"
    ? { kind: "decided", decision }
    : { kind: "none" };
};

const ERROR_MESSAGES: Record<string, string> = {
  PERIOD_NOT_CLOSED:
    "Ce mois n’est pas encore terminé. La décision sera proposée le premier jour du mois suivant.",
  REVISION_CONFLICT:
    "La décision a changé sur un autre appareil. La version la plus récente est affichée : vérifiez-la avant de valider à nouveau.",
  IDEMPOTENCY_CONFLICT:
    "Cette tentative correspond à une autre décision. Actualisez la page avant de valider à nouveau.",
  INSUFFICIENT_SAVINGS:
    "Un compte d’épargne ne contient pas assez d’argent pour ce prélèvement ou cette correction.",
  ACCOUNT_ARCHIVED:
    "Un compte archivé ne peut plus recevoir de nouvelle épargne. Vous pouvez conserver ou réduire son montant.",
  CURRENCY_MISMATCH: "Un compte choisi n’utilise pas la devise de ce budget.",
  BALANCE_LIMIT: "Le solde maximal autorisé d’un compte serait dépassé.",
  ALLOCATION_EXCEEDS_RESULT:
    "La répartition dépasse le solde du mois. Réduisez un montant.",
  INVALID_ALLOCATION:
    "Un excédent ne peut être qu’épargné et un déficit ne peut être que couvert. Actualisez la page.",
  NOT_FOUND: "Un compte choisi n’est plus disponible. Actualisez la page.",
};

/** Codes `error.details.code` du contrat, avec les textes du Web. */
export const monthEndErrorMessage = (
  code: string | null,
  fallback = "La décision de fin de mois n’a pas pu être chargée. Vérifiez votre connexion puis réessayez.",
) => (code !== null && ERROR_MESSAGES[code]) || fallback;
