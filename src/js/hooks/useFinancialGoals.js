import { useCallback, useEffect, useState } from "react";
import { goalsService } from "../services/goalsService";
import { useSimulation } from "../components/Simulation/SimulationContext";

const loadError =
  "Impossible de charger vos objectifs. Vérifiez votre connexion puis réessayez.";

/** Liste et commandes des objectifs financiers de la personne connectée. */
export const useFinancialGoals = () => {
  const { invalidate } = useSimulation();
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

  useEffect(() => {
    load();
  }, [load]);

  const mutate = async (action, successMessage, failureMessage) => {
    setMutationStatus("loading");
    setMessage("");
    try {
      await action();
      const reloaded = await load();
      setMutationStatus("success");
      setMessage(
        reloaded
          ? successMessage
          : "La modification est enregistrée, mais l’affichage n’a pas pu être actualisé."
      );
      invalidate();
      return true;
    } catch (error) {
      setMutationStatus("error");
      setMessage(
        error?.response?.status === 422
          ? "Certaines valeurs sont refusées : vérifiez les montants et la date."
          : failureMessage ??
              "L’objectif n’a pas pu être enregistré. Réessayez."
      );
      return false;
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
