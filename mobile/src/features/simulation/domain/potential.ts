import { shiftMonth } from "@/src/features/forecast/domain/budgetForecast";

/**
 * Premier jour où un potentiel non confirmé n'existe plus : le mois suivant
 * celui de `startDate` (mois civil Europe/Paris du backend). Une série
 * récurrente expire entièrement selon son premier mois.
 */
export const potentialExpiration = (startDate: string): string =>
  `${shiftMonth(startDate.slice(0, 7), 1)}-01`;

/** Premier jour autorisé pour un potentiel : le mois courant. */
export const potentialMinStartDate = (currentMonth: string): string =>
  `${currentMonth}-01`;

/** Refus métier expliqués avec les phrases du Web. */
const REFUSALS: Record<string, string> = {
  EXPIRED_POTENTIAL:
    "Le mois de cet élément potentiel est passé. Choisissez une date du mois courant ou d’un mois futur.",
  INVALID_STATUS_TRANSITION:
    "La confirmation doit passer par l’action Confirmer de la Simulation.",
};

export const SIMULATION_FAILURE =
  "La modification de la Simulation n’a pas pu être enregistrée. Réessayez.";

/** `code` : refus métier stable de l'API (`error.details.code`), s'il existe. */
export const simulationErrorMessage = (code: string | null): string =>
  (code != null ? REFUSALS[code] : undefined) ?? SIMULATION_FAILURE;
