import { longDate } from "@/src/features/budget/domain/budgetCalendar";
import { isCalendarDate } from "@/src/features/operations/domain/oneOffOperation";
import {
  MAX_MINOR_UNITS,
  formatVaultMoney,
} from "@/src/features/vault/domain/vault";

/**
 * Versement mensuel prévu d'un objectif rattaché (#425) :
 * `GET /savings-occurrences/pending` du contrat `savings-accounts.md`
 * (backend #183). La confirmation crée un seul virement ; le refus libère
 * la réserve et reste définitif pour le mois.
 */
export interface SavingsOccurrence {
  accountId: number;
  goalId: number;
  month: string;
  operationDate: string;
  title: string;
  amountMinorUnits: number;
  currency: string;
}

export type OccurrenceStatus = "CONFIRMED" | "CANCELED";

type Fields = Record<string, unknown>;
const isRecord = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null;
const isId = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) > 0;

export const parseSavingsOccurrence = (value: unknown): SavingsOccurrence => {
  if (
    !isRecord(value) ||
    !isId(value.accountId) ||
    !isId(value.goalId) ||
    typeof value.month !== "string" ||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month) ||
    typeof value.operationDate !== "string" ||
    !isCalendarDate(value.operationDate) ||
    typeof value.title !== "string" ||
    !Number.isSafeInteger(value.amountMinorUnits) ||
    Number(value.amountMinorUnits) <= 0 ||
    Number(value.amountMinorUnits) > MAX_MINOR_UNITS ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency)
  ) {
    throw new Error("Invalid savings occurrence");
  }
  return {
    accountId: value.accountId,
    goalId: value.goalId,
    month: value.month,
    operationDate: value.operationDate,
    title: value.title,
    amountMinorUnits: Number(value.amountMinorUnits),
    currency: value.currency,
  };
};

/** Une occurrence par compte et par mois. */
export const occurrenceKey = (occurrence: SavingsOccurrence) =>
  `${occurrence.accountId}:${occurrence.month}`;

/** Textes du Web (#396) pour la liste, ses actions et la cloche. */
export const occurrenceTexts = (occurrence: SavingsOccurrence) => {
  const amount = formatVaultMoney(
    occurrence.amountMinorUnits,
    occurrence.currency,
  );
  const date = longDate(occurrence.operationDate);
  return {
    title: `Versement mensuel · ${occurrence.title}`,
    detail: `Prévu le ${date} · ${amount} du compte courant vers l’épargne`,
    confirm: `Confirmer le virement de ${amount} vers ${occurrence.title}, prévu le ${date}`,
    skip: `Ne pas verser les ${amount} prévus le ${date} pour ${occurrence.title}`,
    bell: `${occurrence.title} · ${amount} prévus le ${date}.`,
  };
};

export const resolutionMessage = (
  occurrence: SavingsOccurrence,
  status: OccurrenceStatus,
) =>
  status === "CONFIRMED"
    ? `Virement de ${formatVaultMoney(
        occurrence.amountMinorUnits,
        occurrence.currency,
      )} confirmé vers ${occurrence.title}.`
    : `Versement de ${occurrence.title} non effectué ce mois-ci.`;
