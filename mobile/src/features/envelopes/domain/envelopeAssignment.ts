import { EnvelopeOccurrence } from "@/src/features/envelopes/domain/budgetEnvelope";
import { OperationType } from "@/src/features/operations/domain/oneOffOperation";

/**
 * Rattachement explicite d'une dépense à une enveloppe (#389), mêmes règles
 * que le Web (`useEnvelopeAssignment.js`). Le serveur reste autoritaire.
 */
export type LoadState = "idle" | "loading" | "success" | "error";

export interface CurrentLink {
  status: LoadState;
  occurrenceId: number | null;
  occurrence: EnvelopeOccurrence | null;
}

export interface AssignmentContext {
  month: string;
  currency: string;
  kind: OperationType;
}

export interface AssignmentState {
  link: CurrentLink;
  optionsStatus: LoadState;
  options: readonly EnvelopeOccurrence[];
  /** Le choix a été modifié par l'utilisateur dans ce formulaire. */
  touched: boolean;
  selectedId: number | null;
  /** Mois, devise ou type différent de l'opération enregistrée. */
  contextChanged: boolean;
  context: AssignmentContext;
}

export const selectedOccurrence = ({
  options,
  selectedId,
  link,
}: Pick<AssignmentState, "options" | "selectedId" | "link">) =>
  options.find((item) => item.id === selectedId) ??
  (link.occurrence?.id === selectedId ? link.occurrence : null);

export const isIncompatible = (state: AssignmentState): boolean => {
  if (state.selectedId === null) return false;
  const selected = selectedOccurrence(state);
  return (
    selected === null ||
    selected.month !== state.context.month ||
    selected.currency !== state.context.currency ||
    state.context.kind !== "DEPENSE"
  );
};

/** Raison qui empêche l'enregistrement, ou `null`, textes du Web. */
export const assignmentProblem = (state: AssignmentState): string | null => {
  if (state.link.occurrence?.closed) {
    return "Ce mois est clôturé : cette opération liée ne peut plus être modifiée.";
  }
  if (
    (state.touched || state.contextChanged) &&
    state.link.status !== "success"
  ) {
    return "Vérifiez le rattachement actuel avant de modifier sa période, sa devise ou son type.";
  }
  if (isIncompatible(state)) {
    return "Le rattachement est incompatible. Choisissez une enveloppe de cette période et de cette devise, ou Aucun rattachement.";
  }
  if (state.selectedId !== null && state.optionsStatus !== "success") {
    return "Les enveloppes doivent être chargées avant de confirmer ce rattachement.";
  }
  if (selectedOccurrence(state)?.closed) {
    return "Ce mois est clôturé : aucun rattachement possible.";
  }
  return null;
};

export interface ReconciliationBody {
  occurrenceId: number | null;
  expectedOccurrenceId: number | null;
}

/**
 * Bloc `reconciliation` envoyé seulement après un choix explicite :
 * l'omettre conserve le lien ; `expectedOccurrenceId` protège d'un
 * rattachement concurrent.
 */
export const reconciliationBody = (
  state: Pick<AssignmentState, "touched" | "selectedId" | "link">,
): ReconciliationBody | undefined =>
  state.touched
    ? {
        occurrenceId: state.selectedId,
        expectedOccurrenceId: state.link.occurrenceId,
      }
    : undefined;

/** Enveloppes suggérées d'après la catégorie, jamais choisies d'office. */
export const suggestedOccurrences = (
  options: readonly EnvelopeOccurrence[],
  categoryId: number | null,
) =>
  options.filter(
    (item) =>
      !item.closed && categoryId !== null && item.categoryId === categoryId,
  );
