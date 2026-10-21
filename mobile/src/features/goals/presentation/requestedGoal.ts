import { FinancialGoal } from "@/src/features/goals/domain/financialGoal";

/**
 * Objectif à ouvrir pour `ajuster=<id>` (#217) : seulement s'il est chargé,
 * si aucun formulaire n'est ouvert et si cette demande n'a pas déjà été
 * traitée (ouverture manuelle ou fermeture).
 */
export const requestedGoal = (
  goals: FinancialGoal[],
  initialGoalId: number | null,
  handledGoalId: number | null,
  isFormOpen: boolean,
): FinancialGoal | null =>
  !isFormOpen && initialGoalId != null && handledGoalId !== initialGoalId
    ? (goals.find(({ id }) => id === initialGoalId) ?? null)
    : null;
