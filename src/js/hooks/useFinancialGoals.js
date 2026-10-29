import { useRefreshViews } from "./useRefreshViews";
import {
  mutationErrorMessage,
  acknowledgeMutation,
  useMutationFeedback,
} from "./useMutationFeedback";
import { useCallback, useEffect, useRef, useState } from "react";
import { goalsService } from "../services/goalsService";

const loadError =
  "Impossible de charger vos objectifs. Vérifiez votre connexion puis réessayez.";

/** Liste et commandes des objectifs financiers de la personne connectée. */
export const useFinancialGoals = () => {
  const [goals, setGoals] = useState([]);
  const [status, setStatus] = useState("loading");
  const [mutationStatus, setMutationStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      setGoals(await goalsService.listAllGoals());
      setStatus("success");
      return true;
    } catch {
      setStatus("error");
      setMessage(loadError);
      return false;
    }
  }, []);

  const refreshViews = useRefreshViews(load);
  const feedback = useMutationFeedback(refreshViews);
  const writing = useRef(false);
  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (action, successMessage, failureMessage) => {
    if (writing.current) return false;
    writing.current = true;
    setMutationStatus("loading");
    setMessage("");
    try {
      const acknowledged = await acknowledgeMutation(action);
      const reloaded = await refreshViews();
      feedback.confirm(successMessage, {
        refreshed: reloaded,
        ...acknowledged,
      });
      setMutationStatus("success");
      setMessage(
        reloaded
          ? successMessage
          : "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé."
      );
      return true;
    } catch (error) {
      setMutationStatus("error");
      setMessage(
        mutationErrorMessage(
          error,
          error?.response?.status === 422
            ? "Certaines valeurs sont refusées : vérifiez les montants et la date."
            : failureMessage ??
                "L’objectif n’a pas pu être enregistré. Réessayez."
        )
      );
      return false;
    } finally {
      writing.current = false;
    }
  };

  return {
    goals,
    status,
    mutationStatus,
    message,
    retry: load,
    createGoal: (goal) =>
      mutate(() => goalsService.createGoal(goal), "Objectif ajouté."),
    updateGoal: (id, goal) =>
      mutate(() => goalsService.updateGoal(id, goal), "Objectif modifié."),
    deleteGoal: (id) =>
      mutate(
        () => goalsService.deleteGoal(id),
        "Objectif supprimé.",
        "L’objectif n’a pas pu être supprimé. Réessayez."
      ),
  };
};
