import { isCalendarDate } from "@/src/features/operations/domain/oneOffOperation";

export type EventKind = "DEPENSE" | "ENTREE";

export const EVENT_RECURRENCES = [
  "AUCUNE",
  "HEBDOMADAIRE",
  "MENSUELLE",
  "TRIMESTRIELLE",
  "ANNUELLE",
] as const;
export type EventRecurrence = (typeof EVENT_RECURRENCES)[number];

const RECURRENCE_LABELS: Record<EventRecurrence, string> = {
  AUCUNE: "Une seule fois",
  HEBDOMADAIRE: "Chaque semaine",
  MENSUELLE: "Chaque mois",
  TRIMESTRIELLE: "Chaque trimestre",
  ANNUELLE: "Chaque année",
};

/** Confirmé : prévu ; potentiel : hypothèse de la Simulation (#241). */
export type EventStatus = "CONFIRME" | "POTENTIEL";

/** Événement mensuel, contrat `GET /v1/events` partagé avec le Web. */
export interface MonthlyEvent {
  id: number;
  title: string;
  amount: string;
  currency: string;
  kind: EventKind;
  startDate: string;
  recurrence: EventRecurrence;
  endDate: string | null;
  /** Absent des réponses antérieures au backend #112. */
  status?: EventStatus;
}

export interface EventDraft {
  title: string;
  amount: string;
  kind: EventKind;
  startDate: string;
  recurrence: EventRecurrence;
  /** Date de fin incluse, prise en compte seulement pour une répétition. */
  endDate: string | null;
}

export type EventDraftErrors = Partial<Record<keyof EventDraft, string>>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRecurrence = (value: unknown): value is EventRecurrence =>
  EVENT_RECURRENCES.includes(value as EventRecurrence);

const isRepeating = (recurrence: EventRecurrence) => recurrence !== "AUCUNE";

export const recurrenceLabel = (recurrence: EventRecurrence): string =>
  RECURRENCE_LABELS[recurrence];

/** Choix du formulaire mobile : les cinq répétitions du Web (#216). */
export const FORM_RECURRENCES: EventRecurrence[] = [
  "AUCUNE",
  "HEBDOMADAIRE",
  "MENSUELLE",
  "TRIMESTRIELLE",
  "ANNUELLE",
];

export const parseMonthlyEvent = (value: unknown): MonthlyEvent => {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.id) ||
    Number(value.id) <= 0 ||
    typeof value.title !== "string" ||
    value.title.length < 2 ||
    value.title.length > 50 ||
    typeof value.amount !== "string" ||
    !/^(0|[1-9]\d{0,7})\.\d{2}$/.test(value.amount) ||
    typeof value.currency !== "string" ||
    !/^[A-Z]{3}$/.test(value.currency) ||
    (value.kind !== "DEPENSE" && value.kind !== "ENTREE") ||
    typeof value.startDate !== "string" ||
    !isCalendarDate(value.startDate) ||
    !isRecurrence(value.recurrence) ||
    (value.endDate !== null &&
      (typeof value.endDate !== "string" || !isCalendarDate(value.endDate))) ||
    (value.status !== undefined &&
      value.status !== "CONFIRME" &&
      value.status !== "POTENTIEL")
  ) {
    throw new Error("Invalid monthly event response");
  }
  return {
    id: Number(value.id),
    title: value.title,
    amount: value.amount,
    currency: value.currency,
    kind: value.kind,
    startDate: value.startDate,
    recurrence: value.recurrence,
    endDate: value.endDate,
    ...(value.status !== undefined
      ? { status: value.status as EventStatus }
      : {}),
  };
};

const normalizeAmount = (amount: string) => amount.trim().replace(",", ".");

/**
 * Mêmes règles et messages que le formulaire Web des événements ;
 * `minStartDate` borne le début d'un élément potentiel (#241).
 */
export const validateEventDraft = (
  draft: EventDraft,
  minStartDate: string | null = null,
): EventDraftErrors => {
  const errors: EventDraftErrors = {};
  const title = draft.title.trim();
  if (title.length < 2 || title.length > 50) {
    errors.title = "Le titre doit contenir entre 2 et 50 caractères.";
  }
  const amount = normalizeAmount(draft.amount);
  if (!/^(0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    errors.amount = "Saisissez un montant positif avec deux décimales maximum.";
  }
  if (!isCalendarDate(draft.startDate)) {
    errors.startDate = "Choisissez une date valide.";
  } else if (minStartDate != null && draft.startDate < minStartDate) {
    errors.startDate =
      "Un élément potentiel doit commencer dans le mois courant ou un mois futur.";
  }
  if (!isRecurrence(draft.recurrence)) {
    errors.recurrence = "Choisissez une répétition valide.";
  }
  if (
    isRepeating(draft.recurrence) &&
    draft.endDate != null &&
    (!isCalendarDate(draft.endDate) || draft.endDate < draft.startDate)
  ) {
    errors.endDate =
      "Choisissez une date de fin valide, au plus tôt à la date de début.";
  }
  return errors;
};

export const toEventPayload = (draft: EventDraft) => ({
  title: draft.title.trim(),
  amount: Number(normalizeAmount(draft.amount)).toFixed(2),
  currency: "EUR",
  kind: draft.kind,
  startDate: draft.startDate,
  recurrence: draft.recurrence,
  endDate: isRepeating(draft.recurrence) ? draft.endDate : null,
});
