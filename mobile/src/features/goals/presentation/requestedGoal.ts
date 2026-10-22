import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";

/**
 * Demande d'ouverture d'un objectif (`ajuster=<id>&demande=<jeton>`). Le
 * jeton rend chaque demande unique : les onglets restent montés, et ajuster
 * deux fois le même objectif ne changerait sinon pas l'URL (#217).
 */
export interface GoalRequest {
  goalId: number;
  key: string;
}

export const goalRequest = (
  ajuster: string | undefined,
  demande: string | undefined,
): GoalRequest | null => {
  const goalId = Number(ajuster);
  return Number.isInteger(goalId) && goalId > 0
    ? { goalId, key: `${goalId}:${demande ?? ""}` }
    : null;
};

/**
 * Objectif à ouvrir pour une demande : seulement s'il est chargé, si aucun
 * formulaire n'est ouvert et si cette demande n'a pas déjà été traitée
 * (ouverture manuelle ou fermeture).
 */
export const requestedGoal = (
  goals: FinancialGoal[],
  request: GoalRequest | null,
  handledKey: string | null,
  isFormOpen: boolean,
): FinancialGoal | null =>
  !isFormOpen && request != null && handledKey !== request.key
    ? (goals.find(({ id }) => id === request.goalId) ?? null)
    : null;
