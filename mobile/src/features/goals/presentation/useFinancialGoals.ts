import { useCallback, useEffect, useState } from "react";

import {
  FinancialGoal,
  GoalDraft,
} from "@/src/features/goals/domain/financialGoal";
import {
  FinancialGoalsGateway,
  GoalRequestError,
} from "@/src/features/goals/infrastructure/HttpFinancialGoalsGateway";

type LoadStatus = "loading" | "success" | "error";
type MutationStatus = "idle" | "loading" | "error";

/** Objectifs financiers et leurs commandes d'écriture (#226). */
export const useFinancialGoals = (gateway: FinancialGoalsGateway) => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [mutationStatus, setMutationStatus] = useState<MutationStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // `quiet` : relecture après une écriture, sans repasser par l'état de
  // chargement (la liste et le formulaire restent affichés).
  const load = useCallback(
    async ({ quiet = false } = {}): Promise<boolean> => {
      if (!quiet) setStatus("loading");
      try {
        setGoals(await gateway.listAllGoals());
        setStatus("success");
        return true;
      } catch {
        if (!quiet) setStatus("error");
        return false;
      }
    },
    [gateway],
  );

  useEffect(() => {
    let isActive = true;
    gateway
      .listAllGoals()
      .then((next) => {
        if (!isActive) return;
        setGoals(next);
        setStatus("success");
      })
      .catch(() => {
        if (isActive) setStatus("error");
      });
    return () => {
      isActive = false;
    };
  }, [gateway]);

  const mutate = useCallback(
    async (
      action: () => Promise<unknown>,
      successMessage: string,
      failureMessage = "L’objectif n’a pas pu être enregistré. Réessayez.",
    ) => {
      setMutationStatus("loading");
      setMessage(null);
      try {
        await action();
        const reloaded = await load({ quiet: true });
        setMutationStatus("idle");
        setMessage(
          reloaded
            ? successMessage
            : "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé.",
        );
        return true;
      } catch (error) {
        setMutationStatus("error");
        // Refus du backend expliqué comme sur le Web.
        setMessage(
          error instanceof GoalRequestError && error.status === 422
            ? "Certaines valeurs sont refusées : vérifiez les montants et la date."
            : failureMessage,
        );
        return false;
      }
    },
    [load],
  );

  return {
    goals,
    status,
    mutationStatus,
    message,
    retry: () => load(),
    clearMessage: () => setMessage(null),
    createGoal: (draft: GoalDraft) =>
      mutate(() => gateway.createGoal(draft), "Objectif ajouté."),
    updateGoal: (id: number, draft: GoalDraft) =>
      mutate(() => gateway.updateGoal(id, draft), "Objectif modifié."),
    deleteGoal: (id: number) =>
      mutate(
        () => gateway.deleteGoal(id),
        "Objectif supprimé.",
        "L’objectif n’a pas pu être supprimé. Réessayez.",
      ),
  };
};
