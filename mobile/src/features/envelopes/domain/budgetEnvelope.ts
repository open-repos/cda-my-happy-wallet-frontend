import { money, toCents } from "@/src/features/budget/domain/budgetSummary";
import {
  OneOffOperation,
  OperationCategory,
  parseCategory,
  parseOperation,
} from "@/src/features/operations/domain/oneOffOperation";

/**
 * Enveloppes budgétaires en lecture (#384), contrat du Web #314
 * (`src/js/services/envelopesService.js`). Le serveur fournit toutes les
 * métriques : rien n'est recalculé ici.
 */
export type EnvelopeStatus = "AVAILABLE" | "REACHED" | "EXCEEDED";

export interface EnvelopeMetrics {
  planned: string;
  actual: string;
  remaining: string;
  overrun: string;
  projected: string;
  /** Pourcentage non plafonné ; `null` quand le prévu est nul. */
  progress: number | null;
  status: EnvelopeStatus;
}

export interface EnvelopeStatistics {
  sampleMonths: number;
  completedMonthsObserved: number;
  unreconciledMonthsExcluded: number;
  incompleteMonthsExcluded: number;
  meanActual: string | null;
  meanPlanned: string | null;
  meanVariance: string | null;
  meanOverrun: string | null;
  exceededMonths: number;
  overrunRate: number | null;
}

export interface EnvelopePaymentPreview {
  id: number;
  title: string;
  amount: string;
  operationDate: string;
}

export interface EnvelopeMonth extends EnvelopeMetrics {
  occurrenceId: number;
  month: string;
  operationCount: number;
  paymentsPreview: EnvelopePaymentPreview[];
}

export interface EnvelopeOverview {
  id: number;
  title: string;
  currency: string;
  category: OperationCategory | null;
  totals: EnvelopeMetrics & {
    observedMonths: number;
    operationCount: number;
    sumMonthlyOverrun: string;
  };
  statistics: EnvelopeStatistics;
  months: EnvelopeMonth[];
}

export interface EnvelopeOccurrence {
  id: number;
  title: string;
  month: string;
  currency: string;
  categoryId: number | null;
  closed: boolean;
  operationCount: number;
  metrics: EnvelopeMetrics;
}

export type EnvelopePayment = OneOffOperation & { occurrenceId: number | null };

type Fields = Record<string, unknown>;

const invalid = (): never => {
  throw new Error("Invalid envelope response");
};
const record = (value: unknown): Fields =>
  typeof value === "object" && value !== null ? (value as Fields) : invalid();
const id = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const count = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const amount = (v: unknown): v is string =>
  typeof v === "string" && /^-?(0|[1-9]\d{0,11})\.\d{2}$/.test(v);
const optionalAmount = (v: unknown): v is string | null =>
  v === null || amount(v);
const month = (v: unknown): v is string =>
  typeof v === "string" && /^(19[7-9]\d|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(v);
const currency = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Z]{3}$/.test(v);
const STATUSES: readonly unknown[] = ["AVAILABLE", "REACHED", "EXCEEDED"];

export const parseEnvelopeMetrics = (value: unknown): EnvelopeMetrics => {
  const v = record(value);
  if (
    ![v.planned, v.actual, v.remaining, v.overrun, v.projected].every(amount) ||
    !STATUSES.includes(v.status) ||
    !(
      v.progress === null ||
      (typeof v.progress === "number" &&
        Number.isFinite(v.progress) &&
        v.progress >= 0)
    )
  ) {
    invalid();
  }
  return {
    planned: v.planned as string,
    actual: v.actual as string,
    remaining: v.remaining as string,
    overrun: v.overrun as string,
    projected: v.projected as string,
    progress: v.progress as number | null,
    status: v.status as EnvelopeStatus,
  };
};

export const parseEnvelopeStatistics = (value: unknown): EnvelopeStatistics => {
  const v = record(value);
  if (
    ![
      v.sampleMonths,
      v.completedMonthsObserved,
      v.unreconciledMonthsExcluded,
      v.incompleteMonthsExcluded,
      v.exceededMonths,
    ].every(count) ||
    ![v.meanActual, v.meanPlanned, v.meanVariance, v.meanOverrun].every(
      optionalAmount,
    ) ||
    !(
      v.overrunRate === null ||
      (typeof v.overrunRate === "number" &&
        Number.isFinite(v.overrunRate) &&
        v.overrunRate >= 0 &&
        v.overrunRate <= 100)
    ) ||
    v.samplePolicy !== "COMPLETED_MONTHS_WITH_LINKED_OPERATIONS"
  ) {
    invalid();
  }
  return {
    sampleMonths: v.sampleMonths as number,
    completedMonthsObserved: v.completedMonthsObserved as number,
    unreconciledMonthsExcluded: v.unreconciledMonthsExcluded as number,
    incompleteMonthsExcluded: v.incompleteMonthsExcluded as number,
    meanActual: v.meanActual as string | null,
    meanPlanned: v.meanPlanned as string | null,
    meanVariance: v.meanVariance as string | null,
    meanOverrun: v.meanOverrun as string | null,
    exceededMonths: v.exceededMonths as number,
    overrunRate: v.overrunRate as number | null,
  };
};

const parsePreview = (value: unknown): EnvelopePaymentPreview => {
  const p = record(value);
  if (
    !id(p.id) ||
    typeof p.title !== "string" ||
    !amount(p.amount) ||
    typeof p.operationDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(p.operationDate)
  ) {
    invalid();
  }
  return {
    id: p.id as number,
    title: p.title as string,
    amount: p.amount as string,
    operationDate: p.operationDate as string,
  };
};

const parseMonth = (value: unknown): EnvelopeMonth => {
  const m = record(value);
  if (
    !id(m.occurrenceId) ||
    !month(m.month) ||
    !count(m.operationCount) ||
    !Array.isArray(m.paymentsPreview) ||
    m.paymentsPreview.length > 3
  ) {
    invalid();
  }
  return {
    ...parseEnvelopeMetrics(m),
    occurrenceId: m.occurrenceId as number,
    month: m.month as string,
    operationCount: m.operationCount as number,
    paymentsPreview: (m.paymentsPreview as unknown[]).map(parsePreview),
  };
};

export const parseEnvelopeOverview = (value: unknown): EnvelopeOverview => {
  const v = record(value);
  const totals = record(v.totals);
  if (
    !id(v.id) ||
    typeof v.title !== "string" ||
    !currency(v.currency) ||
    !Array.isArray(v.months) ||
    v.months.length > 12 ||
    !count(totals.observedMonths) ||
    !count(totals.operationCount) ||
    !amount(totals.sumMonthlyOverrun)
  ) {
    invalid();
  }
  return {
    id: v.id as number,
    title: v.title as string,
    currency: v.currency as string,
    category: v.category === null ? null : parseCategory(v.category),
    totals: {
      ...parseEnvelopeMetrics(totals),
      observedMonths: totals.observedMonths as number,
      operationCount: totals.operationCount as number,
      sumMonthlyOverrun: totals.sumMonthlyOverrun as string,
    },
    statistics: parseEnvelopeStatistics(v.statistics),
    months: (v.months as unknown[]).map(parseMonth),
  };
};

export const parseEnvelopeOccurrence = (value: unknown): EnvelopeOccurrence => {
  const v = record(value);
  if (
    !id(v.id) ||
    !id(v.sourceId) ||
    !month(v.month) ||
    !currency(v.currency) ||
    v.sourceType !== "ENVELOPE" ||
    v.kind !== "DEPENSE" ||
    typeof v.title !== "string" ||
    typeof v.closed !== "boolean" ||
    !count(v.operationCount) ||
    !(v.categoryId === null || id(v.categoryId))
  ) {
    invalid();
  }
  return {
    id: v.id as number,
    title: v.title as string,
    month: v.month as string,
    currency: v.currency as string,
    categoryId: v.categoryId as number | null,
    closed: v.closed as boolean,
    operationCount: v.operationCount as number,
    metrics: parseEnvelopeMetrics(v.metrics),
  };
};

export const parseEnvelopePayment = (value: unknown): EnvelopePayment => {
  const v = record(value);
  if (!(v.occurrenceId === null || id(v.occurrenceId))) invalid();
  return {
    ...parseOperation(v),
    occurrenceId: v.occurrenceId as number | null,
  };
};

/** Montant API formaté comme le Web ; `signed` affiche toujours le signe. */
export const formatEnvelopeMoney = (
  value: string,
  currencyCode: string,
  signed = false,
) => money(toCents(value), currencyCode, signed);

const percent = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export const percentLabel = (value: number | null) =>
  value === null
    ? "Sans pourcentage (prévu nul)"
    : `${percent.format(value)} %`;

/** Jauge plafonnée visuellement à 100 % ; le texte garde la valeur réelle. */
export const meterValue = (progress: number | null) =>
  Math.min(100, progress ?? 0);

/** État lu en texte, avec symbole, jamais par la seule couleur. */
export const envelopeStatusLabel = (
  metrics: EnvelopeMetrics,
  currencyCode: string,
) =>
  metrics.status === "EXCEEDED"
    ? `⚠ Dépassement de ${formatEnvelopeMoney(metrics.overrun, currencyCode)}`
    : metrics.status === "REACHED"
      ? "✓ Budget atteint"
      : `✓ ${formatEnvelopeMoney(metrics.remaining, currencyCode)} disponibles`;

export const statisticsSampleLabel = (s: EnvelopeStatistics) =>
  `${s.sampleMonths} mois analysé${s.sampleMonths > 1 ? "s" : ""} ; ` +
  `${s.unreconciledMonthsExcluded} mois sans suivi complet et ` +
  `${s.incompleteMonthsExcluded} mois courant ou futurs exclus. ` +
  "Les mois historiques absents ne sont pas assimilés à zéro.";
