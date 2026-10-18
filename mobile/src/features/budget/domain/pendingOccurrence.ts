/**
 * Événements prévus sans décision (`GET /v1/event-occurrences/pending`) et
 * commandes `realize` / `cancel` (contrat backend
 * `docs/budget-projection-api.md`).
 */
import { longDate } from "@/src/features/budget/domain/budgetCalendar";
import { money, toCents } from "@/src/features/budget/domain/budgetSummary";
import {
  OperationDraft,
  OperationType,
} from "@/src/features/operations/domain/oneOffOperation";

export interface PendingOccurrence {
  eventId: number;
  occurrenceDate: string;
  title: string;
  amount: string;
  currency: string;
  kind: OperationType;
  overdue: boolean;
}

export interface RealizeBody {
  categoryId: number;
  title: string;
  amount: string;
  operationDate: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parsePendingOccurrence = (value: unknown): PendingOccurrence => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.eventId) ||
    Number(value.eventId) <= 0 ||
    typeof value.occurrenceDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.occurrenceDate) ||
    typeof value.title !== "string" ||
    typeof value.amount !== "string" ||
    !/^(0|[1-9]\d{0,9})\.\d{2}$/.test(value.amount) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    (value.kind !== "DEPENSE" && value.kind !== "ENTREE") ||
    typeof value.overdue !== "boolean"
  ) {
    throw new Error("Invalid pending occurrence");
  }
  return {
    eventId: Number(value.eventId),
    occurrenceDate: value.occurrenceDate,
    title: value.title,
    amount: value.amount,
    currency: value.currency,
    kind: value.kind,
    overdue: value.overdue,
  };
};

/** En retard d'abord, puis à venir; limité au jour sélectionné s'il existe. */
export const splitPending = (
  items: PendingOccurrence[],
  selectedDate: string | null,
) => {
  const visible = items.filter(
    (item) => selectedDate === null || item.occurrenceDate === selectedDate,
  );
  return {
    overdue: visible.filter((item) => item.overdue),
    upcoming: visible.filter((item) => !item.overdue),
  };
};

/** Montant prévu signé selon le sens de l'événement. */
export const plannedAmount = (occurrence: PendingOccurrence): string => {
  const cents = toCents(occurrence.amount);
  return money(
    occurrence.kind === "ENTREE" ? cents : -cents,
    occurrence.currency,
    true,
  );
};

export const occurrenceLabel = (occurrence: PendingOccurrence): string =>
  `${occurrence.title}, ${longDate(occurrence.occurrenceDate)}${
    occurrence.overdue ? ", en retard" : ""
  }. ${occurrence.kind === "ENTREE" ? "Entrée prévue" : "Dépense prévue"} ${plannedAmount(occurrence)}.`;

/**
 * Formulaire prérempli. Une occurrence d'un mois antérieur est datée du jour :
 * le backend refuse d'écrire dans un mois clôturé (`PERIOD_CLOSED`).
 */
export const realizeDraft = (
  occurrence: PendingOccurrence,
  today: string,
): OperationDraft => ({
  title: occurrence.title,
  amount: occurrence.amount.replace(".", ","),
  operationDate:
    occurrence.occurrenceDate.slice(0, 7) < today.slice(0, 7)
      ? today
      : occurrence.occurrenceDate,
  categoryId: null,
  kind: occurrence.kind,
});

export const toRealizeBody = (draft: OperationDraft): RealizeBody => ({
  categoryId: draft.categoryId as number,
  title: draft.title.trim(),
  amount: Number(draft.amount.replace(",", ".")).toFixed(2),
  operationDate: draft.operationDate,
});

const DECISION_ERRORS: Record<string, string> = {
  PERIOD_CLOSED:
    "Ce mois est clôturé : choisissez une date du mois en cours pour enregistrer l’opération.",
  OCCURRENCE_ALREADY_RESOLVED:
    "Cet événement a déjà été traité. L’affichage a été actualisé.",
};

export const decisionErrorMessage = (code: string | null): string =>
  (code !== null ? DECISION_ERRORS[code] : undefined) ??
  "L’enregistrement a échoué. Vérifiez votre connexion puis réessayez.";

/** Issue d'une décision : succès ou code métier stable renvoyé par l'API. */
export interface DecisionResult {
  ok: boolean;
  code: string | null;
}

/**
 * Après une conversion, la modale se ferme en cas de succès ou si l'événement
 * a déjà été traité ailleurs (la file rechargée l'a retiré). Sinon elle reste
 * ouverte pour que l'utilisateur corrige, par exemple la date (`PERIOD_CLOSED`).
 */
export const closesRealizeForm = (result: DecisionResult): boolean =>
  result.ok || result.code === "OCCURRENCE_ALREADY_RESOLVED";
